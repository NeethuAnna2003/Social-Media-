"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from .views import health_check, HomeView, favicon_view

urlpatterns = [
    # Root URL
    path('', HomeView.as_view(), name='home'),
    path('favicon.ico', favicon_view),
    
    # Admin site
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/health/', health_check, name='health_check'),
    
    # JWT Authentication
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # App URLs
    path('api/accounts/', include('accounts.urls')),
    path('api/posts/', include('posts.urls')),
    path('api/stories/', include('stories.urls')),
    path('api/social/', include('social.urls')),
    path('api/admin/', include('adminpanel.urls')),
    path('api/adminpanel/', include('adminpanel.urls')),
    path('api/ai/', include('ai_service.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/news/', include('news.urls')),
    path('api/quests/', include('quests.urls')),
    path('api/videos/', include('videos.urls')),  # AI Video Posting System
    # path('api/avatar/', include('companion.urls')),  # Avatar feature removed
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
