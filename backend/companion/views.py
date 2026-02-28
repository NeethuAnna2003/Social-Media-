from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from datetime import timedelta
from django.db.models import Count, Q
from django.core.cache import cache
import random

# App Imports
from posts.models import Post, Like, Comment
from notifications.models import Notification
from chat.models import Message
from .services import AvatarGenerationService

class CompanionInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    # Removed cache_page to ensure real-time updates for "2 messages" bug
    def get(self, request):
        user = request.user
        now = timezone.now()
        today = now.date()
        yesterday = today - timedelta(days=1)
        
        # 1. Gather Statistics
        # --------------------
        
        # Unread Messages
        # Ensure we are counting distinct unread messages
        unread_messages = Message.objects.filter(
            thread__participants=user,
            is_read=False
        ).exclude(sender=user).count()
        
        print(f"DEBUG: User {user.username} has {unread_messages} unread messages.")

        # Unread Notifications
        unread_notifications = Notification.objects.filter(
            recipient=user, 
            is_read=False
        ).count()
        
        # Likes Logic
        # Likes on posts created TODAY vs YESTERDAY
        likes_today = Like.objects.filter(
            post__user=user, 
            created_at__date=today
        ).count()
        
        likes_yesterday = Like.objects.filter(
            post__user=user, 
            created_at__date=yesterday
        ).count()
        
        # Engagement Growth %
        if likes_yesterday > 0:
            engagement_growth = ((likes_today - likes_yesterday) / likes_yesterday) * 100
        else:
            engagement_growth = 100 if likes_today > 0 else 0

        # Inactivity
        last_post = Post.objects.filter(user=user, status='published').order_by('-created_at').first()
        days_inactive = 0
        if last_post:
            days_inactive = (now - last_post.created_at).days
        else:
            # If never posted, maybe treat as inactive or new user
            days_inactive = 999 

        stats = {
            "likes_today": likes_today,
            "likes_yesterday": likes_yesterday,
            "notifications": unread_notifications,
            "messages": unread_messages,
            "days_inactive": days_inactive,
            "engagement_growth": round(engagement_growth, 1)
        }

        # 2. Determine Avatar URL
        avatar_url = None
        
        # Always generate avatar URL (instant, no download)
        if hasattr(user, 'profile'):
            try:
                service = AvatarGenerationService()
                result = service.generate_avatar(user.profile)
                if "success" in result:
                    # Use the URL directly (it's an external Pollinations URL)
                    avatar_url = result['url']
                    print(f"Avatar URL for {user.username}: {avatar_url}")
            except Exception as e:
                print(f"Avatar generation failed: {e}")

        # 3. Apply Trigger Rules (Priority Order)
        # ---------------------------------------
        
        print(f"Avatar Stats for {user.username}: {stats}")  # Debug Log

        response_data = {
            "message": "😊 I'm here if you need anything.",
            "mood": "idle",
            "animation": "idle",
            "avatar_url": avatar_url
        }

        # Priority 1: MESSAGE
        if unread_messages > 0:
            print("Trigger: MESSAGE")
            response_data.update({
                "message": f"📞 You have {unread_messages} new messages!",
                "mood": "call",
                "animation": "call",
                "priority": "high"
            })
            return Response(response_data)

        # Priority 2: NOTIFICATION
        if unread_notifications > 0:
            print("Trigger: NOTIFICATION")
            response_data.update({
                "message": f"🔔 {unread_notifications} new notifications waiting!",
                "mood": "notify",
                "animation": "notify",
                "priority": "high"
            })
            return Response(response_data)

        # Priority 3: MILESTONE (Engagement Growth >= 25%)
        # Only relevant if we have significant data (e.g., at least 5 likes yesterday)
        if likes_yesterday >= 5 and engagement_growth >= 25:
             print(f"Trigger: MILESTONE (Growth {engagement_growth}%)")
             response_data.update({
                "message": f"🚀 Massive growth! Engagement up {int(engagement_growth)}% today!",
                "mood": "excited",
                "animation": "celebrate",
                "priority": "high"
            })
             return Response(response_data)

        # Priority 4: LIKES (Any increase)
        if likes_today > likes_yesterday:
             print("Trigger: CELEBRATE (Likes)")
             response_data.update({
                "message": f"🎉 Your post got {likes_today} new likes today!",
                "mood": "happy",
                "animation": "celebrate",
                "priority": "medium"
            })
             return Response(response_data)

        # Priority 5: INACTIVITY
        if days_inactive >= 2 and days_inactive < 900:
            print("Trigger: THINKING (Inactivity)")
            response_data.update({
                "message": f"💭 You haven't posted in {days_inactive} days. Want ideas?",
                "mood": "thinking",
                "animation": "thinking",
                "priority": "medium"
            })
            return Response(response_data)

        # Priority 6: IDLE (Default)
        print("Trigger: IDLE")
        response_data["priority"] = "low"
        return Response(response_data)

class AvatarGenerationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not hasattr(user, 'profile'):
             return Response({"error": "User profile not found"}, status=400)
             
        service = AvatarGenerationService()
        result = service.generate_avatar(user.profile)
        
        if "error" in result:
            status_code = result.get('status_code', 500)
            return Response(result, status=status_code)
            
        return Response(result)
