from django.urls import path
from . import views

urlpatterns = [
    path('feed/', views.StoryFeedView.as_view(), name='story-feed'),
    path('create/', views.CreateStoryView.as_view(), name='story-create'),
    path('<int:pk>/view/', views.TrackStoryView.as_view(), name='story-view'),
    path('<int:pk>/like/', views.LikeStoryView.as_view(), name='story-like'),
    path('<int:pk>/', views.DeleteStoryView.as_view(), name='story-delete'),
    path('user/<int:user_id>/', views.UserStoriesView.as_view(), name='user-stories'),
    path('<int:pk>/highlight/', views.ToggleStoryHighlightView.as_view(), name='story-highlight'),
]
