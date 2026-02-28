from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Profile

User = get_user_model()

class ProfileSerializer(serializers.ModelSerializer):
    profile_pic = serializers.SerializerMethodField()
    cover_photo = serializers.SerializerMethodField()
    
    class Meta:
        model = Profile
        fields = [
            'bio', 'profile_pic', 'cover_photo', 'interests', 
            'gender', 'location', 'website', 'profession', 'social_links',
            'created_at', 'is_private'
        ]
        read_only_fields = ['created_at']

    def get_profile_pic(self, obj):
        if obj.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_pic.url)
            return obj.profile_pic.url
        return None

    def get_cover_photo(self, obj):
        if obj.cover_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_photo.url)
            return obj.cover_photo.url
        return None

class PublicProfileSerializer(serializers.ModelSerializer):
    """Serializer for public user information."""
    profile = ProfileSerializer(read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    date_of_birth = serializers.DateField(required=False)
    is_following = serializers.SerializerMethodField()
    is_requested = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'date_of_birth', 'profile', 'followers_count', 'following_count', 'posts_count', 'avatar', 'is_following', 'is_requested']
        read_only_fields = ['id', 'username', 'followers_count', 'following_count', 'posts_count', 'avatar', 'is_following', 'is_requested']

    def get_followers_count(self, obj):
        # Use social.Follow (related_name='followers_set')
        return obj.followers_set.count()

    def get_following_count(self, obj):
        # Use social.Follow (related_name='following_set')
        return obj.following_set.count()

    def get_posts_count(self, obj):
        return obj.posts.count()

    def get_avatar(self, obj):
        if hasattr(obj, 'profile') and obj.profile.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.profile_pic.url)
            return obj.profile.profile_pic.url
        return f"https://ui-avatars.com/api/?name={obj.username}&background=random"

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check social.Follow
            # Does the request.user follow obj?
            # User(request.user) -> Use 'following_set' lookup
            return request.user.following_set.filter(following=obj).exists()
        return False

    def get_is_requested(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from .models import FollowRequest
            return FollowRequest.objects.filter(from_user=request.user, to_user=obj).exists()
        return False

class UserSerializer(PublicProfileSerializer):
    """Full user serializer for the authenticated user."""
    class Meta(PublicProfileSerializer.Meta):
        fields = PublicProfileSerializer.Meta.fields + ['email', 'is_admin', 'is_staff', 'is_superuser']
        read_only_fields = ['id', 'followers_count', 'following_count', 'posts_count', 'avatar', 'is_admin', 'is_staff', 'is_superuser']

class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    bio = serializers.CharField(source='profile.bio', required=False, allow_blank=True)
    interests = serializers.CharField(source='profile.interests', required=False, allow_blank=True)
    profile_pic = serializers.ImageField(source='profile.profile_pic', required=False)
    cover_photo = serializers.ImageField(source='profile.cover_photo', required=False)
    gender = serializers.CharField(source='profile.gender', required=False, allow_blank=True)
    location = serializers.CharField(source='profile.location', required=False, allow_blank=True)
    website = serializers.CharField(source='profile.website', required=False, allow_blank=True)
    profession = serializers.CharField(source='profile.profession', required=False, allow_blank=True)
    social_links = serializers.JSONField(source='profile.social_links', required=False)
    is_private = serializers.BooleanField(source='profile.is_private', required=False)
    
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'date_of_birth',
            'bio', 'interests', 'profile_pic', 'cover_photo',
            'gender', 'location', 'website', 'profession', 'social_links',
            'is_private'
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        
        # Update User fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.date_of_birth = validated_data.get('date_of_birth', instance.date_of_birth)
        instance.save()
        
        # Update Profile fields
        # Ensure profile exists
        if not hasattr(instance, 'profile'):
            Profile.objects.create(user=instance)
            
        profile = instance.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

class SetNewPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
    token = serializers.CharField(write_only=True)
    uidb64 = serializers.CharField(write_only=True)
