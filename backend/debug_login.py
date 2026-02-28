import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

email = 'neethuannaboby@gmail.com'
username_guess = 'neethu' # Common guess, but we will search by email

print(f"--- DEBUGGING USER: {email} ---")

try:
    user = User.objects.get(email=email)
    print(f"User FOUND: ID={user.id}, Username='{user.username}', Email='{user.email}'")
    print(f"Is Active: {user.is_active}")
    print(f"Is Superuser: {user.is_superuser}")
    
    # Force reset password
    new_pass = "password123"
    user.set_password(new_pass)
    user.save()
    print(f"\n[SUCCESS] Password has been hard-reset to: '{new_pass}'")
    print("Please try logging in with this password now.")
    
except User.DoesNotExist:
    print(f"[ERROR] No user found with email '{email}'")
    print("Listing all users:")
    for u in User.objects.all():
        print(f" - {u.username} ({u.email})")

except Exception as e:
    print(f"[CRITICAL ERROR] {e}")
