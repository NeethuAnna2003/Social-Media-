
import os
import django
from django.utils import timezone
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from stories.models import Story
from accounts.models import UserFollowing

User = get_user_model()

def debug_stories():
    print("--- Debugging Stories Feed ---")
    users = User.objects.all()
    print(f"Total Users: {users.count()}")
    for u in users:
        print(f"User: {u.username} (ID: {u.id})")

    # Check relationships
    print("\n--- Checking Relationships ---")
    # Identify Meera1 and Sunshine1
    meera = User.objects.filter(username__icontains='Meera').first()
    sunshine = User.objects.filter(username__icontains='Sunshine').first()
    
    if not meera or not sunshine:
        print("Could not find Meera1 or Sunshine1")
        # List all follows anyway
        for f in UserFollowing.objects.all():
            print(f"{f.user.username} follows {f.following_user.username}")
    else:
        print(f"Meera: {meera.username}, Sunshine: {sunshine.username}")
        # Check if Meera follows Sunshine
        follows = UserFollowing.objects.filter(user=meera, following_user=sunshine).exists()
        print(f"Does {meera.username} follow {sunshine.username}? {follows}")
        
    # Check Stories
    print("\n--- Checking Active Stories ---")
    now = timezone.now()
    stories = Story.objects.all()
    for s in stories:
        is_active = s.expires_at > now
        print(f"Story {s.id} by {s.user.username}: Expires {s.expires_at} (Active: {is_active})")
        
    # Simulate Feed for Meera
    if meera:
        print(f"\n--- Simulating Feed for {meera.username} ---")
        following_ids = list(meera.following.values_list('following_user__id', flat=True))
        target_ids = [meera.id] + following_ids
        print(f"Target IDs: {target_ids}")
        
        feed_stories = Story.objects.filter(
            user__id__in=target_ids,
            expires_at__gt=now
        )
        print(f"Stories found in query: {feed_stories.count()}")
        for s in feed_stories:
            print(f" - Story {s.id} by {s.user.username}")

if __name__ == "__main__":
    debug_stories()
