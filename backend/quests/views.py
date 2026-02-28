from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, time
from .models import Quest, UserQuest, Badge, UserBadge
from .serializers import QuestSerializer, UserQuestSerializer, UserBadgeSerializer, BadgeSerializer
from accounts.models import Profile

from django.db.models import Q, Max

class DailyQuestsView(generics.ListAPIView):
    """
    Returns the user's daily quest list for today.
    If empty, it means the user hasn't set their goals yet.
    """
    serializer_class = QuestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        
        # Get the very latest daily quest created (part of the latest batch)
        latest_uq = UserQuest.objects.filter(
            user=user,
            is_daily_challenge=True
        ).order_by('-created_at').first()
        
        if not latest_uq:
             return Quest.objects.none()
             
        # Get all quests generated around the same time (the "Batch")
        # This avoids date boundary issues if the batch crosses midnight or timezone mismatches
        # Generates are practically instantaneous, so +/- 60 seconds is plenty safe
        min_time = latest_uq.created_at - timezone.timedelta(seconds=60)
        max_time = latest_uq.created_at + timezone.timedelta(seconds=60)
        
        existing_daily_quests = UserQuest.objects.filter(
            user=user,
            is_daily_challenge=True,
            created_at__range=(min_time, max_time)
        )
        
        if existing_daily_quests.exists():
            quest_ids = existing_daily_quests.values_list('quest_id', flat=True)
            return Quest.objects.filter(id__in=quest_ids)
            
        return Quest.objects.none()

class GenerateDailyQuestsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        goals_text = request.data.get('goals', '')
        if not goals_text.strip():
            return Response({"detail": "Goals cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        today = timezone.now().date()

        # Check if already exists (double submit protection)
        if UserQuest.objects.filter(user=user, is_daily_challenge=True, created_at__date=today).exists():
             return Response({"detail": "Daily quests already generated."}, status=status.HTTP_400_BAD_REQUEST)

        # "AI" Processing (Simple Rule-Based for now)
        # Split by newlines or commas
        import re
        lines = re.split(r'[,\n]+', goals_text)
        
        quests_created = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Basic Formatting: Capitalize
            title = line[0].upper() + line[1:]
            
            # Create Custom Quest
            # We create a new Quest entry for this specific user goal
            quest = Quest.objects.create(
                title=title,
                description=f"Your personal goal: {title}",
                category='other', # could try to infer category later
                difficulty='medium',
                xp_reward=50, # Standard reward for custom goals
                is_custom=True,
                creator=user,
                frequency='daily'
            )
            
            # Create UserQuest
            UserQuest.objects.create(
                user=user,
                quest=quest,
                status='active',
                is_daily_challenge=True
            )
            quests_created.append(quest)

        # Return the created quests
        serializer = QuestSerializer(quests_created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class AcceptQuestView(APIView):
    # Deprecated for daily flow but kept for legacy/other flows
    permissions_classes = [permissions.IsAuthenticated]
    def post(self, request, pk):
         return Response({"detail": "Not used in new flow"}, status=status.HTTP_400_BAD_REQUEST)

class CompleteQuestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        quest = get_object_or_404(Quest, pk=pk)
        today = timezone.now().date()
        
        user_quest = UserQuest.objects.filter(
            user=request.user, 
            quest=quest
        ).first()

        if not user_quest:
             # Should exist if generated
             return Response({"detail": "Quest not found in your list."}, status=status.HTTP_404_NOT_FOUND)
        
        if user_quest.status == 'completed':
             return Response({"detail": "Already completed."}, status=status.HTTP_400_BAD_REQUEST)

        # Handle proof upload
        proof = request.FILES.get('proof')
        if not proof:
            return Response({"detail": "Proof is required (image/video)."}, status=status.HTTP_400_BAD_REQUEST)

        user_quest.proof_media = proof
        user_quest.status = 'completed'
        user_quest.completed_at = timezone.now()
        user_quest.save()

        # Check Daily Checklist Status
        daily_quests = UserQuest.objects.filter(
            user=request.user,
            is_daily_challenge=True,
            created_at__date=today
        )
        
        total_daily = daily_quests.count()
        completed_daily = daily_quests.filter(status='completed').count()
        
        xp_earned = 0
        message = "Quest completed! Keep going."
        
        if total_daily > 0 and completed_daily == total_daily:
            # All Done! Award XP + Streak
            base_xp = sum(uq.quest.xp_reward for uq in daily_quests)
            
            profile = request.user.profile
            
            if profile.last_quest_date == today - timezone.timedelta(days=1):
                profile.streak_count += 1
            elif profile.last_quest_date != today:
                 profile.streak_count = 1
            
            streak_bonus = profile.streak_count * 10
            total_earned = base_xp + streak_bonus
            
            profile.xp += total_earned
            profile.last_quest_date = today
            profile.level = 1 + (profile.xp // 1000)
            profile.save()
            
            xp_earned = total_earned
            message = f"Daily Challenge Complete! +{base_xp} XP + {streak_bonus} Streak Bonus!"

        # Check for Badge (First Step)
        completed_all_time = UserQuest.objects.filter(user=request.user, status='completed').count()
        if completed_all_time == 1:
            badge, _ = Badge.objects.get_or_create(
                name="First Step", 
                defaults={"description": "Completed your first quest!", "icon_url": "trophy", "xp_threshold": 0}
            )
            UserBadge.objects.get_or_create(user=request.user, badge=badge)

        return Response({
            "detail": message, 
            "xp_earned": xp_earned,
            "status": "completed",
            "streak": request.user.profile.streak_count
        }, status=status.HTTP_200_OK)

class UserBadgesView(generics.ListAPIView):
    serializer_class = UserBadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserBadge.objects.filter(user=self.request.user)

from stories.models import Story
from .utils import generate_story_image
from django.core.files.base import ContentFile

class ShareDailyStoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Find the latest date any daily quest was completed
        latest = UserQuest.objects.filter(
            user=user, 
            is_daily_challenge=True, 
            status='completed'
        ).aggregate(Max('completed_at'))
        
        last_completed_time = latest.get('completed_at__max')
        
        if not last_completed_time:
             return Response({"detail": "No completed quests found to share."}, status=status.HTTP_400_BAD_REQUEST)
             
        # Convert to local time to ensure we get the correct 'day' as seen by the user/server settings
        local_last = timezone.localtime(last_completed_time)
        target_date = local_last.date()
        
        # Create simpler range filter
        start = timezone.make_aware(datetime.combine(target_date, time.min))
        end = timezone.make_aware(datetime.combine(target_date, time.max))
        
        # Get completed quests for that specific date range
        completed_quests = UserQuest.objects.filter(
            user=user,
            is_daily_challenge=True,
            status='completed',
            completed_at__range=(start, end)
        ).select_related('quest')
        
        if not completed_quests.exists():
             return Response({"detail": "No completed quests to share today."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate Image
        try:
            image_content = generate_story_image(user, completed_quests)
        except Exception as e:
            print(f"Image Gen Error: {e}")
            return Response({"detail": "Failed to generate story image."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        # Create Story
        caption_text = f"Conquered my daily quests for {target_date.strftime('%B %d')}! 🚀🔥 #DailyGrind"
        story = Story.objects.create(
            user=user,
            caption=caption_text,
            media_type='image'
        )
        
        # Save image to story
        story.media.save(f"daily_quest_{user.id}_{target_date}.jpg", image_content)
        story.save()
        
        return Response({
            "detail": "Story shared successfully!",
            "story_id": story.id,
            "image_url": story.media.url
        }, status=status.HTTP_201_CREATED)
