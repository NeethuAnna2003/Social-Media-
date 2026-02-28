from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model

from .models import Profile, UserFollowing

User = get_user_model()


class ProfileInline(admin.StackedInline):
    """Inline admin for the Profile model."""
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'
    fk_name = 'user'
    fields = ('bio', 'profile_pic', 'interests')


class CustomUserAdmin(UserAdmin):
    """Custom User Admin configuration."""
    inlines = (ProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)
    
    # Add form and add_fieldsets to include our custom fields
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )
    
    # Fields to be used in the User model detail view
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'email', 'date_of_birth', 'phone_number')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    
    def get_inline_instances(self, request, obj=None):
        if not obj:
            return []
        return super().get_inline_instances(request, obj)


class UserFollowingAdmin(admin.ModelAdmin):
    """Admin configuration for UserFollowing model."""
    list_display = ('user', 'following_user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'following_user__username')
    raw_id_fields = ('user', 'following_user')
    # date_hierarchy = 'created_at'
    
    def get_queryset(self, request):
        """Optimize database queries."""
        return super().get_queryset(request).select_related('user', 'following_user')


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """Admin configuration for Profile model."""
    list_display = ('user', 'created_at', 'updated_at')
    search_fields = ('user__username', 'bio', 'interests')
    list_filter = ('created_at', 'updated_at')
    raw_id_fields = ('user',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


# Register our custom User model with its admin
admin.site.register(User, CustomUserAdmin)
admin.site.register(UserFollowing, UserFollowingAdmin)
