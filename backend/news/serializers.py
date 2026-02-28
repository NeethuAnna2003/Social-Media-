from rest_framework import serializers
from .models import NewsArticle, NewsComment, UserNewsInterest

class NewsCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    user_avatar = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    is_voted = serializers.SerializerMethodField()
    
    class Meta:
        model = NewsComment
        fields = ['id', 'user_name', 'user_avatar', 'content', 'sentiment', 'classification', 'is_toxic', 'created_at', 'parent', 'replies', 'score', 'is_voted', 'upvotes', 'downvotes']
        read_only_fields = ['sentiment', 'classification', 'is_toxic', 'score', 'upvotes', 'downvotes']

    def get_user_avatar(self, obj):
        if hasattr(obj.user, 'profile') and obj.user.profile.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile.profile_pic.url)
        return None

    def get_replies(self, obj):
        if obj.replies.exists():
            return NewsCommentSerializer(obj.replies.all().order_by('created_at'), many=True, context=self.context).data
        return []

    def get_is_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Avoid circular import issues by using related manager if possible or local import
            # Using filtered relation is better but for now try/except
            try:
                vote = obj.votes.filter(user=request.user).first()
                return vote.value if vote else 0
            except Exception:
                return 0
        return 0

class NewsArticleSerializer(serializers.ModelSerializer):
    comments = NewsCommentSerializer(many=True, read_only=True)
    
    class Meta:
        model = NewsArticle
        fields = ['id', 'url', 'title', 'image_url', 'source_name', 'topic', 'comments']

class UserNewsInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNewsInterest
        fields = ['topic', 'view_count', 'time_spent_seconds']
