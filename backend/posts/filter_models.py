"""
Models for User-Controlled Comment Word Filter Feature
"""
from django.db import models
from django.conf import settings


class ProhibitedWordRequest(models.Model):
    """
    User requests to add prohibited words to their profile.
    Admin must approve before words become active filters.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='word_requests',
        help_text="User requesting the word filter"
    )
    
    requested_words = models.TextField(
        help_text="Comma-separated list of words/phrases to prohibit"
    )
    
    reason = models.TextField(
        blank=True,
        null=True,
        help_text="User's reason for requesting these filters"
    )
    
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Admin response
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Admin's notes/reason for approval or rejection"
    )
    
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_word_requests',
        help_text="Admin who reviewed this request"
    )
    
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prohibited_word_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"Request by {self.user.username} - {self.status}"


class ProhibitedWord(models.Model):
    """
    Approved prohibited words for a specific user's profile.
    Comments containing these words are filtered.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='prohibited_words',
        help_text="User who owns this word filter"
    )
    
    word = models.CharField(
        max_length=255,
        help_text="The prohibited word or phrase (stored in lowercase)"
    )
    
    # Variations to catch (e.g., plurals, common misspellings)
    variations = models.JSONField(
        default=list,
        blank=True,
        help_text="List of variations to also filter (e.g., ['fat', 'fatt', 'phatt'])"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this filter is currently active"
    )
    
    # Tracking
    request = models.ForeignKey(
        ProhibitedWordRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_words',
        help_text="Original request that created this word"
    )
    
    times_triggered = models.IntegerField(
        default=0,
        help_text="Number of times this word has filtered a comment"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prohibited_words'
        ordering = ['word']
        unique_together = [['user', 'word']]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['word']),
        ]
    
    def __str__(self):
        return f"{self.user.username}'s filter: {self.word}"


class FilteredComment(models.Model):
    """
    Tracks comments that have been filtered by prohibited words.
    Allows admin to view all filtered comments and analytics.
    """
    comment = models.OneToOneField(
        'posts.Comment',
        on_delete=models.CASCADE,
        related_name='filter_data'
    )
    
    post_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='filtered_comments_received',
        help_text="Owner of the post (who has the word filter)"
    )
    
    commenter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='filtered_comments_made',
        help_text="User who made the filtered comment"
    )
    
    matched_words = models.JSONField(
        default=list,
        help_text="List of prohibited words that matched in this comment"
    )
    
    is_visible_to_owner = models.BooleanField(
        default=False,
        help_text="Whether post owner can see this comment (always False for filtered comments)"
    )
    
    is_visible_to_public = models.BooleanField(
        default=True,
        help_text="Whether other users can see this comment (True - filtering is only for post owner)"
    )
    
    is_visible_to_commenter = models.BooleanField(
        default=True,
        help_text="Commenter can always see their own comment (with warning)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'filtered_comments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['post_owner', 'created_at']),
            models.Index(fields=['commenter', 'created_at']),
        ]
    
    def __str__(self):
        return f"Filtered comment by {self.commenter.username} on {self.post_owner.username}'s post"
