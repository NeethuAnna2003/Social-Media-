"""
Enhanced Chat Models for Real-Time Messaging
Supports: Text, Voice, Image, Video, WebRTC Calls
"""

from django.db import models
from django.conf import settings
from django.utils import timezone


class ChatThread(models.Model):
    """
    Represents a conversation between two or more users.
    For Direct Messaging, typically 2 users.
    """
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='chat_threads'
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Thread metadata
    is_archived = models.BooleanField(default=False)
    is_muted = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Thread {self.id}"
    
    def get_other_participant(self, user):
        """Get the other participant in a 1-on-1 chat"""
        return self.participants.exclude(id=user.id).first()
    
    def get_unread_count(self, user):
        """Get unread message count for a specific user"""
        return self.messages.filter(
            is_read=False
        ).exclude(sender=user).count()


class Message(models.Model):
    """
    A single message in a conversation.
    Supports text, images, videos, and audio (voice messages).
    """
    
    STATUS_CHOICES = [
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]
    
    thread = models.ForeignKey(
        ChatThread, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    
    # Message content
    text = models.TextField(blank=True)
    image = models.ImageField(upload_to='chat/images/', blank=True, null=True)
    video = models.FileField(upload_to='chat/videos/', blank=True, null=True)
    audio = models.FileField(upload_to='chat/audio/', blank=True, null=True)
    
    # Message metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sending')
    is_toxic = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Advanced features
    reply_to = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='replies'
    )
    
    # JSON field for flexible metadata (audio duration, image dimensions, etc.)
    metadata = models.JSONField(default=dict, blank=True)
    # Example metadata:
    # {
    #     "audio_duration": 30,  # seconds
    #     "image_width": 1920,
    #     "image_height": 1080,
    #     "video_duration": 120,
    #     "file_size": 1024000,  # bytes
    #     "waveform_data": [0.2, 0.5, 0.8, ...]  # for audio visualization
    # }

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['thread', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Message {self.id} from {self.sender}"
    
    def mark_as_delivered(self):
        """Mark message as delivered"""
        if self.status == 'sent':
            self.status = 'delivered'
            self.delivered_at = timezone.now()
            self.save(update_fields=['status', 'delivered_at'])
    
    def mark_as_read(self):
        """Mark message as read"""
        if self.status in ['sent', 'delivered']:
            self.status = 'read'
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['status', 'is_read', 'read_at'])
    
    def soft_delete(self):
        """Soft delete message"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])


class MessageReaction(models.Model):
    """
    Emoji reactions to messages (like, love, laugh, etc.)
    """
    message = models.ForeignKey(
        Message, 
        related_name='reactions', 
        on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE
    )
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user', 'emoji')
        indexes = [
            models.Index(fields=['message', 'emoji']),
        ]

    def __str__(self):
        return f"{self.user} reacted {self.emoji} to Message {self.message.id}"


class CallSession(models.Model):
    """
    WebRTC call sessions (audio/video calls)
    """
    
    CALL_TYPE_CHOICES = [
        ('audio', 'Audio'),
        ('video', 'Video'),
    ]
    
    STATUS_CHOICES = [
        ('ringing', 'Ringing'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('missed', 'Missed'),
        ('rejected', 'Rejected'),
        ('failed', 'Failed'),
    ]
    
    thread = models.ForeignKey(
        ChatThread, 
        on_delete=models.CASCADE,
        related_name='calls'
    )
    caller = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        related_name='initiated_calls', 
        on_delete=models.CASCADE
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        related_name='received_calls', 
        on_delete=models.CASCADE
    )
    
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ringing')
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Call duration in seconds
    duration = models.IntegerField(default=0)
    
    # WebRTC session data
    session_data = models.JSONField(default=dict, blank=True)
    # Example: {"ice_servers": [...], "connection_quality": "good"}

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['thread', 'started_at']),
            models.Index(fields=['caller', 'started_at']),
            models.Index(fields=['receiver', 'started_at']),
        ]

    def __str__(self):
        return f"{self.call_type.title()} call from {self.caller} to {self.receiver}"
    
    def end_call(self):
        """End the call and calculate duration"""
        if self.status == 'active':
            self.status = 'ended'
            self.ended_at = timezone.now()
            if self.answered_at:
                self.duration = int((self.ended_at - self.answered_at).total_seconds())
            self.save(update_fields=['status', 'ended_at', 'duration'])


class TypingStatus(models.Model):
    """
    Real-time typing indicators
    """
    thread = models.ForeignKey(
        ChatThread, 
        on_delete=models.CASCADE,
        related_name='typing_statuses'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE
    )
    is_typing = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('thread', 'user')
        indexes = [
            models.Index(fields=['thread', 'is_typing']),
        ]

    def __str__(self):
        return f"{self.user} typing in Thread {self.thread.id}"


class UserPresence(models.Model):
    """
    User online/offline status
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='presence'
    )
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    
    # Device information
    device_info = models.JSONField(default=dict, blank=True)
    # Example: {"platform": "web", "browser": "Chrome", "version": "120.0"}
    
    # Active connections count (for multiple tabs/devices)
    active_connections = models.IntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['is_online', 'last_seen']),
        ]

    def __str__(self):
        status = "Online" if self.is_online else f"Last seen {self.last_seen}"
        return f"{self.user} - {status}"
    
    def go_online(self):
        """Mark user as online"""
        self.is_online = True
        self.active_connections += 1
        self.save(update_fields=['is_online', 'active_connections', 'last_seen'])
    
    def go_offline(self):
        """Mark user as offline"""
        self.active_connections = max(0, self.active_connections - 1)
        if self.active_connections == 0:
            self.is_online = False
        self.save(update_fields=['is_online', 'active_connections', 'last_seen'])


class MessageReadReceipt(models.Model):
    """
    Track individual read receipts for messages
    Useful for group chats to see who read what
    """
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='read_receipts'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')
        indexes = [
            models.Index(fields=['message', 'read_at']),
        ]

    def __str__(self):
        return f"{self.user} read Message {self.message.id}"
