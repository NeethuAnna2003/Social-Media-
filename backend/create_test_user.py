#!/usr/bin/env python
"""
Script to create a test user for development
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser

def create_test_user():
    """Create a test user if it doesn't exist"""
    
    # Test user credentials
    username = 'testuser'
    email = 'test@connectify.com'
    password = 'Test@123'
    
    # Check if user already exists
    if CustomUser.objects.filter(username=username).exists():
        print(f"[OK] Test user '{username}' already exists!")
        user = CustomUser.objects.get(username=username)
    else:
        # Create new user
        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name='Test',
            last_name='User'
        )
        print(f"[OK] Created test user: {username}")
    
    # Display credentials
    print("\n" + "="*50)
    print("TEST USER CREDENTIALS")
    print("="*50)
    print(f"Username: {username}")
    print(f"Email:    {email}")
    print(f"Password: {password}")
    print("="*50)
    print("\nUse these credentials to login at:")
    print("   http://localhost:5173/login")
    print("\n")
    
    return user

def create_admin_user():
    """Create an admin user if it doesn't exist"""
    
    # Admin credentials
    username = 'admin'
    email = 'admin@connectify.com'
    password = 'Admin@123'
    
    # Check if admin already exists
    if CustomUser.objects.filter(username=username).exists():
        print(f"[OK] Admin user '{username}' already exists!")
        user = CustomUser.objects.get(username=username)
        # Ensure user is superuser
        if not user.is_superuser:
            user.is_superuser = True
            user.is_staff = True
            user.save()
            print(f"[OK] Updated '{username}' to superuser status")
    else:
        # Create new admin
        user = CustomUser.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name='Admin',
            last_name='User'
        )
        print(f"[OK] Created admin user: {username}")
    
    # Display credentials
    print("\n" + "="*50)
    print("ADMIN USER CREDENTIALS")
    print("="*50)
    print(f"Username: {username}")
    print(f"Email:    {email}")
    print(f"Password: {password}")
    print("="*50)
    print("\nUse these credentials to access:")
    print("   Admin Panel: http://localhost:8000/admin/")
    print("   Frontend:    http://localhost:5173/login")
    print("\n")
    
    return user

if __name__ == '__main__':
    print("\nCreating test users for Connectify-AI...\n")
    
    try:
        # Create test user
        test_user = create_test_user()
        
        # Create admin user
        admin_user = create_admin_user()
        
        print("[OK] All test users created successfully!")
        print("\nTIP: You can now login to the application using the credentials above.")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error creating test users: {e}")
        import traceback
        traceback.print_exc()
