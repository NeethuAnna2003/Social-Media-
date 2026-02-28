from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class CustomUser(AbstractUser):
    """Custom User model that extends the default User model."""
    email = models.EmailField(_('email address'), unique=True)
    phone_number = models.CharField(_('phone number'), max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(_('date of birth'), null=True, blank=True)
    is_admin = models.BooleanField(default=False)
    
    def __str__(self):
        return self.username

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')


class Profile(models.Model):
    """Extended user profile information."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    bio = models.TextField(_('bio'), blank=True, null=True)
    profile_pic = models.ImageField(
        _('profile picture'),
        upload_to='profile_pics/',
        blank=True,
        null=True
    )
    cover_photo = models.ImageField(
        _('cover photo'),
        upload_to='profile_covers/',
        blank=True,
        null=True
    )
    avatar_3d = models.ImageField(
        _('3D avatar'),
        upload_to='avatars/3d/',
        blank=True,
        null=True
    )
    gender = models.CharField(
        _('gender'),
        max_length=10,
        blank=True,
        null=True,
        choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')]
    )
    location = models.CharField(_('location'), max_length=100, blank=True, null=True)
    website = models.URLField(_('website'), max_length=200, blank=True, null=True)
    profession = models.CharField(_('profession'), max_length=100, blank=True, null=True)
    preferred_language = models.CharField(_('preferred language'), max_length=10, default='en')
    social_links = models.JSONField(_('social links'), default=dict, blank=True)
    
    interests = models.TextField(_('interests'), blank=True, null=True)
    is_private = models.BooleanField(_('private account'), default=False)
    
    # RPG / Gamification
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    streak_count = models.IntegerField(default=0)
    last_quest_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


class UserFollowing(models.Model):
    """Model to track who follows whom."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='following',
        on_delete=models.CASCADE
    )
    following_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='followers',
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'following_user'],
                name='unique_followers'
            ),
            models.CheckConstraint(
                check=~models.Q(user=models.F('following_user')),
                name='no_self_follow'
            )
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} follows {self.following_user}"

class FollowRequest(models.Model):
    """Model to store pending follow requests for private accounts."""
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='sent_follow_requests',
        on_delete=models.CASCADE
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='received_follow_requests',
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['from_user', 'to_user'],
                name='unique_follow_request'
            ),
            models.CheckConstraint(
                check=~models.Q(from_user=models.F('to_user')),
                name='no_self_follow_request'
            )
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.from_user} requested to follow {self.to_user}"
