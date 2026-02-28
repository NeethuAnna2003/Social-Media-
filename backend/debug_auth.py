import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model

User = get_user_model()
username = 'Neethu1'
password = 'password123'

print(f"--- TESTING AUTHENTICATION for {username} ---")

# 1. Check User direct existence
try:
    user = User.objects.get(username=username)
    print(f"User exists in DB. ID: {user.id}, Password Hash: {user.password[:20]}...")
except User.DoesNotExist:
    print("User DOES NOT EXIST in DB!")
    exit(1)

# 2. Test authenticate() function
auth_user = authenticate(username=username, password=password)
if auth_user:
    print("SUCCESS: authenticate() returned user.")
else:
    print("FAILURE: authenticate() returned None.")
    
    # Debug why
    if not user.check_password(password):
        print(" -> Password Match Failed.")
    elif not user.is_active:
        print(" -> User is not active.")
    else:
        print(" -> Unknown reason (maybe Backends issue).")

# 3. Print Backends
print(f"Configured Backends: {settings.AUTHENTICATION_BACKENDS}")
