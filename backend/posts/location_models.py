"""
Models for Image Location Detection Feature
"""
from django.db import models
from django.conf import settings


class ImageLocationCache(models.Model):
    """
    Cache for detected image locations to avoid reprocessing.
    Stores location data extracted from image analysis.
    """
    image_hash = models.CharField(
        max_length=64, 
        unique=True, 
        db_index=True,
        help_text="SHA-256 hash of the image file"
    )
    
    # Location Data
    landmark = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=255, blank=True, null=True)
    country = models.CharField(max_length=255, blank=True, null=True)
    
    # Confidence Scores (0-100)
    landmark_confidence = models.FloatField(default=0.0)
    city_confidence = models.FloatField(default=0.0)
    country_confidence = models.FloatField(default=0.0)
    
    # Best detected location (based on fallback order: landmark → city → country)
    detected_location = models.CharField(
        max_length=512, 
        blank=True, 
        null=True,
        help_text="Formatted location string (e.g., 'Eiffel Tower, France')"
    )
    overall_confidence = models.FloatField(
        default=0.0,
        help_text="Confidence of the best detected location"
    )
    
    # Metadata
    raw_response = models.JSONField(
        blank=True, 
        null=True,
        help_text="Raw API response for debugging"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'image_location_cache'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['image_hash']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Location: {self.detected_location or 'Not detected'} ({self.overall_confidence}%)"


class PostLocation(models.Model):
    """
    Links posts to detected locations.
    Allows tracking which posts have location data.
    """
    post = models.OneToOneField(
        'posts.Post',
        on_delete=models.CASCADE,
        related_name='location_data'
    )
    
    location_cache = models.ForeignKey(
        ImageLocationCache,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posts'
    )
    
    # Quick access fields (denormalized for performance)
    display_location = models.CharField(
        max_length=512,
        blank=True,
        null=True,
        help_text="Formatted location for display (e.g., '📍 Eiffel Tower, France')"
    )
    
    is_detected = models.BooleanField(
        default=False,
        help_text="Whether location was successfully detected"
    )
    
    detection_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
            ('no_location', 'No Location Detected'),
        ],
        default='pending'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'post_locations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Location for Post {self.post_id}: {self.display_location or 'None'}"
