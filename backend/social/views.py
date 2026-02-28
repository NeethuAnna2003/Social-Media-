from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Follow
from .serializers import FriendRecommendationSerializer, TrendingHashtagSerializer

# Safely import models from other apps if needed, though mostly self-contained or standard imports here
try:
    from analytics.models import UserRecommendation, HashtagTrend
except ImportError:
    UserRecommendation = None
    HashtagTrend = None

User = get_user_model()

from accounts.models import FollowRequest
from notifications.models import Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class FollowUserView(APIView):
    """endpoint: POST /api/social/follow/ { "username": "target_user" }"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        username = request.data.get('username')
        if not username:
            return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        target_user = get_object_or_404(User, username=username)
        
        if target_user == request.user:
            return Response({"error": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already following (Using social.Follow)
        if Follow.objects.filter(follower=request.user, following=target_user).exists():
             return Response({"status": "already following"}, status=status.HTTP_200_OK)

        # Check for pending request
        if FollowRequest.objects.filter(from_user=request.user, to_user=target_user).exists():
             return Response({"status": "requested", "message": "Follow request already sent"}, status=status.HTTP_200_OK)

        # Check Privacy
        is_private = False
        if hasattr(target_user, 'profile') and target_user.profile.is_private:
            is_private = True
            
        if is_private:
            # Create Request
            follow_req = FollowRequest.objects.create(from_user=request.user, to_user=target_user)
            
            # Notify Target
            notif = Notification.objects.create(
                recipient=target_user,
                actor=request.user,
                message=f"{request.user.username} requested to follow you.",
                notification_type='follow_request',
                related_id=follow_req.id
            )
            # WS Notify
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{target_user.id}',
                    {
                        'type': 'send_notification',
                        'notification': {
                            'id': notif.id,
                            'message': notif.message,
                            'actor': request.user.username,
                            'type': 'follow_request',
                            'related_id': follow_req.id
                        }
                    }
                )
            except Exception as e:
                print(f"WS Error: {e}")

            return Response({"status": "requested"}, status=status.HTTP_201_CREATED)
            
        else:
            # Public Profile - Follow Immediately
            # NOTE: We use social.Follow
            Follow.objects.create(follower=request.user, following=target_user)
            
            # Notify Target
            notif = Notification.objects.create(
                recipient=target_user,
                actor=request.user,
                message=f"{request.user.username} started following you.",
                notification_type='follow'
            )
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{target_user.id}',
                    {
                        'type': 'send_notification',
                        'notification': {
                            'id': notif.id,
                            'message': notif.message,
                            'actor': request.user.username,
                            'type': 'follow'
                        }
                    }
                )
            except:
                pass

            return Response({"status": "followed"}, status=status.HTTP_201_CREATED)

class UnfollowUserView(APIView):
    """endpoint: POST /api/social/unfollow/ { "username": "target_user" }"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        username = request.data.get('username')
        if not username:
             return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, username=username)
        
        # Try finding in social.Follow
        deleted_count, _ = Follow.objects.filter(follower=request.user, following=target_user).delete()
        
        if deleted_count > 0:
            return Response({"status": "unfollowed"}, status=status.HTTP_200_OK)
        
        # Try finding in FollowRequest (Cancel Request)
        cancel_count, _ = FollowRequest.objects.filter(from_user=request.user, to_user=target_user).delete()
        if cancel_count > 0:
             return Response({"status": "request_cancelled"}, status=status.HTTP_200_OK)
             
        return Response({"error": "Not following or requesting this user"}, status=status.HTTP_400_BAD_REQUEST)

class RespondToFollowRequestView(APIView):
    """
    POST /api/social/follow/respond/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        action = request.data.get('action') # accept, deny
        request_id = request.data.get('request_id')
        notification_id = request.data.get('notification_id')
        
        # 1. Cleanup Notification if provided
        if notification_id:
             Notification.objects.filter(id=notification_id, recipient=request.user).delete()

        # 2. handle Request ID
        follow_req = None
        if request_id:
            # Check if it exists
            follow_req = FollowRequest.objects.filter(id=request_id, to_user=request.user).first()
        else:
            username = request.data.get('username')
            if username:
                target_user = get_object_or_404(User, username=username)
                follow_req = FollowRequest.objects.filter(from_user=target_user, to_user=request.user).first()
        
        if not follow_req:
             return Response({"status": "processed", "message": "Request no longer exists or was already processed."}, status=status.HTTP_200_OK)
            
        if action == 'accept':
            # Create Follow relationship
            Follow.objects.create(follower=follow_req.from_user, following=request.user)
            follow_req.delete()
            
            # Notify acceptance
            notif = Notification.objects.create(
                recipient=follow_req.from_user,
                actor=request.user,
                message=f"{request.user.username} accepted your follow request.",
                notification_type='follow_accept'
            )
             # WS Notify
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{follow_req.from_user.id}',
                    {
                        'type': 'send_notification',
                        'notification': {
                            'message': f"{request.user.username} accepted your follow request.",
                            'actor': request.user.username,
                            'type': 'follow_accept'
                        }
                    }
                )
            except:
                pass
            
            return Response({"status": "accepted"}, status=status.HTTP_200_OK)
            
        elif action == 'deny':
            follow_req.delete()
            return Response({"status": "denied"}, status=status.HTTP_200_OK)
            
        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)


class FriendRecommendationListView(generics.ListAPIView):
    """View to list friend recommendations."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FriendRecommendationSerializer
    
    def get_queryset(self):
        if UserRecommendation:
            return UserRecommendation.objects.filter(user=self.request.user).order_by('-score')
        return []

class TrendingHashtagsView(APIView):
    """View to list trending hashtags."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        if HashtagTrend:
             trends = HashtagTrend.objects.all().order_by('-score')[:10]
             serializer = TrendingHashtagSerializer(trends, many=True)
             return Response(serializer.data)
        

from django.db.models import Q

class InterestMatchView(generics.ListAPIView):
    """
    Finds users with similar interests.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FriendRecommendationSerializer # We can reuse this or simple PublicProfileSerializer

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'profile') or not user.profile.interests:
            return User.objects.none()

        my_interests = [i.strip().lower() for i in user.profile.interests.split(',') if i.strip()]
        
        if not my_interests:
            return User.objects.none()

        # Find users who have profiles with matching interests
        query = Q()
        for interest in my_interests:
            query |= Q(profile__interests__icontains=interest)
        
        # Exclude self and usually already followed users (using social.Follow)
        already_following = Follow.objects.filter(follower=user).values_list('following', flat=True)
        
        return User.objects.filter(query).exclude(id=user.id).exclude(id__in=already_following).distinct()[:20]

