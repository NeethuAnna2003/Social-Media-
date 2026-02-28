from django.db import models
from django.conf import settings

class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='notifications', on_delete=models.CASCADE)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='notifications_created', on_delete=models.CASCADE)
    message = models.CharField(max_length=255)
    notification_type = models.CharField(max_length=50, choices=[
        ('message', 'Message'), 
        ('reaction', 'Reaction'),
        ('follow_request', 'Follow Request'),
        ('follow_accept', 'Follow Accept'),
        ('follow', 'New Follower')
    ])
    related_id = models.IntegerField(null=True, blank=True) # ID of the thread or message
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient}: {self.message}"
