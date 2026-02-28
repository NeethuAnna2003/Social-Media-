from django.db import models

class AISummaryCache(models.Model):
    article_url = models.URLField(unique=True, max_length=500)
    summary_data = models.JSONField()  # Stores the full JSON summary
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.article_url

class AIDiscussionCache(models.Model):
    article_url = models.URLField(unique=True, max_length=500)
    questions_data = models.JSONField()  # Stores the discussion questions JSON
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.article_url
