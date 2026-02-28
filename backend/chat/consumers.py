"""
Enhanced WebSocket Consumers for Real-Time Messaging
Supports: Text, Media, Typing Indicators, Read Receipts, WebRTC Signaling
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Enhanced WebSocket consumer for real-time chat
    Handles: messages, typing, read receipts, presence
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        # Initialize attributes first to prevent AttributeError in disconnect
        self.user = self.scope.get('user')
        self.thread_id = None
        self.room_group_name = None
        self.user_group_name = None
        
        # Reject unauthenticated connections
        if not self.user or not self.user.is_authenticated:
            logger.warning("WebSocket connection rejected: User not authenticated")
            await self.close()
            return
        
        # Set thread and group names
        self.thread_id = self.scope['url_route']['kwargs']['thread_id']
        self.room_group_name = f'chat_{self.thread_id}'
        self.user_group_name = f'user_{self.user.id}'
        
        # Verify user is participant in this thread
        is_participant = await self.verify_participant()
        if not is_participant:
            logger.warning(f"User {self.user.username} not authorized for thread {self.thread_id}")
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Join user-specific group (for direct messages to this user)
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Mark user as online
        await self.update_presence(True)
        
        # Notify others that user is online
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_online': True,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        logger.info(f"User {self.user.username} connected to thread {self.thread_id}")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Only proceed if connection was properly established
        if not hasattr(self, 'user') or not self.user or not self.user.is_authenticated:
            return
        
        if not self.room_group_name or not self.user_group_name:
            return
        
        # Mark user as offline
        await self.update_presence(False)
        
        # Notify others that user is offline
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_online': False,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Leave user group
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )
        
        logger.info(f"User {self.user.username} disconnected from thread {self.thread_id}")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # Route to appropriate handler
            handlers = {
                'send_message': self.handle_send_message,
                'typing': self.handle_typing,
                'mark_read': self.handle_mark_read,
                'mark_delivered': self.handle_mark_delivered,
                'delete_message': self.handle_delete_message,
                'edit_message': self.handle_edit_message,
                'react': self.handle_react,
            }
            
            handler = handlers.get(message_type)
            if handler:
                await handler(data.get('data', {}))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received: {text_data}")
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))
    
    async def handle_send_message(self, data):
        """Handle sending a new message"""
        text = data.get('text', '').strip()
        reply_to_id = data.get('reply_to')
        metadata = data.get('metadata', {})
        
        if not text:
            return
        
        # Create message in database
        message = await self.create_message(text, reply_to_id, metadata)
        
        if message:
            # Broadcast to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': await self.serialize_message(message)
                }
            )
    
    async def handle_typing(self, data):
        """Handle typing indicator"""
        is_typing = data.get('is_typing', False)
        
        # Update typing status in database
        await self.update_typing_status(is_typing)
        
        # Broadcast to others in room (exclude sender)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': is_typing,
                'sender_channel': self.channel_name
            }
        )
    
    async def handle_mark_read(self, data):
        """Handle marking messages as read"""
        message_ids = data.get('message_ids', [])
        
        if not message_ids:
            return
        
        # Mark messages as read in database
        updated_messages = await self.mark_messages_read(message_ids)
        
        # Notify sender about read receipts
        for msg_data in updated_messages:
            await self.channel_layer.group_send(
                f"user_{msg_data['sender_id']}",
                {
                    'type': 'read_receipt',
                    'message_id': msg_data['id'],
                    'read_by': self.user.id,
                    'read_by_username': self.user.username,
                    'read_at': msg_data['read_at']
                }
            )
    
    async def handle_mark_delivered(self, data):
        """Handle marking messages as delivered"""
        message_ids = data.get('message_ids', [])
        
        if not message_ids:
            return
        
        # Mark messages as delivered
        await self.mark_messages_delivered(message_ids)
    
    async def handle_delete_message(self, data):
        """Handle message deletion"""
        message_id = data.get('message_id')
        
        if not message_id:
            return
        
        # Soft delete message
        success = await self.delete_message(message_id)
        
        if success:
            # Broadcast deletion to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_deleted',
                    'message_id': message_id,
                    'deleted_by': self.user.id
                }
            )
    
    async def handle_edit_message(self, data):
        """Handle message editing"""
        message_id = data.get('message_id')
        new_text = data.get('text', '').strip()
        
        if not message_id or not new_text:
            return
        
        # Edit message
        message = await self.edit_message(message_id, new_text)
        
        if message:
            # Broadcast edit to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_edited',
                    'message': await self.serialize_message(message)
                }
            )
    
    async def handle_react(self, data):
        """Handle message reaction"""
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        
        if not message_id or not emoji:
            return
        
        # Add/remove reaction
        reaction = await self.toggle_reaction(message_id, emoji)
        
        # Broadcast reaction to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_reaction',
                'message_id': message_id,
                'user_id': self.user.id,
                'username': self.user.username,
                'emoji': emoji,
                'action': 'added' if reaction else 'removed'
            }
        )
    
    # ============================================
    # Channel Layer Event Handlers
    # ============================================
    
    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message_received',
            'data': event['message']
        }))
    
    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket (exclude sender)"""
        if event.get('sender_channel') != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_typing',
                'data': {
                    'user_id': event['user_id'],
                    'username': event['username'],
                    'is_typing': event['is_typing']
                }
            }))
    
    async def read_receipt(self, event):
        """Send read receipt to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'data': {
                'message_id': event['message_id'],
                'read_by': event['read_by'],
                'read_by_username': event['read_by_username'],
                'read_at': event['read_at']
            }
        }))
    
    async def presence_update(self, event):
        """Send presence update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'presence_update',
            'data': {
                'user_id': event['user_id'],
                'username': event['username'],
                'is_online': event['is_online'],
                'timestamp': event['timestamp']
            }
        }))
    
    async def message_deleted(self, event):
        """Send message deletion notification"""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'data': {
                'message_id': event['message_id'],
                'deleted_by': event['deleted_by']
            }
        }))
    
    async def message_edited(self, event):
        """Send message edit notification"""
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'data': event['message']
        }))
    
    async def message_reaction(self, event):
        """Send reaction notification"""
        await self.send(text_data=json.dumps({
            'type': 'message_reaction',
            'data': {
                'message_id': event['message_id'],
                'user_id': event['user_id'],
                'username': event['username'],
                'emoji': event['emoji'],
                'action': event['action']
            }
        }))
    
    # ============================================
    # Database Operations (async wrappers)
    # ============================================
    
    @database_sync_to_async
    def verify_participant(self):
        """Verify user is participant in thread"""
        from .models import ChatThread
        try:
            thread = ChatThread.objects.get(id=self.thread_id)
            return thread.participants.filter(id=self.user.id).exists()
        except ChatThread.DoesNotExist:
            return False
    
    @database_sync_to_async
    def create_message(self, text, reply_to_id, metadata):
        """Create new message in database"""
        from .models import ChatThread, Message
        try:
            thread = ChatThread.objects.get(id=self.thread_id)
            message = Message.objects.create(
                thread=thread,
                sender=self.user,
                text=text,
                reply_to_id=reply_to_id,
                metadata=metadata,
                status='sent'
            )
            return message
        except Exception as e:
            logger.error(f"Error creating message: {str(e)}")
            return None
    
    @database_sync_to_async
    def serialize_message(self, message):
        """Serialize message for JSON response"""
        return {
            'id': message.id,
            'sender': {
                'id': message.sender.id,
                'username': message.sender.username,
                'avatar': getattr(message.sender, 'avatar', None) or getattr(message.sender, 'profile_picture', None)
            },
            'text': message.text,
            'image': message.image.url if message.image else None,
            'video': message.video.url if message.video else None,
            'audio': message.audio.url if message.audio else None,
            'status': message.status,
            'is_read': message.is_read,
            'is_edited': message.is_edited,
            'created_at': message.created_at.isoformat(),
            'edited_at': message.edited_at.isoformat() if message.edited_at else None,
            'reply_to': message.reply_to_id,
            'metadata': message.metadata
        }
    
    @database_sync_to_async
    def update_typing_status(self, is_typing):
        """Update typing status in database"""
        from .models import TypingStatus, ChatThread
        try:
            thread = ChatThread.objects.get(id=self.thread_id)
            TypingStatus.objects.update_or_create(
                thread=thread,
                user=self.user,
                defaults={'is_typing': is_typing}
            )
        except Exception as e:
            logger.error(f"Error updating typing status: {str(e)}")
    
    @database_sync_to_async
    def update_presence(self, is_online):
        """Update user presence"""
        from .models import UserPresence
        try:
            # Only update presence for authenticated users
            if not self.user or not self.user.is_authenticated:
                return
            
            presence, created = UserPresence.objects.get_or_create(user=self.user)
            if is_online:
                presence.go_online()
            else:
                presence.go_offline()
        except Exception as e:
            logger.error(f"Error updating presence: {str(e)}")
    
    @database_sync_to_async
    def mark_messages_read(self, message_ids):
        """Mark multiple messages as read"""
        from .models import Message
        try:
            messages = Message.objects.filter(
                id__in=message_ids,
                thread_id=self.thread_id
            ).exclude(sender=self.user)
            
            updated = []
            for msg in messages:
                msg.mark_as_read()
                updated.append({
                    'id': msg.id,
                    'sender_id': msg.sender_id,
                    'read_at': msg.read_at.isoformat()
                })
            return updated
        except Exception as e:
            logger.error(f"Error marking messages read: {str(e)}")
            return []
    
    @database_sync_to_async
    def mark_messages_delivered(self, message_ids):
        """Mark multiple messages as delivered"""
        from .models import Message
        try:
            messages = Message.objects.filter(
                id__in=message_ids,
                thread_id=self.thread_id,
                status='sent'
            ).exclude(sender=self.user)
            
            for msg in messages:
                msg.mark_as_delivered()
        except Exception as e:
            logger.error(f"Error marking messages delivered: {str(e)}")
    
    @database_sync_to_async
    def delete_message(self, message_id):
        """Soft delete a message"""
        from .models import Message
        try:
            message = Message.objects.get(
                id=message_id,
                thread_id=self.thread_id,
                sender=self.user
            )
            message.soft_delete()
            return True
        except Message.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Error deleting message: {str(e)}")
            return False
    
    @database_sync_to_async
    def edit_message(self, message_id, new_text):
        """Edit a message"""
        from .models import Message
        try:
            message = Message.objects.get(
                id=message_id,
                thread_id=self.thread_id,
                sender=self.user
            )
            message.text = new_text
            message.is_edited = True
            message.edited_at = timezone.now()
            message.save(update_fields=['text', 'is_edited', 'edited_at'])
            return message
        except Message.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Error editing message: {str(e)}")
            return None
    
    @database_sync_to_async
    def toggle_reaction(self, message_id, emoji):
        """Add or remove reaction"""
        from .models import Message, MessageReaction
        try:
            message = Message.objects.get(id=message_id, thread_id=self.thread_id)
            reaction, created = MessageReaction.objects.get_or_create(
                message=message,
                user=self.user,
                emoji=emoji
            )
            if not created:
                reaction.delete()
                return None
            return reaction
        except Exception as e:
            logger.error(f"Error toggling reaction: {str(e)}")
            return None


class SignalingConsumer(AsyncWebsocketConsumer):
    """
    WebRTC signaling server for audio/video calls
    Handles: offer, answer, ICE candidates
    """
    
    async def connect(self):
        """Handle WebSocket connection for signaling"""
        self.user = self.scope['user']
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'signal_{self.room_name}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        
        logger.info(f"User {self.user.username} connected to signaling room {self.room_name}")
    
    async def disconnect(self, close_code):
        """Handle disconnection"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Notify others about disconnection
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'peer_disconnected',
                'user_id': self.user.id,
                'sender_channel_name': self.channel_name
            }
        )
        
        logger.info(f"User {self.user.username} disconnected from signaling room {self.room_name}")
    
    async def receive(self, text_data):
        """Handle incoming signaling messages"""
        try:
            data = json.loads(text_data)
            signal_type = data.get('type')
            
            # Broadcast to other peer(s)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_signal',
                    'signal_type': signal_type,
                    'data': data,
                    'sender_id': self.user.id,
                    'sender_channel_name': self.channel_name
                }
            )
            
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in signaling: {text_data}")
        except Exception as e:
            logger.error(f"Error in signaling receive: {str(e)}")
    
    async def webrtc_signal(self, event):
        """Forward WebRTC signal to peer (exclude sender)"""
        if self.channel_name == event['sender_channel_name']:
            return
        
        await self.send(text_data=json.dumps({
            'type': event['signal_type'],
            'data': event['data'],
            'sender_id': event['sender_id']
        }))
    
    async def peer_disconnected(self, event):
        """Notify about peer disconnection"""
        if self.channel_name == event['sender_channel_name']:
            return
        
        await self.send(text_data=json.dumps({
            'type': 'peer_disconnected',
            'user_id': event['user_id']
        }))
