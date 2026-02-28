import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
from companion.services import AvatarGenerationService

try:
    # Get the latest user with a non-empty profile pic
    users = User.objects.filter(profile__profile_pic__isnull=False).exclude(profile__profile_pic='')
    if not users.exists():
        print("No user with profile pic found.")
        exit()
        
    user = users.last() # Latest user
    print(f"Testing avatar gen for user: {user.username} (ID: {user.id})")
    
    # Check if file actually exists
    if not user.profile.profile_pic:
        print("Profile pic descriptor is falsey")
        exit()
        
    try:
        print(f"Profile Pic Path: {user.profile.profile_pic.path}")
    except Exception as e:
        print(f"Error accessing path: {e}")
        # Force continue to test service error handling?
        # exit()
    
    service = AvatarGenerationService()
    result = service.generate_avatar(user.profile)
    print(f"Result: {result}")

except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
    import traceback
    traceback.print_exc()
