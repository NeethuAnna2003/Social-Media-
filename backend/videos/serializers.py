"""
Serializers for Video API
"""

from rest_framework import serializers
from .models import (
    Video, Caption, CaptionProcessingJob,
    ThumbnailOption, VideoLike, VideoComment
)
from accounts.serializers import UserSerializer


class CaptionSerializer(serializers.ModelSerializer):
    """Serializer for video captions"""
    
    class Meta:
        model = Caption
        fields = [
            'id', 'language', 'start_time', 'end_time', 'text',
            'confidence', 'is_translated', 'original_text', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ThumbnailOptionSerializer(serializers.ModelSerializer):
    """Serializer for thumbnail options"""
    
    class Meta:
        model = ThumbnailOption
        fields = [
            'id', 'image', 'template', 'frame_timestamp',
            'has_face', 'emotion_detected', 'quality_score',
            'overlay_text', 'is_selected', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CaptionProcessingJobSerializer(serializers.ModelSerializer):
    """Serializer for caption processing jobs"""
    
    class Meta:
        model = CaptionProcessingJob
        fields = [
            'id', 'status', 'progress', 'chunk_index', 'total_chunks',
            'source_language', 'target_language', 'captions_generated',
            'error_message', 'created_at', 'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'started_at', 'completed_at']


class VideoSerializer(serializers.ModelSerializer):
    """Full video serializer with all related data"""
    
    user_name = serializers.ReadOnlyField(source='user.username')
    user_avatar = serializers.SerializerMethodField()
    captions = CaptionSerializer(many=True, read_only=True)
    thumbnail_options = ThumbnailOptionSerializer(many=True, read_only=True)
    caption_jobs = CaptionProcessingJobSerializer(many=True, read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Video
        fields = [
            'id', 'user', 'user_name', 'user_avatar',
            'video_file', 'thumbnail', 'title', 'description',
            'duration', 'file_size', 'status', 'processing_progress',
            'error_message', 'original_language', 'caption_enabled',
            'caption_language_mode', 'translation_language',
            'thumbnail_template', 'thumbnail_text', 'custom_thumbnail',
            'views_count', 'likes_count', 'comments_count',
            'created_at', 'updated_at', 'published_at', 'scheduled_at',
            'is_public', 'is_liked',
            'captions', 'thumbnail_options', 'caption_jobs'
        ]
        read_only_fields = [
            'id', 'user', 'user_name', 'user_avatar', 'duration',
            'file_size', 'processing_progress', 'error_message',
            'views_count', 'likes_count', 'comments_count',
            'created_at', 'updated_at', 'published_at'
        ]
        
    def get_user_avatar(self, obj):
        # ... existing ...
        if hasattr(obj.user, 'profile') and obj.user.profile.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile.profile_pic.url)
        return None
    
    def get_is_liked(self, obj):
        # ... existing ...
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return VideoLike.objects.filter(video=obj, user=request.user).exists()
        return False


class VideoCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating videos"""
    
    class Meta:
        model = Video
        fields = [
            'video_file', 'title', 'description',
            'caption_enabled', 'caption_language_mode', 'translation_language',
            'thumbnail_template', 'thumbnail_text',
            'scheduled_at', 'is_public', 'status'
        ]
    
    # ... existing validate_video_file ...
    def validate_video_file(self, value):
        """Validate video file"""
        # Check file size (max 2GB)
        max_size = 2 * 1024 * 1024 * 1024  # 2GB
        if value.size > max_size:
            raise serializers.ValidationError("Video file too large. Maximum size is 2GB.")
        
        # Check file extension
        allowed_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
        ext = value.name.lower().split('.')[-1]
        if f'.{ext}' not in allowed_extensions:
            raise serializers.ValidationError(
                f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        return value
    
    def create(self, validated_data):
        """Create video and extract metadata"""
        video = super().create(validated_data)
        
        # Extract video metadata (duration, file size)
        try:
            # Use default duration for now (ffprobe can be added later)
            video.duration = 30  # Default 30 seconds
        except Exception as e:
            print(f"Error extracting video metadata: {e}")
            video.duration = 0
        
        video.file_size = video.video_file.size
        # DO NOT FORCE status='ready' if user passed something else
        # Check if status was provided in validated_data? No, status is in fields but might not be in validated_data if not passed
        # Currently model default is 'uploading'.
        # Previously line 138: video.status = 'ready'
        # I should set it to 'processing' or 'ready' initially unless scheduled.
        # But 'status' is in fields now.
        if 'status' not in validated_data:
             video.status = 'ready'
        
        video.save()
        
        return video


class VideoUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating videos"""
    
    class Meta:
        model = Video
        fields = [
            'title', 'description', 'caption_enabled',
            'caption_language_mode', 'translation_language',
            'thumbnail_template', 'thumbnail_text', 'custom_thumbnail',
            'scheduled_at', 'is_public', 'status'
        ]


class VideoListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for video lists"""
    
    user_name = serializers.ReadOnlyField(source='user.username')
    user_avatar = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Video
        fields = [
            'id', 'user_name', 'user_avatar', 'thumbnail',
            'title', 'description', 'duration', 'status',
            'views_count', 'likes_count', 'comments_count',
            'created_at', 'published_at', 'is_liked'
        ]
    
    def get_user_avatar(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile.profile_pic.url)
        return None
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return VideoLike.objects.filter(video=obj, user=request.user).exists()
        return False


class VideoCommentSerializer(serializers.ModelSerializer):
    """Serializer for video comments"""
    
    user_name = serializers.ReadOnlyField(source='user.username')
    user_avatar = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = VideoComment
        fields = [
            'id', 'user', 'user_name', 'user_avatar',
            'text', 'parent', 'replies',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_user_avatar(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile.profile_pic.url)
        return None
    
    def get_replies(self, obj):
        if obj.replies.exists():
            return VideoCommentSerializer(
                obj.replies.all(),
                many=True,
                context=self.context
            ).data
        return []
