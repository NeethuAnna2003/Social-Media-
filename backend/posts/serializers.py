from rest_framework import serializers
from .models import Post, Like, Comment, PostMedia
from accounts.serializers import PublicProfileSerializer


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for comments."""
    user = PublicProfileSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    is_filtered = serializers.SerializerMethodField()
    filter_warning = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'text', 'sentiment', 'is_flagged', 'created_at', 'updated_at', 'parent', 'replies', 'toxicity', 'ai_confidence', 'ai_reason', 'is_filtered', 'filter_warning']
        read_only_fields = ['sentiment', 'is_flagged', 'created_at', 'updated_at', 'replies', 'toxicity', 'ai_confidence', 'ai_reason', 'is_filtered', 'filter_warning']

    def get_replies(self, obj):
        if hasattr(obj, 'replies'):
             return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []
    
    def get_is_filtered(self, obj):
        """Check if this comment is filtered."""
        try:
            return hasattr(obj, 'filter_data') and obj.filter_data is not None
        except Exception:
            return False
    
    def get_filter_warning(self, obj):
        """Get filter warning message if comment is filtered."""
        try:
            if hasattr(obj, 'filter_data') and obj.filter_data:
                request = self.context.get('request')
                if request and request.user.is_authenticated:
                    # Only show warning to the commenter
                    if obj.user.id == request.user.id:
                        return {
                            'show': True,
                            'message': '⚠️ This comment contains words restricted by the user and is only visible to you.',
                            'matched_words': obj.filter_data.matched_words
                        }
        except Exception:
            pass
        return None


class LikeSerializer(serializers.ModelSerializer):
    """Serializer for likes."""
    user = PublicProfileSerializer(read_only=True)
    
    class Meta:
        model = Like
        fields = ['id', 'user', 'created_at']
        read_only_fields = ['created_at']


class PostMediaSerializer(serializers.ModelSerializer):
    """Serializer for post media."""
    file = serializers.SerializerMethodField()

    class Meta:
        model = PostMedia
        fields = ['id', 'file', 'media_type', 'captions']

    def get_file(self, obj):
        request = self.context.get('request')
        if obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class PostSerializer(serializers.ModelSerializer):
    """Serializer for posts."""
    user = PublicProfileSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    has_liked = serializers.SerializerMethodField()
    media = PostMediaSerializer(many=True, read_only=True)
    is_scheduled = serializers.SerializerMethodField()
    scheduled_for = serializers.DateTimeField(read_only=True)
    is_public = serializers.BooleanField(read_only=True)
    location_data = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'user', 'text', 'image', 'media', 'created_at', 'updated_at',
            'sentiment', 'ai_status', 'likes_count', 'comments_count', 'has_liked', 
            'is_archived', 'music_info', 'scheduled_for', 'is_public', 'is_scheduled',
            'status', 'scheduled_at', 'published_at', 'location_data'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'sentiment', 'ai_status',
            'likes_count', 'comments_count', 'has_liked', 'is_archived', 'is_scheduled',
            'status', 'published_at' 
        ]
    
    def get_likes_count(self, obj):
        return obj.likes.count()
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_has_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
    
    def get_is_scheduled(self, obj):
        """Check if post is scheduled (status is scheduled)"""
        return obj.status == 'scheduled'
    
    def get_location_data(self, obj):
        """Get location data for the post if available."""
        try:
            if hasattr(obj, 'location_data') and obj.location_data:
                return {
                    'display_location': obj.location_data.display_location,
                    'is_detected': obj.location_data.is_detected,
                    'detection_status': obj.location_data.detection_status,
                }
        except Exception:
            pass
        return None
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Add full URL for post image if it exists (Legacy support)
        if instance.image:
            request = self.context.get('request')
            if request is not None:
                representation['image'] = request.build_absolute_uri(instance.image.url)
        return representation


class PostCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating posts."""
    uploaded_media = serializers.ListField(
        child=serializers.FileField(max_length=100000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    music_info = serializers.JSONField(required=False)

    class Meta:
        model = Post
        fields = ['text', 'image', 'uploaded_media', 'music_info'] # 'image' kept for legacy or single-upload if needed, but 'uploaded_media' is preferred
        extra_kwargs = {
            'text': {'required': False},
            'image': {'required': False}
        }
    
    def validate(self, data):
        # Check if creating or updating
        is_update = self.instance is not None
        
        has_text = bool(data.get('text', '').strip() if data.get('text') else '')
        has_new_media = bool(data.get('uploaded_media') or data.get('image'))
        
        if is_update:
            # For updates, we need to ensure the RESULING post has content.
            # If 'text' is provided, it replaces the old text.
            # If 'text' is NOT provided, the old text remains (unless this is a partial update where we only send changed fields).
            # But wait, frontend usually sends 'text' even if empty.
            
            # If the user sends text='', has_text is False.
            # We must check if existing media remains.
            
            # We don't currently support deleting media via this serializer, so existing media persists.
            has_existing_media = self.instance.media.exists() or bool(self.instance.image)
            
            # If we aren't changing text (key not in data), we assume old text persists.
            # If 'text' IS in data, we use that value.
            final_text_exists = has_text if 'text' in data else bool(self.instance.text)

            if not final_text_exists and not has_new_media and not has_existing_media:
                 raise serializers.ValidationError("A post must contain text, an image, or media.")
                 
        else:
            # Creation
            if not has_text and not has_new_media:
                raise serializers.ValidationError("A post must contain text, an image, or media.")
                
        return data

    def create(self, validated_data):
        # Remove uploaded_media from validated_data as it's not a field on the Post model
        # The actual media creation is handled in the View's perform_create method
        validated_data.pop('uploaded_media', None)
        return super().create(validated_data)
