from django.db import models
from django.conf import settings
from django.utils import timezone


class Post(models.Model):
    """Model for user posts."""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('published', 'Published'),
    ]

    SENTIMENT_CHOICES = [
        ('positive', 'Positive'),
        ('neutral', 'Neutral'),
        ('negative', 'Negative'),
    ]
    
    AI_STATUS_CHOICES = [
        ('safe', 'Safe'),
        ('flagged', 'Flagged for Review'),
        ('blocked', 'Content Blocked'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    text = models.TextField(blank=True)
    image = models.ImageField(
        upload_to='posts/images/',
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # New Scheduling Fields (Replacing old scheduled_for/is_public logic)
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='published'
    )
    scheduled_at = models.DateTimeField(blank=True, null=True, help_text="Time when post should go live")
    published_at = models.DateTimeField(blank=True, null=True, help_text="Time when post was actually published")
    
    # Legacy/Compatibility fields (Mapped to new logic)
    # is_public is now a property based on status
    
    sentiment = models.CharField(
        max_length=10,
        choices=SENTIMENT_CHOICES,
        default='neutral'
    )
    ai_status = models.CharField(
        max_length=10,
        choices=AI_STATUS_CHOICES,
        default='safe'
    )
    music_info = models.JSONField(blank=True, null=True, default=dict)
    is_archived = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Post by {self.user.username} ({self.status})"
    
    @property
    def is_public(self):
        return self.status == 'published'
        
    @property
    def scheduled_for(self):
        return self.scheduled_at
    
    @property
    def comment_count(self):
        return self.comments.count()


class Like(models.Model):
    """Model for post likes."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'post'],
                name='unique_like'
            )
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} likes {self.post}"


class Comment(models.Model):
    """Model for post comments."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    text = models.TextField()
    sentiment = models.CharField(
        max_length=10,
        choices=Post.SENTIMENT_CHOICES,
        default='neutral'
    )
    is_flagged = models.BooleanField(default=False)
    
    # AI Moderation Fields
    TOXICITY_CHOICES = [
        ('none', 'None'), 
        ('medium', 'Medium'), 
        ('high', 'High')
    ]
    toxicity = models.CharField(
        max_length=10, 
        choices=TOXICITY_CHOICES, 
        default='none'
    )
    ai_confidence = models.FloatField(default=0.0)
    ai_reason = models.CharField(max_length=255, blank=True, null=True)

    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.post}"


class PostMedia(models.Model):
    """Model for post media (images/videos)."""
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
    ]
    
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='media'
    )
    file = models.FileField(upload_to='posts/media/')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES, default='image')
    captions = models.JSONField(blank=True, null=True, default=list, help_text="Video captions with timestamps")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.media_type} for {self.post}"


# Import additional models for location detection and comment filtering
from .location_models import ImageLocationCache, PostLocation
from .filter_models import ProhibitedWord, ProhibitedWordRequest, FilteredComment
