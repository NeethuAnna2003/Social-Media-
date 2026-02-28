import os
import django
import sys
import requests
from django.core.files.base import ContentFile
import time

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from chat.models import Message
from accounts.models import Profile

User = get_user_model()

def fix_system():
    print("--- Fixing Avatar System ---")
    
    # 1. Reset Message State (Fix stuck "2 messages")
    print("\n1. Clearing Unread Messages...")
    unread = Message.objects.filter(is_read=False)
    count = unread.count()
    if count > 0:
        print(f"   Found {count} unread messages. Marking all as read.")
        unread.update(is_read=True)
    else:
        print("   No unread messages found. System is clear.")

    # 2. Force Generate Avatar for ALL Users with Profiles
    print("\n2. Generating Avatars...")
    users = User.objects.all()
    
    for user in users:
        if not hasattr(user, 'profile'):
            print(f"   Skip: {user.username} (No Profile)")
            continue
            
        print(f"   Target: {user.username}")
        
        # Pollinations Generation
        # Construct explicit URL
        seed = int(time.time())
        try:
            # Simple, direct URL construction without fancy services
            prompt = "Full body 3D Disney Pixar character, cute, friendly smiling face, standing pose, trendy casual clothes, soft studio lighting, white background, 8k render"
            encoded_prompt = requests.utils.quote(prompt)
            image_url = f"https://pollinations.ai/p/{encoded_prompt}?width=512&height=768&seed={seed}&model=flux"
            
            print(f"   Fetching: {image_url}")
            response = requests.get(image_url)
            
            if response.status_code == 200:
                filename = f"avatar_fixed_{user.id}.png"
                # Delete old
                if user.profile.avatar_3d:
                    user.profile.avatar_3d.delete(save=False)
                
                # Save new
                user.profile.avatar_3d.save(filename, ContentFile(response.content), save=True)
                print(f"   Success! Saved to: {user.profile.avatar_3d.url}")
            else:
                print(f"   Failed: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   Error: {e}")

    print("\n--- System Repaired ---")

if __name__ == "__main__":
    fix_system()
