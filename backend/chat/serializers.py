from rest_framework import serializers
from .models import ChatThread, Message, MessageReaction
from accounts.serializers import UserSerializer

class MessageReactionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'emoji', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    reactions = MessageReactionSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'thread', 'sender', 'text', 'image', 'video', 'audio',
            'status', 'is_toxic', 'is_read', 'is_edited', 'is_deleted',
            'created_at', 'delivered_at', 'read_at', 'edited_at',
            'reply_to', 'metadata', 'reactions'
        ]
        read_only_fields = ['sender', 'thread', 'created_at', 'is_read', 'is_toxic', 'reactions', 'status']
    
    def get_sender(self, obj):
        """Return sender information in the format expected by frontend"""
        return {
            'id': obj.sender.id,
            'username': obj.sender.username,
            'avatar': getattr(obj.sender, 'profile_picture', None) or (
                obj.sender.profile.profile_pic.url if hasattr(obj.sender, 'profile') and obj.sender.profile.profile_pic else None
            ),
            'profile_picture': getattr(obj.sender, 'profile_picture', None) or (
                obj.sender.profile.profile_pic.url if hasattr(obj.sender, 'profile') and obj.sender.profile.profile_pic else None
            )
        }

class ChatThreadSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()

    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = ['id', 'participants', 'last_message', 'other_participant', 'unread_count', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def get_other_participant(self, obj):
        # Identify the user who is NOT the request user
        request = self.context.get('request')
        if request and request.user:
            others = obj.participants.exclude(id=request.user.id)
            if others.exists():
                return UserSerializer(others.first(), context=self.context).data
        # Fallback if no request context or weird state
        return UserSerializer(obj.participants.first(), context=self.context).data
