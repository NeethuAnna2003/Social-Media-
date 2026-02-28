from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from .models import Story


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    """Admin configuration for the Story model."""
    list_display = ('id', 'user_display', 'created_at', 'expires_at', 'is_expired_display', 'image_preview')
    list_filter = ('created_at', 'expires_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'expires_at', 'is_expired_display')
    # date_hierarchy = 'created_at'
    
    def user_display(self, obj):
        return obj.user.username
    user_display.short_description = 'User'
    user_display.admin_order_field = 'user__username'
    
    def is_expired_display(self, obj):
        return obj.is_expired
    is_expired_display.boolean = True
    is_expired_display.short_description = 'Expired'
    
    def image_preview(self, obj):
        if obj.media:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 50px;" />',
                obj.media.url
            )
        return "No Image"
    image_preview.short_description = 'Preview'
    
    def get_queryset(self, request):
        """Optimize database queries."""
        return super().get_queryset(request).select_related('user')
    
    def get_list_display_links(self, request, list_display):
        """Make the first column clickable."""
        return (list_display[0], 'image_preview')
    
    def get_actions(self, request):
        """Add custom action to delete expired stories."""
        actions = super().get_actions(request)
        
        def delete_expired(modeladmin, request, queryset):
            now = timezone.now()
            expired_stories = queryset.filter(expires_at__lte=now)
            count = expired_stories.count()
            expired_stories.delete()
            modeladmin.message_user(
                request,
                f'Successfully deleted {count} expired stories.',
                messages.SUCCESS
            )
        
        delete_expired.short_description = 'Delete selected expired stories'
        
        if 'delete_selected' not in actions:
            actions['delete_expired'] = (
                delete_expired,
                'delete_expired',
                delete_expired.short_description
            )
        return actions
