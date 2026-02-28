from rest_framework import serializers
from django.contrib.auth import get_user_model
from posts.models import Post, Comment, Like
from stories.models import Story
from analytics.models import TrendingHashtag, UserEngagement

User = get_user_model()

class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users in the admin panel."""
    post_count = serializers.IntegerField(source='posts.count', read_only=True)
    followers_count = serializers.IntegerField(source='followers.count', read_only=True)
    following_count = serializers.IntegerField(source='following.count', read_only=True)
    profile_pic = serializers.ImageField(source='profile.profile_pic', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'is_active', 'is_admin', 
            'date_joined', 'last_login', 'post_count', 
            'followers_count', 'following_count', 'profile_pic'
        ]

class AdminPostSerializer(serializers.ModelSerializer):
    """Serializer for listing posts in the admin panel."""
    author_username = serializers.CharField(source='user.username', read_only=True)
    author_avatar = serializers.ImageField(source='user.profile.profile_pic', read_only=True)
    likes_count = serializers.IntegerField(source='likes.count', read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'author_username', 'author_avatar', 'text', 'image', 
            'created_at', 'sentiment', 'ai_status', 
            'likes_count', 'comments_count'
        ]

class TrendingHashtagSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='hashtag.name')
    
    class Meta:
        model = TrendingHashtag
        fields = ['name', 'score', 'rank']

class AdminAnalyticsSerializer(serializers.Serializer):
    """Serializer for analytics data structure."""
    dau = serializers.ListField(child=serializers.DictField())
    posts_per_day = serializers.ListField(child=serializers.DictField())
    stories_per_day = serializers.ListField(child=serializers.DictField())
    new_users = serializers.ListField(child=serializers.DictField())
    moderation_stats = serializers.DictField()
