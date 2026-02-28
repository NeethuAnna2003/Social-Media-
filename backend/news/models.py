from django.db import models
from django.conf import settings

class NewsArticle(models.Model):
    url = models.URLField(unique=True, max_length=500)
    title = models.CharField(max_length=500)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    source_name = models.CharField(max_length=100, blank=True)
    topic = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title[:50]

class NewsComment(models.Model):
    # Classification Choices
    CLASS_INFORMATIVE = 'informative'
    CLASS_OPINION = 'opinion'
    CLASS_QUESTION = 'question'
    CLASS_LOW_VALUE = 'low_value' # Noise
    CLASSIFICATION_CHOICES = [
        (CLASS_INFORMATIVE, 'Informative'),
        (CLASS_OPINION, 'Opinion'),
        (CLASS_QUESTION, 'Question'),
        (CLASS_LOW_VALUE, 'Low Value'),
    ]

    SENTIMENT_CHOICES = [
        ('positive', 'Positive'),
        ('neutral', 'Neutral'),
        ('negative', 'Negative'),
    ]

    article = models.ForeignKey(NewsArticle, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', null=True, blank=True, related_name='replies', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    
    # AI Metadata
    sentiment = models.CharField(max_length=20, choices=SENTIMENT_CHOICES, default='neutral')
    classification = models.CharField(max_length=20, choices=CLASSIFICATION_CHOICES, default=CLASS_OPINION)
    confidence_score = models.FloatField(default=0.0) # AI confidence
    
    # Safety
    is_toxic = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False) # Soft hide
    
    # Engagement
    upvotes = models.IntegerField(default=0)
    downvotes = models.IntegerField(default=0)
    score = models.IntegerField(default=0) # Computed
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        self.score = self.upvotes - self.downvotes
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Comment by {self.user} on {self.article}"

class NewsCommentVote(models.Model):
    VOTE_UP = 1
    VOTE_DOWN = -1
    CHOICES = ((VOTE_UP, 'Upvote'), (VOTE_DOWN, 'Downvote'))
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    comment = models.ForeignKey(NewsComment, on_delete=models.CASCADE, related_name='votes')
    value = models.IntegerField(choices=CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'comment')

class UserNewsInterest(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='news_interests')
    topic = models.CharField(max_length=100)
    view_count = models.IntegerField(default=0)
    time_spent_seconds = models.IntegerField(default=0)
    last_interaction = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'topic')
        ordering = ['-view_count']

    def __str__(self):
        return f"{self.user} - {self.topic}"
