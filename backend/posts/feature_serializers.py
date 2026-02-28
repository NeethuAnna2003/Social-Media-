"""
Serializers for Image Location and Comment Filter features
"""
from rest_framework import serializers
from .location_models import ImageLocationCache, PostLocation
from .filter_models import ProhibitedWord, ProhibitedWordRequest, FilteredComment


class ImageLocationCacheSerializer(serializers.ModelSerializer):
    """Serializer for cached image locations."""
    
    class Meta:
        model = ImageLocationCache
        fields = [
            'id', 'image_hash', 'landmark', 'city', 'country',
            'landmark_confidence', 'city_confidence', 'country_confidence',
            'detected_location', 'overall_confidence', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PostLocationSerializer(serializers.ModelSerializer):
    """Serializer for post location data."""
    
    location_details = ImageLocationCacheSerializer(source='location_cache', read_only=True)
    
    class Meta:
        model = PostLocation
        fields = [
            'id', 'post', 'display_location', 'is_detected',
            'detection_status', 'location_details', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ProhibitedWordSerializer(serializers.ModelSerializer):
    """Serializer for prohibited words."""
    
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ProhibitedWord
        fields = [
            'id', 'user', 'username', 'word', 'variations',
            'is_active', 'times_triggered', 'created_at'
        ]
        read_only_fields = ['id', 'username', 'times_triggered', 'created_at']


class ProhibitedWordRequestSerializer(serializers.ModelSerializer):
    """Serializer for prohibited word requests."""
    
    username = serializers.CharField(source='user.username', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)
    
    class Meta:
        model = ProhibitedWordRequest
        fields = [
            'id', 'user', 'username', 'requested_words', 'reason',
            'status', 'admin_notes', 'reviewed_by', 'reviewed_by_username',
            'reviewed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'username', 'status', 'admin_notes', 'reviewed_by',
            'reviewed_by_username', 'reviewed_at', 'created_at', 'updated_at'
        ]


class ProhibitedWordRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating prohibited word requests."""
    
    words = serializers.ListField(
        child=serializers.CharField(max_length=255),
        min_length=1,
        help_text="List of words to prohibit"
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for requesting these filters"
    )


class ProhibitedWordRequestReviewSerializer(serializers.Serializer):
    """Serializer for reviewing prohibited word requests."""
    
    action = serializers.ChoiceField(
        choices=['approve', 'reject'],
        help_text="Action to take on the request"
    )
    admin_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Admin's notes about the decision"
    )


class FilteredCommentSerializer(serializers.ModelSerializer):
    """Serializer for filtered comments."""
    
    post_owner_username = serializers.CharField(source='post_owner.username', read_only=True)
    commenter_username = serializers.CharField(source='commenter.username', read_only=True)
    comment_text = serializers.CharField(source='comment.text', read_only=True)
    
    class Meta:
        model = FilteredComment
        fields = [
            'id', 'comment', 'post_owner', 'post_owner_username',
            'commenter', 'commenter_username', 'comment_text',
            'matched_words', 'is_visible_to_owner', 'is_visible_to_public',
            'is_visible_to_commenter', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
