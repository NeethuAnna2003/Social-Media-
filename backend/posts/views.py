import random
import re
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import Post, Like, Comment
from .serializers import (
    PostSerializer, 
    PostCreateSerializer, 
    LikeSerializer, 
    LikeSerializer, 
    CommentSerializer
)
from ai_service.utils import analyze_sentiment_logic
from accounts.models import CustomUser as User


class StandardResultsSetPagination(PageNumberPagination):
    """Custom pagination for posts."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PostListView(generics.ListCreateAPIView):
    """View for listing and creating posts."""
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PostCreateSerializer
        return PostSerializer
    
    def get_queryset(self):
        username = self.request.query_params.get('username')
        if username:
            # For user profile: show their own scheduled posts, but only public posts for others
            user = get_object_or_404(User, username=username)
            if user == self.request.user:
                # Own profile: show all posts (including scheduled)
                return Post.objects.filter(user=user).select_related('user').prefetch_related('likes', 'comments', 'media').order_by('-created_at')
            else:
                # Other's profile: only show public posts
                return Post.objects.filter(user=user, status='published').select_related('user').prefetch_related('likes', 'comments', 'media').order_by('-created_at')
            
        # Get all posts from users the current user follows and their own posts
        following_ids = self.request.user.following_set.values_list('following', flat=True)
        return Post.objects.filter(
            Q(user__id__in=following_ids) | Q(user=self.request.user),
            status='published'  # Only show public posts in feed
        ).filter(is_archived=False).select_related('user').prefetch_related('likes', 'comments', 'media').order_by('-created_at')
    
    def perform_create(self, serializer):
        # Set the current user as the post author
        text = serializer.validated_data.get('text', '').lower()
        
        # Simple/Mock AI Moderation Logic
        ai_status = 'safe'
        sentiment = 'neutral'
        
        # Check for flagged keywords
        flagged_keywords = ['spam', 'offensive', 'badword']
        if any(word in text for word in flagged_keywords):
            ai_status = 'flagged'
        
        # Simple sentiment analysis
        positive_words = ['good', 'great', 'awesome', 'amazing', 'happy', 'love']
        negative_words = ['bad', 'sad', 'hate', 'terrible', 'awful', 'angry']
        
        if any(word in text for word in positive_words):
            sentiment = 'positive'
        elif any(word in text for word in negative_words):
            sentiment = 'negative'
        else:
            if text:
                 sentiment = random.choice(['neutral', 'positive'])

        # Save the post instance first
        post = serializer.save(
            user=self.request.user,
            ai_status=ai_status,
            sentiment=sentiment
        )
        
        # --- HASHTAG ANALYTICS LOGIC ---
        try:
            from analytics.models import Hashtag, HashtagUsage, TrendingHashtag
            
            # Extract hashtags (words starting with #)
            tags = re.findall(r"#(\w+)", text)
            for tag_name in set(tags): # set to avoid double counting in same post
                tag_name = tag_name.lower()
                
                # 1. Update/Create Hashtag
                hashtag, created = Hashtag.objects.get_or_create(name=tag_name)
                hashtag.usage_count += 1
                hashtag.save()
                
                # 2. Record Usage
                HashtagUsage.objects.create(
                    hashtag=hashtag,
                    content_type='post',
                    content_id=post.id,
                    user=self.request.user
                )

                # 3. Update Trending Hashatg (Simplified: Just update score based on new usage)
                # For 'all' time window
                trending, _ = TrendingHashtag.objects.get_or_create(
                     hashtag=hashtag,
                     time_window='all',
                     defaults={'score': 0, 'rank': 999}
                )
                trending.score += 10 # Arbitrary score increment per usage
                # Recalculate rank (in a real app, this would be a background job)
                # We won't re-rank everything here to avoid performance hit
                trending.save()
                
        except Exception as e:
            print(f"Error updating analytics: {e}")

        
        # Handle multiple media files
        uploaded_files = serializer.validated_data.get('uploaded_media', [])
        
        if not uploaded_files and 'uploaded_media' in self.request.FILES:
             uploaded_files = self.request.FILES.getlist('uploaded_media')
             
        from .models import PostMedia

        for file in uploaded_files:
            content_type = file.content_type
            media_type = 'image'
            if 'video' in content_type:
                media_type = 'video'
            
            PostMedia.objects.create(
                post=post,
                file=file,
                media_type=media_type
            )
        
        # --- IMAGE LOCATION DETECTION (Async) ---
        # Detect location from first image (if any)
        try:
            from .location_service import ImageLocationService
            from .location_models import PostLocation
            import threading
            
            def detect_location_async(post_id):
                """Background task to detect location from image."""
                try:
                    post_obj = Post.objects.get(id=post_id)
                    image_file = None
                    
                    # Get first image
                    if post_obj.image:
                        image_file = post_obj.image
                    else:
                        first_image = post_obj.media.filter(media_type='image').first()
                        if first_image:
                            image_file = first_image.file
                    
                    if image_file:
                        service = ImageLocationService()
                        location_data = service.get_or_detect_location(image_file)
                        
                        # Create or update PostLocation
                        post_location, created = PostLocation.objects.get_or_create(post=post_obj)
                        
                        if location_data.get('detected_location'):
                            # detected_location already has the pin emoji
                            post_location.display_location = location_data['detected_location']
                            post_location.is_detected = True
                            post_location.detection_status = 'completed'
                        else:
                            post_location.display_location = None
                            post_location.is_detected = False
                            post_location.detection_status = 'no_location'
                        
                        post_location.save()
                        print(f"Location detected for post {post_id}: {post_location.display_location}")
                except Exception as e:
                    print(f"Location detection error for post {post_id}: {e}")
            
            # Check if post has images
            has_images = bool(post.image) or uploaded_files
            if has_images:
                # Create pending location entry
                PostLocation.objects.get_or_create(
                    post=post,
                    defaults={'detection_status': 'processing'}
                )
                
                # Start background detection
                thread = threading.Thread(target=detect_location_async, args=(post.id,))
                thread.daemon = True
                thread.start()
        except Exception as e:
            print(f"Error starting location detection: {e}")
            
        # --- Notification & Feed Broadcast ---
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            
            # Serialize for broadcast
            read_serializer = PostSerializer(post, context={'request': self.request})
            post_data = read_serializer.data

            # Broadcast to followers (Feed Updates)
            # Find all users following this user
            # accounts.UserFollowing: user follows following_user
            # So followers are where following_user == self.request.user
            followers = self.request.user.followers_set.values_list('follower_id', flat=True)
            
            for follower_id in followers:
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{follower_id}', # Reusing notification channel for feed updates?
                    # Or should we create a separate feed channel? The prompt says "notifications_{user_id}"... 
                    # Actually prompt says "Followers receive the post instantly in their feed".
                    # Let's send a type='new_post' event to the notification channel, frontend can handle it.
                    {
                        'type': 'send_notification', # Consumer expects this method
                        'notification': {
                            'type': 'new_post',
                            'post': post_data
                        }
                    }
                )
        except Exception as e:
            print(f"Broadcast Error: {e}")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        # Refresh the post instance to ensure media is loaded
        post_instance = Post.objects.prefetch_related('media').get(pk=serializer.instance.pk)
        
        # Return the full post data using the read serializer
        read_serializer = PostSerializer(post_instance, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting a specific post."""
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return PostCreateSerializer
        return PostSerializer
    
    def get_queryset(self):
        return Post.objects.select_related('user').prefetch_related('likes', 'comments', 'media')
    
    def perform_update(self, serializer):
        # Only the post owner can update the post
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to edit this post.")
        
        post = serializer.save()

        # Handle multiple media files (add new ones)
        uploaded_files = serializer.validated_data.get('uploaded_media', [])
        
        if not uploaded_files and 'uploaded_media' in self.request.FILES:
             uploaded_files = self.request.FILES.getlist('uploaded_media')
             
        if uploaded_files:
            from .models import PostMedia
            for file in uploaded_files:
                content_type = file.content_type
                media_type = 'image'
                if 'video' in content_type:
                    media_type = 'video'
                
                PostMedia.objects.create(
                    post=post,
                    file=file,
                    media_type=media_type
                )
    
    def perform_destroy(self, instance):
        # Only the post owner can delete the post
        if instance.user != self.request.user:
            raise PermissionDenied("You do not have permission to delete this post.")
        instance.delete()


class ArchivePostView(APIView):
    """View to hide/archive posts."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        if post.user != request.user:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
        post.is_archived = True
        post.save()
        return Response({"status": "archived"}, status=status.HTTP_200_OK)


class LikePostView(APIView):
    """View for liking and unliking posts."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        like, created = Like.objects.get_or_create(user=request.user, post=post)
        
        if not created:
            like.delete()
            return Response(
                {"detail": "Post unliked successfully."},
                status=status.HTTP_200_OK
            )
            
        return Response(
            {"detail": "Post liked successfully."},
            status=status.HTTP_201_CREATED
        )


class CommentCreateView(generics.CreateAPIView):
    """View for creating comments on posts."""
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        post = get_object_or_404(Post, pk=self.kwargs['pk'])
        serializer.save(user=self.request.user, post=post)


class CommentListCreateView(generics.ListCreateAPIView):
    """View for listing and creating comments on a post."""
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    
    def get_queryset(self):
        post_id = self.kwargs['pk']
        post = get_object_or_404(Post, pk=post_id)
        
        # Get all top-level comments
        all_comments = Comment.objects.filter(
            post_id=post_id, 
            parent__isnull=True
        ).select_related('user').prefetch_related('replies', 'filter_data')
        
        # Filter based on visibility for current user
        if self.request.user.is_authenticated:
            from .filter_models import FilteredComment
            
            # Get filtered comment IDs where the current user is the post owner
            # These are the ONLY comments that should be hidden
            filtered_comment_ids = FilteredComment.objects.filter(
                comment__post_id=post_id,
                post_owner=self.request.user  # Only hide if current user is the post owner
            ).values_list('comment_id', flat=True)
            
            # Exclude only those filtered comments where current user is the post owner
            visible_comments = all_comments.exclude(id__in=filtered_comment_ids)
            
            return visible_comments.order_by('-created_at')
        
        # For anonymous users, show all comments (filtering only applies to authenticated post owners)
        return all_comments.order_by('-created_at')

    def perform_create(self, serializer):
        post = get_object_or_404(Post, pk=self.kwargs['pk'])
        text = serializer.validated_data.get('text', '')
        parent = serializer.validated_data.get('parent')

        # Permission Check: Nested Replies
        if parent:
            # "Only the user who created the post can reply to comments"
            if self.request.user != post.user:
                 from rest_framework.exceptions import PermissionDenied
                 raise PermissionDenied("Only the post owner can reply to comments.")

        # --- NEW AI MODERATION ENGINE & KEYWORD FILTER ---
        keyword_flagged = False
        matched_words = []
        is_filtered = False
        
        # 1. Keyword Filter System
        if self.request.user.id != post.user.id:
            try:
                from .filter_service import CommentFilterService
                service = CommentFilterService()
                is_filtered, matched_words = service.check_comment(text, post.user.id)
                keyword_flagged = is_filtered
            except Exception as e:
                print(f"Comment keyword filtering error: {e}")
                
        # 2. Semantic Analysis & Contextual Understanding
        sentiment = 'neutral'
        toxicity = 'none'
        confidence = 0.0
        reason = ''
        is_flagged = False
        
        recommended_action = 'VISIBLE'
        semantic_score = 0.0
        
        try:
            from ai_service.utils import analyze_comment_semantic_logic
            
            analysis = analyze_comment_semantic_logic(text, keyword_flagged=keyword_flagged)
            
            semantic_score = analysis.get('semantic_toxicity_score', 0.0)
            intent = analysis.get('intent', 'neutral')
            severity = analysis.get('severity_level', 'low')
            recommended_action = analysis.get('recommended_action', 'VISIBLE')
            confidence = analysis.get('confidence', 0.0)
            reason = analysis.get('explanation', '')
            
            if recommended_action in ['HIDDEN', 'REVIEW']:
                is_flagged = True
                toxicity = severity
            else:
                toxicity = 'none'

            if intent in ['insult', 'hate', 'harassment', 'threat']:
                sentiment = 'negative'
            elif intent == 'spam':
                sentiment = 'neutral'
            else:
                sentiment = 'neutral'
                
        except Exception as e:
            print(f"AI Semantic Analysis Failed: {e}")
        
        # Save the comment
        comment = serializer.save(
            user=self.request.user, 
            post=post, 
            sentiment=sentiment,
            toxicity=toxicity,
            ai_confidence=confidence,
            ai_reason=reason,
            is_flagged=is_flagged
        )
        
        # Apply final action mappings
        if recommended_action in ['HIDDEN', 'REVIEW'] or keyword_flagged:
            try:
                from .filter_models import FilteredComment
                if self.request.user.id != post.user.id:
                    matched_info = matched_words if keyword_flagged else [f"AI flag: {intent}"]
                    FilteredComment.objects.create(
                        comment=comment,
                        post_owner=post.user,
                        commenter=self.request.user,
                        matched_words=matched_info,
                        is_visible_to_owner=(recommended_action != 'HIDDEN'),
                        is_visible_to_public=(recommended_action == 'VISIBLE'),
                        is_visible_to_commenter=True
                    )
            except Exception as e:
                print(f"Final Action filtering error: {e}")
        
        # Real-time Comment Update
        if not is_flagged:
            try:
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer
                channel_layer = get_channel_layer()
                
                comment_data = CommentSerializer(serializer.instance, context={'request': self.request}).data
                
                async_to_sync(channel_layer.group_send)(
                    f'post_{post.id}',
                    {
                        'type': 'post_update',
                        'event_type': 'new_comment',
                        'data': comment_data
                    }
                )
            except Exception as e:
                print(f"Comment Broadcast Error: {e}")


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View for retrieving, updating, and deleting a specific comment."""
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        return Comment.objects.filter(post_id=self.kwargs['post_pk'])
    
    def perform_update(self, serializer):
        # Only the comment owner can update the comment
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You do not have permission to edit this comment.")
        serializer.save()
    
    def perform_destroy(self, instance):
        # Only the comment owner or post owner can delete the comment
        if instance.user != self.request.user and instance.post.user != self.request.user:
            raise permissions.PermissionDenied("You do not have permission to delete this comment.")
        instance.delete()

class HashtagPostListView(generics.ListAPIView):
    """View for listing posts by hashtag."""
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        tag = self.kwargs['tag']
        # Filter by text containing #tag. 
        # Note: This is a simple implementation. For production, a ManyToManyField is better.
        return Post.objects.filter(
            text__icontains=f"#{tag}"
        ).select_related('user').prefetch_related('likes', 'comments', 'media').order_by('-created_at')
