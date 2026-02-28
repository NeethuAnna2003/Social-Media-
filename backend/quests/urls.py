from django.urls import path
from .views import DailyQuestsView, AcceptQuestView, CompleteQuestView, UserBadgesView, GenerateDailyQuestsView, ShareDailyStoryView

urlpatterns = [
    path('daily/', DailyQuestsView.as_view(), name='daily-quests'),
    path('generate/', GenerateDailyQuestsView.as_view(), name='generate-quests'),
    path('<int:pk>/accept/', AcceptQuestView.as_view(), name='accept-quest'),
    path('<int:pk>/complete/', CompleteQuestView.as_view(), name='complete-quest'),
    path('daily/share/', ShareDailyStoryView.as_view(), name='share-daily-story'),
    path('badges/', UserBadgesView.as_view(), name='user-badges'),
]
