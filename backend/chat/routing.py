from django.urls import re_path
from . import consumers as chat_consumers
from notifications import consumers as notif_consumers
from posts import consumers as post_consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<thread_id>\d+)/$', chat_consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/notifications/(?P<user_id>\d+)/$', notif_consumers.NotificationConsumer.as_asgi()),
    re_path(r'ws/posts/(?P<post_id>\d+)/$', post_consumers.PostConsumer.as_asgi()),
    re_path(r'ws/signal/(?P<room_name>\w+)/$', chat_consumers.SignalingConsumer.as_asgi()),
]
