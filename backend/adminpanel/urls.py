from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminOverviewView,
    AdminUserViewSet,
    AdminPostViewSet,
    AdminReportView,
    AdminAnalyticsView
)

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-users')
router.register(r'posts', AdminPostViewSet, basename='admin-posts')

urlpatterns = [
    path('overview/', AdminOverviewView.as_view(), name='admin-overview'),
    path('reports/', AdminReportView.as_view(), name='admin-reports'),
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('', include(router.urls)),
]
