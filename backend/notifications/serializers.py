from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.ReadOnlyField(source='actor.username')
    actor_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'message', 'notification_type', 'related_id', 'is_read', 'created_at', 'actor_name', 'actor_id', 'actor_avatar']

    def get_actor_avatar(self, obj):
        # Return simplified avatar for now or use profile
        if hasattr(obj.actor, 'profile') and obj.actor.profile.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.actor.profile.profile_pic.url)
        return None
