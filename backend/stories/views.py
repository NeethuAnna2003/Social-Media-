from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Prefetch, Q

from .models import Story, StoryView, StoryLike
from .serializers import StorySerializer, StoryCreateSerializer
from accounts.models import CustomUser
from social.models import Follow

class StoryFeedView(APIView):
    """
    Returns list of users (followed + self) who have active stories,
    grouped by user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        user = request.user
        
        # 1. Get IDs (Self + Following) using social.Follow model
        following_ids = list(Follow.objects.filter(follower=user).values_list('following__id', flat=True))
        target_user_ids = [user.id] + following_ids
        # print(f"DEBUG_STORIES: User {user.username} ({user.id}) follows {following_ids}")
        
        # 2. Fetch active stories
        stories = Story.objects.filter(
            user__id__in=target_user_ids,
            expires_at__gt=now
        ).order_by('created_at')
        # print(f"DEBUG_STORIES: Found {stories.count()} active stories (Now: {now})")
        
        if not stories.exists():
            return Response([], status=status.HTTP_200_OK)

        # 3. Group by User & Optimizations
        # Prefetch logic could be complex for manual grouping, so simplified loop:
        
        # Batch Check Views & Likes
        story_ids = [s.id for s in stories]
        viewed_story_ids = set(StoryView.objects.filter(user=user, story__id__in=story_ids).values_list('story__id', flat=True))
        liked_story_ids = set(StoryLike.objects.filter(user=user, story__id__in=story_ids).values_list('story__id', flat=True))
        
        grouped_stories = {}
        
        # Helper for avatar
        def get_avatar_url(u):
            try:
                if hasattr(u, 'profile') and u.profile.profile_pic:
                    return request.build_absolute_uri(u.profile.profile_pic.url)
            except Exception as e:
                # User might not have profile or other error
                pass
            return None

        # Determine has_unseen first pass? No, just loop stories.
        for story in stories:
            u_id = story.user.id
            if u_id not in grouped_stories:
                grouped_stories[u_id] = {
                    'user_id': u_id,
                    'username': story.user.username,
                    'avatar': get_avatar_url(story.user),
                    'is_own': (u_id == user.id),
                    'stories': [],
                    'has_unseen': False
                }
            
            is_viewed = (story.id in viewed_story_ids) or (story.user.id == user.id)
            is_liked = (story.id in liked_story_ids)
            
            # Use serializer but override expensive fields
            # Getting basic data manually or via serializer instance is fine for ~50 stories.
            s_data = StorySerializer(story, context={'request': request}).data
            
            # Override to be sure (serializer might re-query if not careful)
            # Actually serializer does queries in `get_is_viewed` if we don't pass them.
            # To optimize, efficient use would be caching on object, but our serializer calls db.
            # We can monkey-patch or just rely on serializer for now (MVP).
            
            grouped_stories[u_id]['stories'].append(s_data)
            if not is_viewed:
                grouped_stories[u_id]['has_unseen'] = True

        results = list(grouped_stories.values())
        # Sort keys: 
        # 1. Own user first (False < True)
        # 2. Has unseen stories (True < False -> want True first. Python sort is ascending. False=0, True=1. So 'not has_unseen': False (unseen) < True (seen))
        # 3. Latest story timestamp (Reverse) -> We can use negative timestamp or reverse=True
        
        # To make it clean:
        def sort_key(group):
            is_own = group['is_own'] # True/False
            has_unseen = group['has_unseen'] # True/False
            # Get latest story time
            latest_ts = 0
            if group['stories']:
                # Stories are sorted by created_at asc, so last is latest
                latest_story = group['stories'][-1]
                # parsed datetime or just comparison? Serializer returns string. 
                # We can access original object if we kept it, or parse string.
                # Easiest: use logic from loop.
                pass 
            return (
                0 if is_own else 1,
                0 if has_unseen else 1
            )
        
        # Check latest timestamp for sorting
        for group in results:
            if group['stories']:
                group['latest_ts'] = group['stories'][-1]['created_at']
            else:
                group['latest_ts'] = ''
                
        results.sort(key=lambda x: (
            0 if x['is_own'] else 1,
            0 if x['has_unseen'] else 1,
            x['latest_ts'] # String comparison of ISO dates works for descent? No, we want Newest First. 
                           # Descending order.
        ))
        
        # Actually easier to use reverse=True and handle "is_own" logic carefully or multiple sorts.
        # Let's simple sort:
        # Own -> Top
        # Unseen -> Top
        # Newest -> Top
        
        # We can implement a composite key for reverse sort:
        # (IsOwn (1), HasUnseen (1), Timestamp)
        # Sort reverse=True
        
        results.sort(key=lambda x: (
            1 if x['is_own'] else 0,
            1 if x['has_unseen'] else 0,
            x['latest_ts']
        ), reverse=True)
        
        return Response(results, status=status.HTTP_200_OK)

class CreateStoryView(generics.CreateAPIView):
    queryset = Story.objects.all()
    serializer_class = StoryCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Debug logging
        print("=" * 60)
        print("STORY CREATE REQUEST")
        print("=" * 60)
        print(f"User: {request.user.username}")
        print(f"Data received: {request.data}")
        print(f"Files: {request.FILES}")
        print("=" * 60)
        
        # Call parent create method
        try:
            response = super().create(request, *args, **kwargs)
            print(f"✓ Story created successfully: {response.data.get('id')}")
            return response
        except Exception as e:
            print(f"✗ Story creation failed: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            raise

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TrackStoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        story = get_object_or_404(Story, pk=pk)
            
        # Permission Check: Must follow user or be user
        if story.user != request.user:
            # FIX: Use social.Follow
            is_following = Follow.objects.filter(follower=request.user, following=story.user).exists()
            if not is_following:
                return Response({"error": "You must follow the user to view their story"}, status=status.HTTP_403_FORBIDDEN)
        
        # Track View
        if story.user != request.user:
            obj, created = StoryView.objects.get_or_create(story=story, user=request.user)
            if created:
                story.views_count += 1
                story.save()
                
        return Response({"status": "viewed"}, status=status.HTTP_200_OK)

class LikeStoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        story = get_object_or_404(Story, pk=pk)
        
        # Permission Check
        if story.user != request.user:
            # FIX: Use social.Follow
            is_following = Follow.objects.filter(follower=request.user, following=story.user).exists()
            if not is_following:
                return Response({"error": "You must follow the user to like their story"}, status=status.HTTP_403_FORBIDDEN)
        
        like, created = StoryLike.objects.get_or_create(user=request.user, story=story)
        if not created:
            like.delete()
            return Response({"status": "unliked", "likes_count": story.likes.count()}, status=status.HTTP_200_OK)
            
        return Response({"status": "liked", "likes_count": story.likes.count()}, status=status.HTTP_200_OK)

class DeleteStoryView(generics.DestroyAPIView):
    queryset = Story.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Story.objects.filter(user=self.request.user)

class UserStoriesView(APIView):
    """
    Returns active stories for a specific user.
    Also includes highlighted stories even if expired.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        now = timezone.now()
        target_user = get_object_or_404(CustomUser, id=user_id)
        
        # Fetch active OR highlighted stories
        stories = Story.objects.filter(
            user=target_user
        ).filter(
            Q(expires_at__gt=now) | Q(is_highlighted=True)
        ).order_by('created_at')
        
        if not stories.exists():
            return Response([], status=status.HTTP_200_OK)
            
        # Serialize
        serialized_stories = StorySerializer(stories, many=True, context={'request': request}).data
        
        return Response(serialized_stories, status=status.HTTP_200_OK)

class ToggleStoryHighlightView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        story = get_object_or_404(Story, pk=pk)
        
        if story.user != request.user:
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
            
        story.is_highlighted = not story.is_highlighted
        story.save()
        
        status_text = "highlighted" if story.is_highlighted else "unhighlighted"
        return Response({"status": status_text, "is_highlighted": story.is_highlighted}, status=status.HTTP_200_OK)
