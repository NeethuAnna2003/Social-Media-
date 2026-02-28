from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import Count, F, Q
from django.contrib.postgres.fields import ArrayField
from django.utils.text import slugify


class Hashtag(models.Model):
    """Model to track hashtags and their usage."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    usage_count = models.PositiveIntegerField(default=0)
    last_used = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.name}"


class HashtagUsage(models.Model):
    """Tracks each usage of a hashtag in posts or comments."""
    hashtag = models.ForeignKey(Hashtag, on_delete=models.CASCADE, related_name='usages')
    content_type = models.CharField(
        max_length=10,
        choices=[
            ('post', 'Post'),
            ('comment', 'Comment'),
            ('story', 'Story')
        ]
    )
    content_id = models.PositiveIntegerField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hashtag_usages'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['content_type', 'content_id']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.hashtag} in {self.content_type} by {self.user}"


class UserInteraction(models.Model):
    """Tracks interactions between users (likes, comments, follows, etc.)."""
    INTERACTION_TYPES = [
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('follow', 'Follow'),
        ('mention', 'Mention'),
        ('share', 'Share')
    ]
    
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interactions_initiated'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interactions_received'
    )
    interaction_type = models.CharField(max_length=10, choices=INTERACTION_TYPES)
    content_type = models.CharField(
        max_length=10,
        choices=[
            ('post', 'Post'),
            ('comment', 'Comment'),
            ('story', 'Story'),
            ('user', 'User')
        ]
    )
    content_id = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['from_user', 'to_user']),
            models.Index(fields=['interaction_type']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.from_user} {self.get_interaction_type_display()} {self.to_user}"


class UserRecommendation(models.Model):
    """Stores friend recommendations for users."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recommendations'
    )
    recommended_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recommended_to'
    )
    score = models.FloatField(
        help_text="Recommendation score (higher means more relevant)"
    )
    reason = models.CharField(
        max_length=255,
        help_text="Reason for the recommendation"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'recommended_user')
        ordering = ['-score', '-updated_at']
        
    def __str__(self):
        return f"Recommendation for {self.user} -> {self.recommended_user} (score: {self.score:.2f})"


class TrendingHashtag(models.Model):
    """Tracks trending hashtags over time."""
    hashtag = models.ForeignKey(Hashtag, on_delete=models.CASCADE)
    score = models.FloatField(help_text="Trending score")
    rank = models.PositiveIntegerField(help_text="Current ranking position")
    time_window = models.CharField(
        max_length=10,
        choices=[
            ('24h', '24 Hours'),
            ('7d', '7 Days'),
            ('30d', '30 Days'),
            ('all', 'All Time')
        ]
    )
    calculated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['time_window', 'rank']
        indexes = [
            models.Index(fields=['time_window', 'rank']),
            models.Index(fields=['calculated_at']),
        ]
    
    def __str__(self):
        return f"#{self.hashtag.name} - {self.time_window} (Rank: {self.rank}, Score: {self.score:.2f})"


class UserEngagement(models.Model):
    """Tracks user engagement metrics."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='engagement_metrics'
    )
    post_count = models.PositiveIntegerField(default=0)
    story_count = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    follower_count = models.PositiveIntegerField(default=0)
    following_count = models.PositiveIntegerField(default=0)
    engagement_rate = models.FloatField(
        default=0.0,
        help_text="Engagement rate (interactions / followers)"
    )
    last_updated = models.DateTimeField(auto_now=True)
    
    def update_metrics(self):
        """Update all engagement metrics."""
        from posts.models import Post, Like, Comment
        from stories.models import Story
        from social.models import Follow
        
        # Update counts
        self.post_count = Post.objects.filter(user=self.user).count()
        self.story_count = Story.objects.filter(user=self.user).count()
        self.like_count = Like.objects.filter(user=self.user).count()
        self.comment_count = Comment.objects.filter(user=self.user).count()
        self.follower_count = Follow.objects.filter(following=self.user).count()
        self.following_count = Follow.objects.filter(follower=self.user).count()
        
        # Calculate engagement rate (only if there are followers)
        if self.follower_count > 0:
            self.engagement_rate = (
                self.like_count + self.comment_count
            ) / max(1, self.follower_count)
        
        self.save()
    
    @classmethod
    def update_user_engagement(cls, user):
        """Update engagement metrics for a specific user."""
        metrics, created = cls.objects.get_or_create(user=user)
        metrics.update_metrics()
        return metrics
    
    def __str__(self):
        return f"Engagement metrics for {self.user.username}"
