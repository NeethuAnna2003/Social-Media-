from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count
from .models import ChatThread, Message
from .serializers import ChatThreadSerializer, MessageSerializer
from accounts.models import CustomUser as User

class ThreadListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatThreadSerializer
    pagination_class = None

    def get_queryset(self):
        return self.request.user.chat_threads.all().order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        # Check if thread exists with target user
        target_user_id = request.data.get('target_user_id')
        if not target_user_id:
            return Response({"error": "Target User ID required"}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, id=target_user_id)
        
        # Privacy Check for DM
        # If target user is private, requestor must be following them to start a chat? 
        # Or maybe if they follow each other? 
        # Typically: You can't DM a private account unless they follow you back or you follow them (depends).
        # Let's start with: If private, you must be following them to initiate.
        
        if hasattr(target_user, 'profile') and target_user.profile.is_private:
            # Check if request.user is following target_user
            from accounts.models import UserFollowing
            if not UserFollowing.objects.filter(user=request.user, following_user=target_user).exists():
                 return Response({"error": "You cannot message this private account unless you follow them."}, status=status.HTTP_403_FORBIDDEN)
        
        # Check for existing thread with exactly these 2 participants
        # We find threads where the user is a participant
        threads = ChatThread.objects.filter(participants=request.user).filter(participants=target_user)
        
        if threads.exists():
            thread = threads.first()
            return Response(ChatThreadSerializer(thread, context={'request': request}).data, status=status.HTTP_200_OK)
            
        # Create new
        thread = ChatThread.objects.create()
        thread.participants.add(request.user, target_user)
        return Response(ChatThreadSerializer(thread, context={'request': request}).data, status=status.HTTP_201_CREATED)

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class MessageListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = None

    def get_queryset(self):
        thread_id = self.kwargs['pk']
        # Check permission: User must be participant
        thread = get_object_or_404(ChatThread, id=thread_id)
        if self.request.user not in thread.participants.all():
            return Message.objects.none()
            
        return Message.objects.filter(thread=thread).order_by('created_at')

    def perform_create(self, serializer):
        thread_id = self.kwargs['pk']
        thread = get_object_or_404(ChatThread, id=thread_id)
        
        if self.request.user not in thread.participants.all():
            raise permissions.PermissionDenied("Not a participant")
            
        # AI Auto-moderation
        text = serializer.validated_data.get('text', '')
        is_toxic, score = check_toxicity(text)
        
        message = serializer.save(sender=self.request.user, thread=thread, is_toxic=is_toxic)
        
        # Update thread timestamp
        thread.save()
        
        # WebSocket Broadcast
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{thread_id}',
            {
                'type': 'chat_message',
                'message': MessageSerializer(message, context={'request': self.request}).data
            }
        )
        
        # Send Notification to other participants
        from notifications.models import Notification
        
        others = thread.participants.exclude(id=self.request.user.id)
        for other in others:
            # Create DB Notification
            notif = Notification.objects.create(
                recipient=other,
                actor=self.request.user,
                message=f"New message from {self.request.user.username}",
                notification_type='message',
                related_id=thread.id
            )
            # Send WS Notification
            async_to_sync(channel_layer.group_send)(
                f'notifications_{other.id}',
                {
                    'type': 'send_notification',
                    'notification': {
                        'id': notif.id,
                        'message': notif.message,
                        'actor': self.request.user.username,
                        'type': 'message',
                        'related_id': thread.id
                    }
                }
            )

class MessageCreateView(generics.CreateAPIView):
    """
    Create message with media uploads (images, videos, audio)
    Used for file uploads via multipart/form-data
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer
    
    def create(self, request, *args, **kwargs):
        thread_id = request.data.get('thread_id')
        if not thread_id:
            return Response({"error": "thread_id required"}, status=status.HTTP_400_BAD_REQUEST)
        
        thread = get_object_or_404(ChatThread, id=thread_id)
        
        # Check if user is participant
        if request.user not in thread.participants.all():
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get text content
        text = request.data.get('text', '')
        
        # Check toxicity
        is_toxic = False
        if text:
            is_toxic, score = check_toxicity(text)
        
        # Create message with media
        message = Message.objects.create(
            thread=thread,
            sender=request.user,
            text=text,
            image=request.FILES.get('image'),
            video=request.FILES.get('video'),
            audio=request.FILES.get('audio'),
            is_toxic=is_toxic,
            status='sent'
        )
        
        # Add metadata for audio files
        if message.audio:
            # Generate simple waveform data (30 bars)
            import random
            waveform = [random.uniform(0.3, 0.9) for _ in range(30)]
            message.metadata = {
                'audio_duration': 0,  # Will be calculated client-side
                'waveform_data': waveform
            }
            message.save(update_fields=['metadata'])
            print(f"Voice message created: ID={message.id}, size={message.audio.size}")
        
        # Update thread timestamp
        thread.save()
        
        # WebSocket Broadcast
        channel_layer = get_channel_layer()
        serialized_message = MessageSerializer(message, context={'request': request}).data
        
        print(f"Broadcasting message: ID={message.id}, has_audio={bool(message.audio)}")
        
        async_to_sync(channel_layer.group_send)(
            f'chat_{thread_id}',
            {
                'type': 'chat_message',
                'message': serialized_message
            }
        )
        
        # Send notifications to other participants
        from notifications.models import Notification
        
        others = thread.participants.exclude(id=request.user.id)
        for other in others:
            notif = Notification.objects.create(
                recipient=other,
                actor=request.user,
                message=f"New message from {request.user.username}",
                notification_type='message',
                related_id=thread.id
            )
            async_to_sync(channel_layer.group_send)(
                f'notifications_{other.id}',
                {
                    'type': 'send_notification',
                    'notification': {
                        'id': notif.id,
                        'message': notif.message,
                        'actor': request.user.username,
                        'type': 'message',
                        'related_id': thread.id
                    }
                }
            )
        
        return Response(serialized_message, status=status.HTTP_201_CREATED)


from .models import MessageReaction
from .serializers import MessageReactionSerializer
from .ai_utils import check_toxicity, suggest_smart_replies, summarize_chat, translate_text

class MessageReactionCreateView(generics.CreateAPIView):
    serializer_class = MessageReactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        message_id = self.kwargs['pk']
        message = get_object_or_404(Message, id=message_id)
        # Check if user part of thread?
        if self.request.user not in message.thread.participants.all():
             raise permissions.PermissionDenied("Not a participant")
        
        reaction = serializer.save(user=self.request.user, message=message)
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{message.thread.id}',
            {
                'type': 'chat_message',
                'message': MessageSerializer(message, context={'request': self.request}).data
            }
        )
        
        # Notify message sender (if it's not the reactor themselves)
        if message.sender.id != self.request.user.id:
            from notifications.models import Notification
            
            notif_msg = f"{self.request.user.username} reacted {reaction.emoji} to your message"
            notif = Notification.objects.create(
                recipient=message.sender,
                actor=self.request.user,
                message=notif_msg,
                notification_type='reaction',
                related_id=message.thread.id
            )
            
            async_to_sync(channel_layer.group_send)(
                f'notifications_{message.sender.id}',
                {
                    'type': 'send_notification',
                    'notification': {
                        'id': notif.id,
                        'message': notif.message,
                        'actor': self.request.user.username,
                        'type': 'reaction',
                        'related_id': message.thread.id
                    }
                }
            )


class SmartReplyView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        thread = get_object_or_404(ChatThread, id=pk)
        if request.user not in thread.participants.all():
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        # Get last few messages
        last_messages = thread.messages.order_by('-created_at')[:5]
        # Construct history string (simplified)
        history = [m.text for m in last_messages if m.text]
        
        suggestions = suggest_smart_replies(history)
        return Response(suggestions)

class ChatSummaryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        thread = get_object_or_404(ChatThread, id=pk)
        if request.user not in thread.participants.all():
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        messages = thread.messages.all()
        text_content = " ".join([m.text for m in messages if m.text])
        
        summary = summarize_chat(text_content)
        return Response({"summary": summary})

class TranslateMessageView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        message = get_object_or_404(Message, id=pk)
        # Check access
        if request.user not in message.thread.participants.all():
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        target_lang = request.data.get('lang', request.user.profile.preferred_language)
        translated_text = translate_text(message.text, target_lang)
        
        return Response({"translated_text": translated_text})
