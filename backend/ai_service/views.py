from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import TextAnalysisSerializer, CaptionGenerationSerializer, NewsRequestSerializer
from .utils import (
    analyze_toxicity_logic, 
    analyze_sentiment_logic, 
    generate_caption_logic, 
    generate_hashtags_logic,
    fetch_trending_news_logic
)

class ToxicityAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TextAnalysisSerializer(data=request.data)
        if serializer.is_valid():
            text = serializer.validated_data['text']
            result = analyze_toxicity_logic(text)
            return Response(result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SentimentAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TextAnalysisSerializer(data=request.data)
        if serializer.is_valid():
            text = serializer.validated_data['text']
            result = analyze_sentiment_logic(text)
            return Response(result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GenerateCaptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        context = request.data.get('text', '') or request.data.get('context', '')
        image_file = request.FILES.get('image')
        
        image_data = None
        if image_file:
            try:
                image_data = image_file.read()
            except Exception as e:
                print(f"Error reading image file: {e}")
        
        result = {
            "caption": generate_caption_logic(image_file=image_data, context=context)
        }
        return Response(result, status=status.HTTP_200_OK)

class GenerateHashtagsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TextAnalysisSerializer(data=request.data)
        if serializer.is_valid():
            text = serializer.validated_data['text']
            
            # Fetch trending tags inside the view to avoid circular imports at top level if possible
            # But better to import inside this method if analytics depends on something else, 
            # though models are usually safe.
            try:
                from analytics.models import TrendingHashtag
                top_trending = list(TrendingHashtag.objects.filter(time_window='all')
                                    .order_by('-score')[:20]
                                    .values_list('hashtag__name', flat=True))
                # Add # prefix if missing
                top_trending = [f"#{t}" for t in top_trending]
            except ImportError:
                top_trending = []
            except Exception as e:
                print(f"Error fetching trending: {e}")
                top_trending = []

            try:
                user_interests = request.user.profile.interests if hasattr(request.user, 'profile') else ""
            except Exception:
                user_interests = ""

            hashtags = generate_hashtags_logic(text, trending_tags=top_trending, user_interests=user_interests)
            return Response({"hashtags": hashtags}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TrendingNewsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Keyword Search
        query = request.query_params.get('q')
        
        # 2. Topic / Type
        topic = request.query_params.get('topic', 'technology')
        news_type = request.query_params.get('type') # e.g. 'for_you'
        
        interests = []
        
        # Helper to get explicit profile interests
        def get_profile_interests():
            try:
                if hasattr(request.user, 'profile') and request.user.profile.interests:
                    import re
                    raw_interests = request.user.profile.interests
                    return [i.strip() for i in re.split(r'[,\s]+', raw_interests) if len(i) > 2]
            except Exception as e:
                print(f"Error fetching interests: {e}")
            return []

        # Helper to get behavioral interests (Most viewed topics)
        def get_behavioral_interests():
            try:
                # Need to do lazy import to avoid circular dependency if any
                from news.models import UserNewsInterest
                # Get top 5 visited topics
                user_interests = UserNewsInterest.objects.filter(user=request.user).order_by('-view_count')[:5]
                return [ui.topic for ui in user_interests]
            except ImportError:
                return []
            except Exception as e:
                print(f"Error fetching behavioral interests: {e}")
                return []

        if news_type == 'for_you' or topic == 'personalized':
            # 1. User interest (from profile)
            profile_interests = get_profile_interests()
            
            # 2. Most viewed topics by that user
            behavioral_interests = get_behavioral_interests()
            
            # Combine unique interests
            interests = list(dict.fromkeys(profile_interests + behavioral_interests))
            
            if not interests:
                # Fallback to general if no info
                topic = 'general'
        else:
            # If strictly topic based, we might still want to infuse some personalization if 'topic' is generic?
            # For now stick to requested topic.
            pass
                
        # Call Logic
        if query:
            news = fetch_trending_news_logic(search_query=query)
        elif interests:
            # Pass user interests (Behavioral + Explicit)
            news = fetch_trending_news_logic(interests=interests)
        else:
            news = fetch_trending_news_logic(topic=topic)
            
        return Response({"results": news}, status=status.HTTP_200_OK)

class DailyNewsSummaryView(APIView):
    """
    Returns a daily summary/digest. 
    Currently returns top personalized or general news.
    Future: Integrate LLM for text summarization.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Re-use personalization logic
        interests = []
        try:
            if hasattr(request.user, 'profile') and request.user.profile.interests:
                import re
                raw = request.user.profile.interests
                interests = [i.strip() for i in re.split(r'[,\s]+', raw) if len(i) > 2]
        except:
            pass
            
        if interests:
            news = fetch_trending_news_logic(interests=interests)
        else:
            news = fetch_trending_news_logic(topic="general")
            
        return Response({"summary": news}, status=status.HTTP_200_OK)


# ============================================
# AI SUMMARY FEATURES FOR BUSY PROFESSIONALS
# ============================================

import requests as http_requests
from bs4 import BeautifulSoup
from django.conf import settings
import json
import time
from .models import AISummaryCache, AIDiscussionCache

# Gemini API Configuration
GEMINI_API_KEY = getattr(settings, 'GEMINI_API_KEY', "AIzaSyB1Cdp1owBxfOUZWcTXXJZhypFWZQyQmGk")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

import sys
import os

def call_gemini_api(prompt, retries=3):
    """Call Gemini API directly using REST with retry logic"""
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1000
        }
    }
    
    # Check if key is dummy/missing
    if not GEMINI_API_KEY or "your_key" in GEMINI_API_KEY.lower():
        print("Gemini API Key is invalid or missing.")
        return None

    for attempt in range(retries):
        try:
            print(f"Calling Gemini API (Attempt {attempt+1})...")
            # sys.stdout.flush()
            response = http_requests.post(GEMINI_API_URL, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 429:
                # Rate limited
                wait_time = (2 ** attempt) + 1
                print(f"Rate limited (429). Waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
                
            if response.status_code != 200:
                print(f"Gemini Error: {response.status_code} - {response.text}")
                
            response.raise_for_status()
            
            result = response.json()
            
            if 'candidates' in result and len(result['candidates']) > 0:
                text = result['candidates'][0]['content']['parts'][0]['text']
                return text.strip()
            
            return None
            
        except Exception as e:
            print(f"Gemini API Error (Attempt {attempt+1}): {str(e)}")
            if attempt == retries - 1:
                return None
            time.sleep(1)
            
    return None


class ArticleSummaryView(APIView):
    """
    Generate AI summary for a news article
    Designed for busy professionals who need to understand news in 30 seconds
    
    POST /api/ai/summarize-news/
    {
        "article_url": "https://...",
        "article_text": "..." (optional),
        "title": "..." (optional)
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        article_url = request.data.get('article_url')
        article_text = request.data.get('article_text')
        title = request.data.get('title', '')
        
        if not article_url and not article_text:
            return Response(
                {"error": "Either article_url or article_text is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if article_url:
            # Check Cache
            cached_summary = AISummaryCache.objects.filter(article_url=article_url).first()
            if cached_summary:
                return Response(cached_summary.summary_data)
        
        # Scrape article if text not provided
        if not article_text and article_url:
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = http_requests.get(article_url, headers=headers, timeout=10)
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()
                
                # Extract main content
                paragraphs = soup.find_all('p')
                article_text = ' '.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
                
                # Limit to first 2000 words
                words = article_text.split()[:2000]
                article_text = ' '.join(words)
                
                # Add title for context
                if title:
                    article_text = f"Title: {title}\n\n{article_text}"
                
            except Exception as e:
                # Create fallback based on title
                article_text = title if title else "Article content unavailable"
        
        # Generate AI summary using Gemini
        summary = self._generate_summary(article_text, title)
        
        # Save to Cache if successful and we have a URL
        if article_url and summary.get('tldr', '').startswith(title) is False:
             # Basic sanity check to ensure it's not just the title
            AISummaryCache.objects.update_or_create(
                article_url=article_url,
                defaults={'summary_data': summary}
            )
        
        return Response(summary)
    
    def _generate_summary(self, article_text, title=""):
        """Generate summary using Gemini AI"""
        
        prompt = f"""
You are a premium AI news assistant designed for busy professionals.

Your task is to summarize the news article below so that a user can
understand it fully in under 60 seconds.

Follow these rules strictly:
1. Neutral, factual tone. No sensationalism.
2. Structured output.
3. Remove fluff/ads.

Return the response in STRICT JSON with the following structure:

{{
  "tldr": "2–3 clear sentences summarizing the core event (The 'Too Long; Didn't Read')",
  "key_takeaways": [
    "Key Point 1",
    "Key Point 2",
    "Key Point 3"
  ],
  "impact": "Why this matters (Real-world impact in 1-2 sentences)",
  "what_next": "What to watch for next (optional, can be null)",
  "headline": "Clear, neutral headline",
  "reading_time": "e.g. 4 min read"
}}

Article:
{article_text}
"""
        
        try:
            response_text = call_gemini_api(prompt)
            
            if not response_text:
                raise Exception("No response from Gemini API")
            
            # Extract JSON from response
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0]
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0]
            
            result = json.loads(response_text.strip())
            return result
            
        except Exception as e:
            print(f"AI Summary Error: {str(e)}")
            
            # --- HEURISTIC FALLBACK (When AI Fails) ---
            # Try to extract meaningful sentences from the raw text
            
            # Simple sentence splitting (rough approximation)
            import re
            sentences = re.split(r'(?<=[.!?])\s+', article_text.replace('\n', ' '))
            clean_sentences = [s.strip() for s in sentences if len(s.split()) > 5] # Filter short fragments
            
            # Construct Fallback TLDR (First 2 sentences)
            fallback_tldr = " ".join(clean_sentences[:2]) if clean_sentences else (title + " - Details unavailable.")
            
            # Construct Fallback Takeaways (Sentences 3-5)
            fallback_takeaways = clean_sentences[2:5] if len(clean_sentences) > 2 else ["See full article for details."]
            
            if not fallback_tldr or len(fallback_tldr) < 20:
                fallback_tldr = f"{title} - Please read the full source."

            return {
                "tldr": fallback_tldr,
                "key_takeaways": fallback_takeaways,
                "impact": "This topic is currently trending in the news.",
                "what_next": "Check the original source for updates.",
                "headline": title if title else "News Summary",
                "reading_time": "3 min read"
            }


class DiscussionQuestionsView(APIView):
    """
    Generate AI discussion questions for an article
    
    POST /api/ai/discussion-questions/
    {
        "article_url": "https://...",
        "article_text": "..."
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        article_url = request.data.get('article_url')
        article_text = request.data.get('article_text')
        title = request.data.get('title', '')
        
        if not article_url and not article_text:
            return Response(
                {"error": "Either article_url or article_text is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if article_url:
            cached_discussion = AIDiscussionCache.objects.filter(article_url=article_url).first()
            if cached_discussion:
                return Response(cached_discussion.questions_data)
        
        # Scrape if needed
        if not article_text and article_url:
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = http_requests.get(article_url, headers=headers, timeout=10)
                soup = BeautifulSoup(response.content, 'html.parser')
                
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()
                
                paragraphs = soup.find_all('p')
                article_text = ' '.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
                words = article_text.split()[:1500]
                article_text = ' '.join(words)
                
                if title:
                    article_text = f"Title: {title}\n\n{article_text}"
                
            except Exception as e:
                article_text = title if title else "Topic for discussion"
        
        result = self._generate_questions(article_text)
        
        if article_url and result.get('questions'):
            AIDiscussionCache.objects.update_or_create(
                article_url=article_url,
                defaults={'questions_data': result}
            )
        
        return Response(result)
    
    def _generate_questions(self, article_text):
        """Generate discussion questions using Gemini AI"""
        
        prompt = f"""
You are an AI discussion facilitator for a premium news platform.

Generate thoughtful, balanced discussion questions that encourage 
critical thinking without being divisive.

Return STRICT JSON with:
{{
  "questions": [
    "Question 1 - challenges the main claim",
    "Question 2 - explores implications",
    "Question 3 - connects to broader trends"
  ],
  "counterpoint": "One respectful alternative perspective",
  "fact_to_verify": "One specific claim readers might want to verify",
  "related_topic": "A related topic readers might explore next"
}}

Article:
{article_text}
"""
        
        try:
            response_text = call_gemini_api(prompt)
            
            if not response_text:
                raise Exception("No response from Gemini API")
            
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0]
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0]
            
            return json.loads(response_text.strip())
            
        except Exception as e:
            print(f"Discussion Questions Error: {str(e)}")
            return {
                "questions": [
                    "What are the key takeaways from this article?",
                    "How might this affect different stakeholders?",
                    "What questions remain unanswered?"
                ],
                "counterpoint": "Consider alternative perspectives on this topic.",
                "fact_to_verify": "Verify claims with additional sources.",
                "related_topic": "Explore related news topics for more context."
            }


class CommentQualityView(APIView):
    """
    Analyze comment quality and sentiment for self-cleaning discussions
    
    POST /api/ai/analyze-comment/
    {
        "comment_text": "...",
        "context": "..." (optional)
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        comment_text = request.data.get('comment_text')
        context = request.data.get('context', '')
        
        if not comment_text:
            return Response(
                {"error": "comment_text is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = self._analyze_comment(comment_text, context)
        
        return Response(result)
    
    def _analyze_comment(self, comment_text, context=""):
        """Analyze comment quality using Gemini AI"""
        
        prompt = f"""
You are an AI comment quality analyst.
Classify the following comment into ONE category:
- informative (Adds facts, context, or analysis)
- opinion (Personal view, agreement/disagreement)
- question (Seeking info or clarification)
- low_value (Noise, spam, or toxic)

Also assess Toxicity.

Return STRICT JSON:
{{
  "classification": "informative | opinion | question | low_value",
  "is_toxic": true/false,
  "confidence": 0-100,
  "reason": "Short explanation",
  "improvement_suggestion": "Suggestion to improve (optional)"
}}

News context: {context}
Comment:
{comment_text}
"""
        
        try:
            response_text = call_gemini_api(prompt)
            
            if not response_text:
                raise Exception("No response from Gemini API")
            
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0]
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0]
            
            return json.loads(response_text.strip())
            
        except Exception as e:
            print(f"Comment Analysis Error: {str(e)}")
            return {
                "classification": "opinion",
                "is_toxic": False,
                "confidence": 0,
                "reason": "AI unavailable",
                "improvement_suggestion": None
            }

