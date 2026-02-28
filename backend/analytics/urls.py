from django.urls import path
from .views import (
    TrendingHashtagListView,
    UserDashboardAnalyticsView,
    SystemAdminDashboardView,
    UserSuggestionsView
)

urlpatterns = [
    path('trending/hashtags/', TrendingHashtagListView.as_view(), name='trending-hashtags'),
    path('trending-hashtags/', TrendingHashtagListView.as_view(), name='trending-hashtags-alt'),  # Alternative URL to match frontend
    path('dashboard/', UserDashboardAnalyticsView.as_view(), name='user-dashboard-analytics'),
    path('admin-dashboard/', SystemAdminDashboardView.as_view(), name='admin-dashboard-analytics'),
    path('suggestions/', UserSuggestionsView.as_view(), name='user-suggestions'),
]
