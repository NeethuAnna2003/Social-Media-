"""
Django Admin Configuration for Videos
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Video, Caption, CaptionProcessingJob,
    ThumbnailOption, VideoLike, VideoComment
)


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    """Admin interface for videos"""
    
    list_display = [
        'id', 'title', 'user', 'status_badge', 'duration_display',
        'views_count', 'likes_count', 'comments_count',
        'created_at', 'published_at'
    ]
    list_filter = ['status', 'caption_enabled', 'is_public', 'created_at']
    search_fields = ['title', 'description', 'user__username']
    readonly_fields = [
        'duration', 'file_size', 'views_count', 'likes_count',
        'comments_count', 'created_at', 'updated_at', 'published_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'description', 'video_file', 'thumbnail')
        }),
        ('Video Metadata', {
            'fields': ('duration', 'file_size', 'status', 'processing_progress', 'error_message')
        }),
        ('Caption Settings', {
            'fields': (
                'caption_enabled', 'original_language', 'caption_language_mode',
                'translation_language'
            )
        }),
        ('Thumbnail Settings', {
            'fields': ('thumbnail_template', 'thumbnail_text', 'custom_thumbnail')
        }),
        ('Engagement', {
            'fields': ('views_count', 'likes_count', 'comments_count')
        }),
        ('Publishing', {
            'fields': ('is_public', 'scheduled_for', 'published_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        """Display status with color badge"""
        colors = {
            'uploading': 'gray',
            'processing': 'blue',
            'ready': 'green',
            'failed': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.status.upper()
        )
    status_badge.short_description = 'Status'
    
    def duration_display(self, obj):
        """Display duration in readable format"""
        if obj.duration:
            minutes = obj.duration // 60
            seconds = obj.duration % 60
            return f"{minutes}:{seconds:02d}"
        return "N/A"
    duration_display.short_description = 'Duration'


@admin.register(Caption)
class CaptionAdmin(admin.ModelAdmin):
    """Admin interface for captions"""
    
    list_display = [
        'id', 'video', 'language', 'time_range',
        'text_preview', 'is_translated', 'confidence'
    ]
    list_filter = ['language', 'is_translated', 'created_at']
    search_fields = ['text', 'video__title']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Caption Info', {
            'fields': ('video', 'language', 'start_time', 'end_time', 'text')
        }),
        ('Translation', {
            'fields': ('is_translated', 'original_text')
        }),
        ('Quality', {
            'fields': ('confidence',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def time_range(self, obj):
        """Display time range"""
        return f"{obj.start_time:.1f}s - {obj.end_time:.1f}s"
    time_range.short_description = 'Time'
    
    def text_preview(self, obj):
        """Display text preview"""
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Text'


@admin.register(CaptionProcessingJob)
class CaptionProcessingJobAdmin(admin.ModelAdmin):
    """Admin interface for caption processing jobs"""
    
    list_display = [
        'id', 'video', 'status_badge', 'progress_bar',
        'captions_generated', 'created_at', 'completed_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['video__title']
    readonly_fields = ['created_at', 'started_at', 'completed_at']
    
    fieldsets = (
        ('Job Info', {
            'fields': ('video', 'status', 'progress')
        }),
        ('Processing', {
            'fields': ('chunk_index', 'total_chunks', 'source_language', 'target_language')
        }),
        ('Results', {
            'fields': ('captions_generated', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        """Display status with color badge"""
        colors = {
            'pending': 'gray',
            'processing': 'blue',
            'completed': 'green',
            'failed': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.status.upper()
        )
    status_badge.short_description = 'Status'
    
    def progress_bar(self, obj):
        """Display progress bar"""
        return format_html(
            '<div style="width: 100px; background-color: #f0f0f0; border-radius: 3px;">'
            '<div style="width: {}%; background-color: #4CAF50; height: 20px; border-radius: 3px; text-align: center; color: white;">{}</div>'
            '</div>',
            obj.progress,
            f'{obj.progress}%'
        )
    progress_bar.short_description = 'Progress'


@admin.register(ThumbnailOption)
class ThumbnailOptionAdmin(admin.ModelAdmin):
    """Admin interface for thumbnail options"""
    
    list_display = [
        'id', 'video', 'template', 'thumbnail_preview',
        'quality_score', 'has_face', 'is_selected', 'created_at'
    ]
    list_filter = ['template', 'has_face', 'is_selected', 'created_at']
    search_fields = ['video__title', 'overlay_text']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Thumbnail Info', {
            'fields': ('video', 'image', 'template', 'frame_timestamp')
        }),
        ('AI Analysis', {
            'fields': ('has_face', 'emotion_detected', 'quality_score')
        }),
        ('Overlay', {
            'fields': ('overlay_text',)
        }),
        ('Selection', {
            'fields': ('is_selected',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def thumbnail_preview(self, obj):
        """Display thumbnail preview"""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 100px; max-height: 60px;" />',
                obj.image.url
            )
        return "No image"
    thumbnail_preview.short_description = 'Preview'


@admin.register(VideoLike)
class VideoLikeAdmin(admin.ModelAdmin):
    """Admin interface for video likes"""
    
    list_display = ['id', 'video', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['video__title', 'user__username']
    readonly_fields = ['created_at']


@admin.register(VideoComment)
class VideoCommentAdmin(admin.ModelAdmin):
    """Admin interface for video comments"""
    
    list_display = [
        'id', 'video', 'user', 'text_preview',
        'parent', 'created_at'
    ]
    list_filter = ['created_at']
    search_fields = ['text', 'video__title', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Comment Info', {
            'fields': ('video', 'user', 'text', 'parent')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def text_preview(self, obj):
        """Display text preview"""
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Comment'
