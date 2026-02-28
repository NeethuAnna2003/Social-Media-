from django.urls import path
from .views import (
    FriendRecommendationListView, TrendingHashtagsView,
    FollowUserView, UnfollowUserView, RespondToFollowRequestView,
    InterestMatchView
)

urlpatterns = [
    path('discover/interests/', InterestMatchView.as_view(), name='discover-interests'),
    path('recommendations/', FriendRecommendationListView.as_view(), name='friend-recommendations'),
    path('trending/', TrendingHashtagsView.as_view(), name='trending-hashtags'),
    path('follow/', FollowUserView.as_view(), name='follow-user'),
    path('follow/respond/', RespondToFollowRequestView.as_view(), name='follow-respond'),
    path('unfollow/', UnfollowUserView.as_view(), name='unfollow-user'),
]
