from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.core.exceptions import ValidationError
import os

def get_file_extension(file_name):
    return os.path.splitext(file_name)[1]

def validate_file_extension(value):
    ext = os.path.splitext(value.name)[1]
    valid_extensions = ['.jpg', '.jpeg', '.png', '.mp4', '.mov', '.avi']
    if not ext.lower() in valid_extensions:
        raise ValidationError('Unsupported file extension.')

class Story(models.Model):
    STORY_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('link', 'Link'),  # NEW: For news/external links
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stories'
    )
    
    # Story Type
    story_type = models.CharField(
        max_length=10,
        choices=STORY_TYPE_CHOICES,
        default='image'
    )
    
    # Media fields (for image/video stories)
    media = models.FileField(
        upload_to='stories/media/',
        validators=[validate_file_extension],
        help_text='Upload an image or video',
        blank=True,
        null=True
    )
    media_type = models.CharField(
        max_length=10, 
        choices=[('image', 'Image'), ('video', 'Video')],
        default='image',
        blank=True,
        null=True
    )
    
    # Link story fields
    link_url = models.TextField(blank=True, null=True, help_text="URL for link stories")
    link_title = models.CharField(max_length=200, blank=True, null=True, help_text="Link preview title")
    link_description = models.TextField(blank=True, null=True, help_text="Link preview description")
    link_thumbnail = models.URLField(max_length=500, blank=True, null=True, help_text="Link preview thumbnail")
    link_source = models.CharField(max_length=100, blank=True, null=True, help_text="Source name (e.g., CNN, BBC)")
    
    # Common fields
    caption = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    views_count = models.IntegerField(default=0)
    is_highlighted = models.BooleanField(default=False)
    music_info = models.JSONField(blank=True, null=True, default=dict)
    
    class Meta:
        verbose_name_plural = 'Stories'
        ordering = ['-created_at']
    
    def clean(self):
        """Validate story data based on type"""
        if self.story_type == 'link':
            if not self.link_url:
                raise ValidationError("Link stories must have a link_url")
        elif self.story_type in ['image', 'video']:
            if not self.media:
                raise ValidationError("Media stories must have a media file")
    
    def save(self, *args, **kwargs):
        if not self.id and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        
        # Auto-detect media type for media stories
        if self.media and self.story_type != 'link':
            ext = get_file_extension(self.media.name).lower()
            if ext in ['.mp4', '.mov', '.avi']:
                self.media_type = 'video'
                if not self.story_type or self.story_type == 'image':
                    self.story_type = 'video'
            else:
                self.media_type = 'image'
                if not self.story_type or self.story_type == 'video':
                    self.story_type = 'image'
        
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Story by {self.user} ({self.story_type})"

class StoryView(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='views')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'user')

class StoryLike(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'user')
