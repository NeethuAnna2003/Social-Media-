import json
from rest_framework import serializers
from .models import Story, StoryView, StoryLike
from accounts.serializers import UserSerializer

class StorySerializer(serializers.ModelSerializer):
    is_viewed = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    user_name = serializers.ReadOnlyField(source='user.username')
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = [
            'id', 'user', 'user_name', 'user_avatar',
            'story_type', 'media', 'media_type', 'caption',
            'link_url', 'link_title', 'link_description', 'link_thumbnail', 'link_source',
            'created_at', 'expires_at',
            'views_count', 'is_viewed',
            'likes_count', 'is_liked', 'music_info'
        ]
        read_only_fields = ['user', 'created_at', 'expires_at', 'views_count', 'media_type']

    def get_user_avatar(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile.profile_pic.url)
        return None

    def get_is_viewed(self, obj):
        user = self.context.get('request').user
        if not user.is_authenticated:
            return False
        if obj.user == user:
            return True
        return StoryView.objects.filter(story=obj, user=user).exists()

    def get_is_liked(self, obj):
        user = self.context.get('request').user
        if not user.is_authenticated:
            return False
        return StoryLike.objects.filter(story=obj, user=user).exists()

    def get_likes_count(self, obj):
        return obj.likes.count()

class StoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Story
        fields = [
            'story_type', 'media', 'caption', 'music_info',
            'link_url', 'link_title', 'link_description', 'link_thumbnail', 'link_source'
        ]
        extra_kwargs = {
            'music_info': {'required': False},
            'media': {'required': False},
            'link_url': {'required': False},
            'link_title': {'required': False},
            'link_description': {'required': False},
            'link_thumbnail': {'required': False},
            'link_source': {'required': False},
        }
    
    def validate(self, data):
        """Validate based on story type"""
        print(f"[SERIALIZER] Validating data: {data}")
        story_type = data.get('story_type', 'image')
        print(f"[SERIALIZER] Story type: {story_type}")
        
        if story_type == 'link':
            print(f"[SERIALIZER] Validating link story...")
            print(f"[SERIALIZER] link_url present: {bool(data.get('link_url'))}")
            print(f"[SERIALIZER] link_title present: {bool(data.get('link_title'))}")
            
            if not data.get('link_url'):
                print(f"[SERIALIZER] ✗ Missing link_url")
                raise serializers.ValidationError({
                    'link_url': 'Link URL is required for link stories'
                })
            if not data.get('link_title'):
                print(f"[SERIALIZER] ✗ Missing link_title")
                raise serializers.ValidationError({
                    'link_title': 'Link title is required for link stories'
                })
            print(f"[SERIALIZER] ✓ Link story validation passed")
        elif story_type in ['image', 'video']:
            print(f"[SERIALIZER] Validating media story...")
            if not data.get('media'):
                print(f"[SERIALIZER] ✗ Missing media")
                raise serializers.ValidationError({
                    'media': 'Media file is required for image/video stories'
                })
            print(f"[SERIALIZER] ✓ Media story validation passed")
        
        return data
        
    def validate_media(self, value):
        if value and value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("File too large. Max 50MB.")
        return value

    def validate_music_info(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except ValueError:
                return {}
        return value
