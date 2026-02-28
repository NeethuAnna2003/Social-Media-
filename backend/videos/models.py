from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import os

class Video(models.Model):
    """Main video model for posts"""
    STATUS_CHOICES = [
        ('uploading', 'Uploading'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('scheduled', 'Scheduled'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='videos'
    )
    
    # Video file
    video_file = models.FileField(upload_to='videos/%Y/%m/', max_length=500)
    thumbnail = models.ImageField(upload_to='thumbnails/%Y/%m/', blank=True, null=True)
    
    # Metadata
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    duration = models.IntegerField(default=0, help_text="Duration in seconds")
    file_size = models.BigIntegerField(default=0, help_text="File size in bytes")
    
    # Processing status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploading')
    processing_progress = models.IntegerField(default=0, help_text="Progress percentage 0-100")
    error_message = models.TextField(blank=True, null=True)
    
    # Caption settings
    original_language = models.CharField(max_length=10, blank=True, null=True, help_text="Detected language code")
    caption_enabled = models.BooleanField(default=True)
    caption_language_mode = models.CharField(
        max_length=20,
        choices=[
            ('original', 'Original Only'),
            ('translated', 'Translated Only'),
            ('both', 'Both Languages'),
        ],
        default='original'
    )
    translation_language = models.CharField(max_length=10, default='en', help_text="Target translation language")
    
    # Thumbnail settings
    thumbnail_template = models.CharField(
        max_length=50,
        choices=[
            ('clean', 'Clean Title Overlay'),
            ('face', 'Face-Focused'),
            ('gradient', 'Gradient Background'),
            ('creator', 'Creator Style'),
        ],
        default='clean'
    )
    thumbnail_text = models.CharField(max_length=100, blank=True, null=True)
    custom_thumbnail = models.BooleanField(default=False)
    
    # Engagement
    views_count = models.IntegerField(default=0)
    likes_count = models.IntegerField(default=0)
    comments_count = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(blank=True, null=True)
    scheduled_at = models.DateTimeField(blank=True, null=True)
    
    # Privacy
    is_public = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.title} by {self.user.username}"
    
    @property
    def is_long_video(self):
        """Check if video is longer than 10 minutes"""
        return self.duration > 600
    
    def publish(self):
        """Publish the video by creating a Post"""
        from posts.models import Post, PostMedia
        
        # Allow publishing if status is ready, draft, or scheduled (when time comes)
        if self.status in ['ready', 'draft', 'scheduled'] and not self.published_at:
            self.status = 'published'
            self.published_at = timezone.now()
            self.is_public = True
            self.save()
            
            # Create a Post for the video
            post = Post.objects.create(
                user=self.user,
                text=self.description or "",
                published_at=timezone.now()
            )
            
            # Get captions for this video
            captions_data = []
            for caption in self.captions.all():
                captions_data.append({
                    'id': caption.id,
                    'start_time': float(caption.start_time),
                    'end_time': float(caption.end_time),
                    'text': caption.text,
                    'language': caption.language,
                    'confidence': float(caption.confidence) if caption.confidence else 0.9
                })
            
            # Create PostMedia with video and captions
            PostMedia.objects.create(
                post=post,
                file=self.video_file,
                media_type='video',
                captions=captions_data  # Store captions as JSON
            )
            
            return post
        return None


class Caption(models.Model):
    """Video captions with timestamps"""
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='captions')
    
    # Caption data
    language = models.CharField(max_length=10, help_text="Language code (en, ml, etc.)")
    start_time = models.FloatField(help_text="Start time in seconds")
    end_time = models.FloatField(help_text="End time in seconds")
    text = models.TextField()
    
    # Processing info
    confidence = models.FloatField(default=0.0, help_text="AI confidence score 0-1")
    is_translated = models.BooleanField(default=False)
    original_text = models.TextField(blank=True, null=True, help_text="Original text if translated")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['video', 'start_time']
        indexes = [
            models.Index(fields=['video', 'start_time']),
            models.Index(fields=['video', 'language']),
        ]
    
    def __str__(self):
        return f"Caption for {self.video.title} ({self.start_time}s - {self.end_time}s)"


class CaptionProcessingJob(models.Model):
    """Track caption generation jobs"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='caption_jobs')
    
    # Job details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0, help_text="Progress percentage 0-100")
    
    # Processing info
    chunk_index = models.IntegerField(default=0, help_text="For long videos, which chunk")
    total_chunks = models.IntegerField(default=1)
    
    # Language settings
    source_language = models.CharField(max_length=10, blank=True, null=True)
    target_language = models.CharField(max_length=10, blank=True, null=True)
    
    # Results
    captions_generated = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Caption job for {self.video.title} - {self.status}"


class ThumbnailOption(models.Model):
    """AI-generated thumbnail options"""
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='thumbnail_options')
    
    # Thumbnail data
    image = models.ImageField(upload_to='thumbnail_options/%Y/%m/', blank=True, null=True)
    template = models.CharField(max_length=50)
    frame_timestamp = models.FloatField(help_text="Video timestamp of the frame")
    
    # AI analysis
    has_face = models.BooleanField(default=False)
    emotion_detected = models.CharField(max_length=50, blank=True, null=True)
    quality_score = models.FloatField(default=0.0, help_text="AI quality score 0-1")
    
    # Overlay text
    overlay_text = models.CharField(max_length=100, blank=True, null=True)
    
    # Selection
    is_selected = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-quality_score', '-created_at']
    
    def __str__(self):
        return f"Thumbnail for {self.video.title} - {self.template}"


class VideoLike(models.Model):
    """Video likes"""
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('video', 'user')


class VideoComment(models.Model):
    """Video comments"""
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='replies')
    
    text = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.video.title}"
