from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
import requests as http_requests
import json
from .models import NewsArticle, NewsComment, UserNewsInterest, NewsCommentVote
from .serializers import NewsCommentSerializer
from ai_service.utils import analyze_sentiment_logic

class TrackNewsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        topic = request.data.get('topic')
        time_spent_str = request.data.get('time_spent', 0) # seconds
        
        try:
            time_spent = int(float(time_spent_str))
        except:
            time_spent = 0
            
        if not topic:
            return Response({"error": "Topic is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        interest, created = UserNewsInterest.objects.get_or_create(user=request.user, topic=topic)
        interest.view_count += 1
        interest.time_spent_seconds += time_spent
        interest.save()
        
        return Response({"status": "tracked"}, status=status.HTTP_200_OK)

from django.conf import settings

def classify_comment_with_ai(content):
    # Quick implementation of Gemini call for classification
    import os
    API_KEY = getattr(settings, 'GEMINI_API_KEY', None) or os.environ.get('GEMINI_API_KEY', '')
    URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
    
    prompt = f"""
    Classify this comment:
    "{content}"
    
    Categories: informative, opinion, question, low_value
    
    Return strict JSON: {{"category": "category_name", "confidence": 0.9}}
    """
    
    try:
        response = http_requests.post(URL, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=5)
        if response.status_code == 200:
            res = response.json()
            if 'candidates' in res and res['candidates']:
                text = res['candidates'][0]['content']['parts'][0]['text']
                 # Extract JSON
                if '```json' in text:
                    text = text.split('```json')[1].split('```')[0]
                elif '```' in text:
                    text = text.split('```')[1].split('```')[0]
                data = json.loads(text.strip())
                return data.get('category', 'opinion'), data.get('confidence', 0.5)
        elif response.status_code == 429:
             print("AI Classify Rate Limited")
    except Exception as e:
        print(f"AI Classify Error: {e}")
    return 'opinion', 0.0

class FetchContentView(APIView):
    permission_classes = [permissions.AllowAny]  # Allow public access to fetch article content

    def get(self, request):
        url = request.query_params.get('url')
        if not url:
            return Response({"error": "URL required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Try to import BS4
            from bs4 import BeautifulSoup
            
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ConnectifyAI/1.0'}
            response = http_requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove scripts, styles
            for script in soup(["script", "style", "nav", "footer", "header", "iframe"]):
                script.decompose()
                
            # Get text from paragraphs
            text_blocks = [p.get_text().strip() for p in soup.find_all('p')]
            # Filter short/empty blocks
            content = '\n\n'.join([t for t in text_blocks if len(t) > 60])
            
            return Response({"content": content})
            
        except ImportError:
            return Response({
                "error": "BeautifulSoup not installed. Run: pip install beautifulsoup4"
            }, status=status.HTTP_501_NOT_IMPLEMENTED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Existing Views...
class NewsCommentView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, article_id=None):
        # Support both URL parameter and query parameter
        url = request.query_params.get('url')
        sort_by = request.query_params.get('sort', 'new') # new, top, insightful, hot
        
        # If article_id is provided in URL, use it as the identifier
        if article_id:
            # Try to find article by ID or URL
            try:
                # First try to get by ID (if it's a number)
                article = NewsArticle.objects.get(id=article_id)
            except (NewsArticle.DoesNotExist, ValueError):
                # If not found or not a number, try by URL (article_id might be URL-encoded)
                try:
                    article = NewsArticle.objects.get(url__icontains=article_id)
                except NewsArticle.DoesNotExist:
                    # Article doesn't exist yet, return empty list
                    return Response([], status=status.HTTP_200_OK)
        elif url:
            try:
                article = NewsArticle.objects.get(url=url)
            except NewsArticle.DoesNotExist:
                return Response([], status=status.HTTP_200_OK)
        else:
            return Response([], status=status.HTTP_200_OK)
            
        # Only fetch top-level comments (parent=None)
        comments = article.comments.filter(parent=None)
        
        if sort_by == 'top':
            comments = comments.order_by('-score', '-created_at')
        elif sort_by == 'hot':
            # Hot algorithm: score / (age_in_hours + 2)^1.5
            comments = comments.order_by('-score', '-created_at')
        elif sort_by == 'insightful':
            # Prioritize 'informative' and high score
            comments = comments.order_by('-classification', '-score') 
        else: # new
            comments = comments.order_by('-created_at')
        
        serializer = NewsCommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        url = request.data.get('url')
        content = request.data.get('content')
        parent_id = request.data.get('parent_id')
        
        if not url or not content:
            return Response({"error": "Data missing"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get or create article
        article, created = NewsArticle.objects.get_or_create(url=url, defaults={
            'title': request.data.get('title', 'Unknown'),
            'image_url': request.data.get('image_url', ''),
            'source_name': request.data.get('source_name', ''),
            'topic': request.data.get('topic', 'general')
        })
        
        # Analyze sentiment (Local)
        try:
            sentiment_res = analyze_sentiment_logic(content)
            label = sentiment_res.get('sentiment', 'Neutral').lower()
            if label not in ['positive', 'negative', 'neutral']:
                label = 'neutral'
        except Exception as e:
            print(f"Sentiment Error: {e}")
            label = 'neutral'
            
        # Analyze Classification (AI)
        classification, confidence = classify_comment_with_ai(content)
            
        parent = None
        if parent_id:
            try:
                parent = NewsComment.objects.get(id=parent_id)
            except NewsComment.DoesNotExist:
                pass

        comment = NewsComment.objects.create(
            article=article,
            user=request.user,
            content=content,
            sentiment=label,
            classification=classification,
            confidence_score=confidence,
            parent=parent
        )
        
        serializer = NewsCommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class NewsVoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        comment_id = request.data.get('comment_id')
        try:
            val = int(request.data.get('value'))
        except:
             return Response({"error": "Invalid value"}, status=400)
        
        if val not in [1, -1]:
             return Response({"error": "Invalid vote value"}, status=400)
             
        try:
            comment = NewsComment.objects.get(id=comment_id)
        except NewsComment.DoesNotExist:
            return Response({"error": "Comment not found"}, status=404)
            
        vote, created = NewsCommentVote.objects.update_or_create(
            user=request.user,
            comment=comment,
            defaults={'value': val}
        )
        
        # Update cache counts
        comment.upvotes = NewsCommentVote.objects.filter(comment=comment, value=1).count()
        comment.downvotes = NewsCommentVote.objects.filter(comment=comment, value=-1).count()
        comment.save()
        
        return Response({
            "status": "voted", 
            "upvotes": comment.upvotes, 
            "downvotes": comment.downvotes, 
            "score": comment.score
        })
