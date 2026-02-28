import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser
from companion.services import AvatarGenerationService

def regenerate_avatar():
    try:
        # Get the admin user
        user = CustomUser.objects.get(username='admin')
        print(f"Found user: {user.username}")
        
        # Generate new avatar with transparent background
        service = AvatarGenerationService()
        result = service.generate_avatar(user)
        
        if result:
            print(f"SUCCESS! Avatar generated and saved to: {user.avatar_3d.url}")
            print(f"Full path: {user.avatar_3d.path}")
            print("\nNow refresh your browser to see the new avatar with transparent background!")
        else:
            print("FAILED: Avatar generation returned False")
            
    except CustomUser.DoesNotExist:
        print("ERROR: User 'admin' not found")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    regenerate_avatar()
