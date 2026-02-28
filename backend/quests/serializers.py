from rest_framework import serializers
from .models import Quest, UserQuest, Badge, UserBadge
from accounts.models import CustomUser

class QuestSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = Quest
        fields = ['id', 'title', 'description', 'category', 'xp_reward', 'frequency', 'icon', 'status']

    def get_status(self, obj):
        # Check if the current user has an active instance of this quest
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Simple logic: check if accepted recently
            # Ideally filter by date for daily quests
            uq = UserQuest.objects.filter(user=request.user, quest=obj, status__in=['active', 'completed']).order_by('-created_at').first()
            if uq:
                return uq.status
        return 'available'

class UserQuestSerializer(serializers.ModelSerializer):
    quest = QuestSerializer(read_only=True)
    
    class Meta:
        model = UserQuest
        fields = ['id', 'user', 'quest', 'status', 'proof_media', 'completed_at', 'created_at']
        read_only_fields = ['user', 'status', 'completed_at', 'created_at']

class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = '__all__'

class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)
    class Meta:
        model = UserBadge
        fields = ['id', 'user', 'badge', 'earned_at']
