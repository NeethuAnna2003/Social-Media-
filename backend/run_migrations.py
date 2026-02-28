"""
Quick migration script for Aurora Chat
Run this to create and apply database migrations
"""

import os
import sys
import django

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command

print("=" * 50)
print("AURORA CHAT - Database Migration")
print("=" * 50)
print()

try:
    print("Step 1: Creating migrations for chat app...")
    call_command('makemigrations', 'chat', verbosity=2)
    print("[OK] Migrations created successfully!")
    print()
    
    print("Step 2: Applying migrations...")
    call_command('migrate', verbosity=2)
    print("[OK] Migrations applied successfully!")
    print()
    
    print("=" * 50)
    print("[SUCCESS] Migration Complete!")
    print("=" * 50)
    print()
    print("You can now start the server with:")
    print("python manage.py runserver")
    
except Exception as e:
    print(f"[ERROR] Error during migration: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
