from rest_framework import viewsets, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

from posts.models import Post, Comment
from stories.models import Story
from analytics.models import TrendingHashtag, Hashtag

from .serializers import (
    AdminUserListSerializer, 
    AdminPostSerializer, 
    TrendingHashtagSerializer
)

User = get_user_model()

class IsCustomAdminUser(permissions.BasePermission):
    """
    Allows access only to users with is_admin=True or is_superuser=True.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (getattr(request.user, 'is_admin', False) or request.user.is_superuser))

class AdminOverviewView(APIView):
    permission_classes = [IsCustomAdminUser]

    def get(self, request):
        # Basic Counts
        total_users = User.objects.count()
        total_posts = Post.objects.count()
        total_stories = Story.objects.count()
        flagged_posts_count = Post.objects.filter(ai_status='flagged').count()
        
        # Activity Trends (Last 7 Days Posts)
        days = 7
        start_date = timezone.now() - timedelta(days=days)
        
        daily_posts = Post.objects.filter(created_at__gte=start_date)\
            .annotate(date=TruncDate('created_at'))\
            .values('date')\
            .annotate(count=Count('id'))\
            .order_by('date')

        # Fill missing dates
        activity_map = {}
        for day in range(days + 1):
            d = (timezone.now() - timedelta(days=day)).date()
            activity_map[d.strftime('%Y-%m-%d')] = 0
            
        for entry in daily_posts:
            if entry['date']:
                activity_map[entry['date'].strftime('%Y-%m-%d')] = entry['count']
                
        activity_trends = [v for k, v in sorted(activity_map.items())]

        # Trending Hashtags (Top 5 from last 24h or all time if empty)
        trending = TrendingHashtag.objects.filter(time_window='24h').order_by('rank')[:5]
        if not trending.exists():
            trending = TrendingHashtag.objects.filter(time_window='all').order_by('rank')[:5]
        
        if trending.exists():
            trending_data = TrendingHashtagSerializer(trending, many=True).data
        else:
            # Fallback to Hashtag usage_count
            top_hashtags = Hashtag.objects.order_by('-usage_count')[:5]
            trending_data = [
                {'name': h.name, 'score': h.usage_count, 'rank': idx + 1}
                for idx, h in enumerate(top_hashtags)
            ]

        # Top Active Users (by post count)
        top_users = User.objects.annotate(total_posts=Count('posts')).order_by('-total_posts')[:5]
        top_users_data = AdminUserListSerializer(top_users, many=True).data

        return Response({
            "stats": {
                "total_users": total_users,
                "total_posts": total_posts,
                "total_stories": total_stories,
                "flagged_posts": flagged_posts_count,
            },
            "activity_trends": activity_trends,
            "trending_hashtags": trending_data,
            "top_active_users": top_users_data
        })

class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing users.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserListSerializer
    permission_classes = [IsCustomAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email']
    http_method_names = ['get', 'post', 'patch', 'delete']

    @action(detail=True, methods=['post'])
    def ban(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({"status": "User banned successfully", "is_active": False})

    @action(detail=True, methods=['post'])
    def unban(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({"status": "User unbanned successfully", "is_active": True})

    @action(detail=True, methods=['post'])
    def make_admin(self, request, pk=None):
        user = self.get_object()
        # Toggle or Set? Usually explicitly set.
        user.is_admin = True
        user.save()
        return Response({"status": "User is now an admin", "is_admin": True})
    
    @action(detail=True, methods=['post'])
    def remove_admin(self, request, pk=None):
        user = self.get_object()
        user.is_admin = False
        user.save()
        return Response({"status": "User is no longer an admin", "is_admin": False})

class AdminPostViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for managing posts.
    """
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = AdminPostSerializer
    permission_classes = [IsCustomAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['text', 'user__username']

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(ai_status=status_param)
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        post = self.get_object()
        post.ai_status = 'safe'
        post.save()
        return Response({"status": "Post approved", "ai_status": "safe"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        post = self.get_object()
        post.ai_status = 'blocked'
        post.save()
        return Response({"status": "Post blocked", "ai_status": "blocked"})

class AdminReportView(APIView):
    """
    View to handle reported content (AI flagged).
    """
    permission_classes = [IsCustomAdminUser]

    def get(self, request):
        # Currently fetching all "flagged" posts.
        # Ideally, this would also join a Report model if it existed.
        flagged_posts = Post.objects.filter(ai_status='flagged').order_by('-created_at')
        serializer = AdminPostSerializer(flagged_posts, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        # Batch action example or specific report handling
        # For now, we assume individual actions are handled via AdminPostViewSet
        return Response({"message": "Use Post actions to resolve reports"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class AdminAnalyticsView(APIView):
    """
    Analytics data for charts.
    """
    permission_classes = [IsCustomAdminUser]

    def get(self, request):
        days = 7
        start_date = timezone.now() - timedelta(days=days)

        # Helper to format data for charts: [{date: 'Y-m-d', value: 10}, ...]
        def get_daily_counts(queryset, date_field):
            data = queryset.filter(**{f"{date_field}__gte": start_date})\
                .annotate(date=TruncDate(date_field))\
                .values('date')\
                .annotate(count=Count('id'))\
                .order_by('date')
            
            # Fill missing dates with 0
            result = {}
            for day in range(days + 1):
                d = (timezone.now() - timedelta(days=day)).date()
                result[d.strftime('%Y-%m-%d')] = 0
            
            for entry in data:
                if entry['date']:
                    result[entry['date'].strftime('%Y-%m-%d')] = entry['count']
            
            return [{"date": k, "count": v} for k, v in sorted(result.items())]

        posts_chart = get_daily_counts(Post.objects.all(), 'created_at')
        stories_chart = get_daily_counts(Story.objects.all(), 'created_at')
        users_chart = get_daily_counts(User.objects.all(), 'date_joined')

        # Moderation Stats
        safe_count = Post.objects.filter(ai_status='safe').count()
        flagged_count = Post.objects.filter(ai_status='flagged').count()
        blocked_count = Post.objects.filter(ai_status='blocked').count()

        return Response({
            "posts_per_day": posts_chart,
            "stories_per_day": stories_chart,
            "new_users_growth": users_chart,
            "moderation_stats": {
                "safe": safe_count,
                "flagged": flagged_count,
                "blocked": blocked_count
            }
        })
