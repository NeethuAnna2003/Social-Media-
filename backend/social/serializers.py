from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, F, Subquery, OuterRef, Exists, Value, BooleanField
from django.utils import timezone
from datetime import timedelta

from accounts.serializers import PublicProfileSerializer
from analytics.models import UserRecommendation, UserInteraction, UserEngagement

User = get_user_model()


class FriendRecommendationSerializer(serializers.ModelSerializer):
    """Serializer for friend recommendations."""
    user = PublicProfileSerializer(read_only=True)
    recommended_user = PublicProfileSerializer(read_only=True)
    mutual_friends_count = serializers.SerializerMethodField()
    common_interests = serializers.SerializerMethodField()
    
    class Meta:
        model = UserRecommendation
        fields = [
            'id', 'user', 'recommended_user', 'score', 'reason',
            'mutual_friends_count', 'common_interests', 'created_at'
        ]
        read_only_fields = ('id', 'created_at')
    
    def get_mutual_friends_count(self, obj):
        """Get the number of mutual friends between users."""
        from social.models import Follow
        
        # Get users that both the current user and recommended user follow
        user_following = set(Follow.objects.filter(
            follower=obj.user
        ).values_list('following_id', flat=True))
        
        recommended_following = set(Follow.objects.filter(
            follower=obj.recommended_user
        ).values_list('following_id', flat=True))
        
        # Calculate mutual connections (excluding themselves)
        mutual = user_following.intersection(recommended_following)
        if obj.user.id in mutual:
            mutual.remove(obj.user.id)
        if obj.recommended_user.id in mutual:
            mutual.remove(obj.recommended_user.id)
            
        return len(mutual)
    
    def get_common_interests(self, obj):
        """Get common interests between users (placeholder implementation)."""
        # This is a placeholder. You would typically implement this based on your data model
        # For example, if users have 'interests' in their profile:
        # user_interests = set(obj.user.profile.interests.all())
        # recommended_interests = set(obj.recommended_user.profile.interests.all())
        # return list(user_interests.intersection(recommended_interests))
        return []


class UserInteractionSerializer(serializers.ModelSerializer):
    """Serializer for user interactions."""
    from_user = PublicProfileSerializer(read_only=True)
    to_user = PublicProfileSerializer(read_only=True)
    content_object = serializers.SerializerMethodField()
    
    class Meta:
        model = UserInteraction
        fields = [
            'id', 'from_user', 'to_user', 'interaction_type',
            'content_type', 'content_id', 'content_object', 'created_at'
        ]
        read_only_fields = ('created_at',)
    
    def get_content_object(self, obj):
        """Get the related content object if it exists."""
        if obj.content_type and obj.content_id:
            try:
                model = obj.content_type.model_class()
                content_obj = model.objects.get(pk=obj.content_id)
                
                # Return a simplified representation of the content
                return {
                    'id': content_obj.id,
                    'type': obj.content_type.model,
                    'preview': str(content_obj)[:100]  # First 100 chars of string representation
                }
            except:
                return None
        return None


class UserEngagementSerializer(serializers.ModelSerializer):
    """Serializer for user engagement metrics."""
    user = PublicProfileSerializer(read_only=True)
    
    class Meta:
        model = UserEngagement
        fields = [
            'user', 'post_count', 'story_count', 'like_count',
            'comment_count', 'follower_count', 'following_count',
            'engagement_rate', 'last_updated'
        ]
        read_only_fields = fields


class FriendSuggestionSerializer(serializers.Serializer):
    """Serializer for friend suggestions."""
    user = PublicProfileSerializer()
    score = serializers.FloatField()
    reason = serializers.CharField()
    mutual_friends = serializers.ListField(child=PublicProfileSerializer())
    common_interests = serializers.ListField(child=serializers.CharField())
    
    def to_representation(self, instance):
        """Convert the suggestion to a dictionary."""
        data = super().to_representation(instance)
        # Limit the number of mutual friends to 5 for performance
        data['mutual_friends'] = data['mutual_friends'][:5]
        return data


class TrendingHashtagSerializer(serializers.Serializer):
    """Serializer for trending hashtags."""
    id = serializers.IntegerField(source='hashtag.id')
    name = serializers.CharField(source='hashtag.name')
    slug = serializers.CharField(source='hashtag.slug')
    usage_count = serializers.IntegerField(source='hashtag.usage_count')
    score = serializers.FloatField()
    rank = serializers.IntegerField()
    time_window = serializers.CharField()
    
    def to_representation(self, instance):
        """Convert the trending hashtag to a dictionary."""
        data = super().to_representation(instance)
        # Add the hashtag with # prefix
        data['hashtag'] = f"#{data['name']}"
        return data
