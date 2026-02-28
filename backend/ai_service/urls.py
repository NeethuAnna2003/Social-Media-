from django.urls import path
from .views import (
    ToxicityAnalysisView, 
    SentimentAnalysisView, 
    GenerateCaptionView, 
    GenerateHashtagsView,
    TrendingNewsView,
    DailyNewsSummaryView,
    ArticleSummaryView,
    DiscussionQuestionsView,
    CommentQualityView
)

urlpatterns = [
    path('toxicity/', ToxicityAnalysisView.as_view(), name='ai-toxicity'),
    path('sentiment/', SentimentAnalysisView.as_view(), name='ai-sentiment'),
    path('generate-caption/', GenerateCaptionView.as_view(), name='ai-caption'),
    path('generate-hashtags/', GenerateHashtagsView.as_view(), name='ai-hashtags'),
    path('trending-news/', TrendingNewsView.as_view(), name='ai-news'),
    path('news-summary/', DailyNewsSummaryView.as_view(), name='ai-news-summary'),
    
    # AI Summary endpoints for busy professionals
    path('summarize-news/', ArticleSummaryView.as_view(), name='ai-summarize-news'),
    path('discussion-questions/', DiscussionQuestionsView.as_view(), name='ai-discussion-questions'),
    path('analyze-comment/', CommentQualityView.as_view(), name='ai-analyze-comment'),
]

