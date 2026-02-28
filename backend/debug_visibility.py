import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from posts.models import Post
from social.models import Follow

User = get_user_model()

# Change this to the username you are testing
target_username = 'Sunshine1' 
# Change this to the username of the viewer (or None if testing anonymous)
viewer_username = 'Neethu1' 

print(f"--- DEBUGGING POST VISIBILITY for target: {target_username} ---")

try:
    target_user = User.objects.get(username=target_username)
    print(f"Target User Found: {target_user} (ID: {target_user.id})")
    
    # Check Profile Privacy
    is_private = False
    if hasattr(target_user, 'profile'):
        is_private = target_user.profile.is_private
        print(f"Profile Privacy: {'PRIVATE' if is_private else 'PUBLIC'}")
    else:
        print("Profile: Missing (Defaulting to Public)")

    # Check Post Count
    posts = Post.objects.filter(user=target_user)
    print(f"Total Posts in DB: {posts.count()}")
    for p in posts:
        print(f" - Post {p.id}: {p.created_at} (Image: {p.image})")

    # Check Viewer
    if viewer_username:
        try:
            viewer = User.objects.get(username=viewer_username)
            print(f"\nViewer: {viewer} (ID: {viewer.id})")
            
            # Check Follow Status
            viewer_follows = Follow.objects.filter(follower=viewer, following=target_user).exists()
            owner_follows = Follow.objects.filter(follower=target_user, following=viewer).exists()
            
            print(f"Viewer follows Target: {viewer_follows}")
            print(f"Target follows Viewer: {owner_follows}")
            
            if is_private:
                can_see = viewer_follows and owner_follows
                print(f"Can View (Mutual Required): {can_see}")
            else:
                print("Can View: YES (Public)")
                
        except User.DoesNotExist:
            print(f"Viewer {viewer_username} not found")

except User.DoesNotExist:
    print(f"Target user {target_username} not found")
