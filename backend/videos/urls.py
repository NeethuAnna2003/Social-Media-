"""
URL Configuration for Videos API
Production-ready endpoints for AI caption and thumbnail system
"""

from django.urls import path
from . import views
from . import production_views
from .task_status_views import task_status_view

app_name = 'videos'

urlpatterns = [
    # Video CRUD
    path('upload/', production_views.VideoUploadView.as_view(), name='video-upload'),
    path('', production_views.VideoListView.as_view(), name='video-list'),
    path('<int:pk>/', production_views.VideoDetailView.as_view(), name='video-detail'),
    path('<int:pk>/publish/', production_views.VideoPublishView.as_view(), name='video-publish'),
    path('<int:pk>/status/', production_views.VideoProcessingStatusView.as_view(), name='video-status'),
    
    # Captions
    path('<int:pk>/captions/', production_views.VideoCaptionsView.as_view(), name='video-captions'),
    path('<int:pk>/detect-language/', production_views.DetectLanguageView.as_view(), name='detect-language'),
    path('<int:pk>/captions/generate/', production_views.GenerateCaptionsView.as_view(), name='generate-captions'),
    path('<int:pk>/captions/translate/', production_views.TranslateCaptionsView.as_view(), name='translate-captions'),
    path('captions/<int:pk>/', production_views.UpdateCaptionView.as_view(), name='update-caption'),
    path('captions/<int:pk>/delete/', production_views.DeleteCaptionView.as_view(), name='delete-caption'),
    
    # Thumbnails
    path('<int:pk>/thumbnails/', production_views.VideoThumbnailsView.as_view(), name='video-thumbnails'),
    path('<int:pk>/thumbnails/generate/', production_views.GenerateThumbnailsView.as_view(), name='generate-thumbnails'),
    path('<int:pk>/thumbnails/select/', production_views.SelectThumbnailView.as_view(), name='select-thumbnail'),
    
    # Task Status
    path('tasks/<str:task_id>/status/', task_status_view, name='task-status'),
    
    # Engagement
    path('<int:pk>/like/', production_views.VideoLikeView.as_view(), name='video-like'),
    path('<int:pk>/comments/', production_views.VideoCommentsView.as_view(), name='video-comments'),
]
