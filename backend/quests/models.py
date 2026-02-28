from django.db import models
from django.conf import settings
from django.utils import timezone

class Quest(models.Model):
    CATEGORY_CHOICES = [
        ('fitness', 'Fitness'),
        ('travel', 'Travel'),
        ('learning', 'Learning'),
        ('photography', 'Photography'),
        ('mental-health', 'Mental Health'),
        ('music', 'Music'),
        ('productivity', 'Productivity'),
        ('social', 'Social'),
        ('other', 'Other'),
    ]

    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
    ]

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='easy')
    xp_reward = models.IntegerField(default=50)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='daily')
    icon = models.CharField(max_length=50, default='star', help_text="Tailwind/Heroicon name")
    is_active = models.BooleanField(default=True)
    
    # Custom User Quests
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='created_quests')
    is_custom = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.xp_reward} XP)"


class UserQuest(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_quests')
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Proof of completion
    proof_media = models.FileField(upload_to='quest_proofs/', blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    is_daily_challenge = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'quest', 'created_at') # Logic might need refinement for recurring quests (e.g. check date)

    def __str__(self):
        return f"{self.user} - {self.quest.title} ({self.status})"


class Badge(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon_url = models.CharField(max_length=255, help_text="URL or Icon Name")
    xp_threshold = models.IntegerField(default=0, help_text="XP needed to unlock automatically (optional)")
    category = models.CharField(max_length=50, blank=True, null=True) # Badge for specific category?

    def __str__(self):
        return self.name

class UserBadge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')
