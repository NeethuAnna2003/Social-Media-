from django.urls import path
from .views import CompanionInsightsView, AvatarGenerationView

urlpatterns = [
    path('insights/', CompanionInsightsView.as_view(), name='companion-insights'),
    path('generate/', AvatarGenerationView.as_view(), name='companion-generate'),
]
