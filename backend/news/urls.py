from django.urls import path
from . import views

urlpatterns = [
    path('track/', views.TrackNewsView.as_view(), name='news-track'),
    path('fetch-content/', views.FetchContentView.as_view(), name='fetch-content'),
    path('comments/', views.NewsCommentView.as_view(), name='news-comments'),
    path('vote/', views.NewsVoteView.as_view(), name='news-vote'),
    # Article-specific endpoints
    path('<str:article_id>/comments/', views.NewsCommentView.as_view(), name='article-comments'),
    path('<str:article_id>/comments/<int:comment_id>/vote/', views.NewsVoteView.as_view(), name='comment-vote'),
]
