from django.contrib import admin
from .models import Quest, UserQuest, Badge, UserBadge

@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'difficulty', 'xp_reward', 'frequency', 'is_active')
    list_filter = ('category', 'difficulty', 'frequency', 'is_active')
    search_fields = ('title', 'description')

@admin.register(UserQuest)
class UserQuestAdmin(admin.ModelAdmin):
    list_display = ('user', 'quest', 'status', 'completed_at')
    list_filter = ('status',)
    search_fields = ('user__username', 'quest__title')

@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('name', 'xp_threshold', 'category')
    search_fields = ('name',)

@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'badge', 'earned_at')
    search_fields = ('user__username', 'badge__name')
