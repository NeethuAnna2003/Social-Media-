from django.urls import path
from . import views

urlpatterns = [
    path('threads/', views.ThreadListCreateView.as_view(), name='thread-list'),
    path('threads/<int:pk>/messages/', views.MessageListCreateView.as_view(), name='message-list'),
    path('messages/', views.MessageCreateView.as_view(), name='message-create'),  # NEW: For media uploads
    path('messages/<int:pk>/react/', views.MessageReactionCreateView.as_view(), name='message-react'),
    path('threads/<int:pk>/suggest_replies/', views.SmartReplyView.as_view(), name='smart-replies'),
    path('threads/<int:pk>/summarize/', views.ChatSummaryView.as_view(), name='chat-summary'),
    path('messages/<int:pk>/translate/', views.TranslateMessageView.as_view(), name='message-translate'),
]
