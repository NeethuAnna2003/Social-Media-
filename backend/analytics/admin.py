from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.db.models import Count, F, Q
from django.contrib import messages
from django.urls import reverse
from django.utils.safestring import mark_safe

from .models import (
    Hashtag, HashtagUsage, UserInteraction, 
    UserRecommendation, TrendingHashtag, UserEngagement
)


@admin.register(Hashtag)
class HashtagAdmin(admin.ModelAdmin):
    """Admin interface for managing hashtags."""
    list_display = ('name', 'usage_count', 'last_used', 'created_at')
    search_fields = ('name',)
    list_filter = ('created_at',)
    readonly_fields = ('slug', 'usage_count', 'last_used', 'created_at')
    # date_hierarchy = 'created_at'
    ordering = ('-usage_count', '-last_used')
    



@admin.register(HashtagUsage)
class HashtagUsageAdmin(admin.ModelAdmin):
    """Admin interface for hashtag usage tracking."""
    list_display = ('hashtag', 'user', 'content_type', 'content_object_link', 'created_at')
    list_filter = ('content_type', 'created_at')
    search_fields = ('hashtag__name', 'user__username')
    # date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)
    
    def content_object_link(self, obj):
        """Create a link to the content object."""
        if obj.content_type and obj.content_id:
            try:
                model = obj.content_type.model_class()
                obj = model.objects.get(pk=obj.content_id)
                url = reverse(f'admin:{obj._meta.app_label}_{obj._meta.model_name}_change', args=[obj.pk])
                return format_html('<a href="{}">{}</a>', url, str(obj))
            except:
                return "-"
        return "-"
    content_object_link.short_description = 'Content Object'
    content_object_link.allow_tags = True


@admin.register(UserInteraction)
class UserInteractionAdmin(admin.ModelAdmin):
    """Admin interface for user interactions."""
    list_display = ('from_user', 'interaction_type', 'to_user', 'content_type', 'created_at')
    list_filter = ('interaction_type', 'content_type', 'created_at')
    search_fields = ('from_user__username', 'to_user__username')
    # date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)
    raw_id_fields = ('from_user', 'to_user')


@admin.register(UserRecommendation)
class UserRecommendationAdmin(admin.ModelAdmin):
    """Admin interface for user recommendations."""
    list_display = ('user', 'recommended_user', 'score', 'reason', 'updated_at')
    list_filter = ('updated_at',)
    search_fields = ('user__username', 'recommended_user__username', 'reason')
    # date_hierarchy = 'updated_at'
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'recommended_user')
    list_select_related = ('user', 'recommended_user')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'recommended_user')


@admin.register(TrendingHashtag)
class TrendingHashtagAdmin(admin.ModelAdmin):
    """Admin interface for trending hashtags."""
    list_display = ('hashtag', 'time_window', 'rank', 'score', 'calculated_at')
    list_filter = ('time_window', 'calculated_at')
    search_fields = ('hashtag__name',)
    # date_hierarchy = 'calculated_at'
    readonly_fields = ('calculated_at',)
    list_select_related = ('hashtag',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('hashtag')


@admin.register(UserEngagement)
class UserEngagementAdmin(admin.ModelAdmin):
    """Admin interface for user engagement metrics."""
    list_display = (
        'user', 'post_count', 'story_count', 'like_count', 
        'comment_count', 'follower_count', 'engagement_rate', 'last_updated'
    )
    list_filter = ('last_updated',)
    search_fields = ('user__username',)
    readonly_fields = (
        'post_count', 'story_count', 'like_count', 'comment_count',
        'follower_count', 'following_count', 'engagement_rate', 'last_updated'
    )
    # date_hierarchy = 'last_updated'
    list_select_related = ('user',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    def update_metrics(self, request, queryset):
        """Action to update engagement metrics for selected users."""
        updated = 0
        for engagement in queryset:
            engagement.update_metrics()
            updated += 1
        
        self.message_user(
            request,
            f'Successfully updated metrics for {updated} users.',
            messages.SUCCESS
        )
    
    update_metrics.short_description = 'Update selected users\' engagement metrics'
    actions = [update_metrics]
