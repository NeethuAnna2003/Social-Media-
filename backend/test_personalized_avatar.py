import os
import django
import sys

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from companion.services import AvatarGenerationService

User = get_user_model()

def test_personalized_generation():
    print("=== Testing Personalized Avatar Generation ===\n")
    
    # Get a user with a profile photo
    users = User.objects.filter(profile__profile_pic__isnull=False)
    
    if not users.exists():
        print("No users with profile photos found!")
        print("Please upload a profile photo first.")
        return
    
    user = users.first()
    print(f"Testing with user: {user.username}")
    print(f"Profile photo: {user.profile.profile_pic.path if user.profile.profile_pic else 'None'}")
    
    # Generate avatar
    service = AvatarGenerationService()
    result = service.generate_avatar(user.profile)
    
    print(f"\nResult: {result}")
    
    if "success" in result:
        print(f"\nSuccess! Avatar URL: {result['url']}")
        print("\nNow refresh your browser and you should see:")
        print("1. The robot emoji disappear")
        print("2. A 3D character that matches your profile photo")
        print("3. Wave animation on entry")
        print("4. Sitting animation when scrolling")
    else:
        print(f"\nError: {result.get('error')}")

if __name__ == "__main__":
    test_personalized_generation()
