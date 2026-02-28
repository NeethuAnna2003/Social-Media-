from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from urllib.parse import parse_qs
import jwt
from django.conf import settings

@database_sync_to_async
def get_user(token_key):
    User = get_user_model()
    try:
        UntypedToken(token_key)
    except (InvalidToken, TokenError) as e:
        return AnonymousUser()
    
    try:
        decoded_data = jwt.decode(token_key, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = decoded_data['user_id']
        return User.objects.get(id=user_id)
    except (User.DoesNotExist, jwt.DecodeError, KeyError):
        return AnonymousUser()

class JwtAuthMiddleware:
    """
    Custom middleware to authenticate users via JWT in WebSocket connections.
    Extracts token from query string: ws://...?token=<token>
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope['query_string'].decode())
        token = query_string.get('token')
        
        if token:
            token_key = token[0]
            scope['user'] = await get_user(token_key)
        else:
            scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)
