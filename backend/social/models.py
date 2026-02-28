from django.db import models
from django.conf import settings
from django.utils import timezone


class Follow(models.Model):
    """Model to track user following relationships."""
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='following_set',
        on_delete=models.CASCADE
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='followers_set',
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['follower', 'following'],
                name='unique_following'
            ),
            models.CheckConstraint(
                check=~models.Q(follower=models.F('following')),
                name='no_self_following'
            )
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.follower} follows {self.following}"
