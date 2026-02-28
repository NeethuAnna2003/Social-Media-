"""
Delete old fake captions and verify Whisper is ready
Run this script, then regenerate captions
"""

import os
import sys
import django

# Setup Django
backend_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from videos.models import Caption
from videos.services.local_whisper_service import WHISPER_AVAILABLE

print("=" * 60)
print("CAPTION SYSTEM - CLEANUP & VERIFICATION")
print("=" * 60)
print()

# Check Whisper
print("1. Checking Whisper status...")
if WHISPER_AVAILABLE:
    print("   ✓ Whisper is AVAILABLE")
    print("   Caption generation will use REAL AI transcription!")
else:
    print("   ✗ Whisper is NOT AVAILABLE")
    print("   Caption generation will use DEMO fallback (fake captions)")
    print("   FIX: Restart Django server!")
print()

# Delete old captions
print("2. Deleting old fake captions...")
old_count = Caption.objects.count()
if old_count > 0:
    Caption.objects.all().delete()
    print(f"   ✓ Deleted {old_count} old captions")
else:
    print("   ✓ No old captions to delete")
print()

# Summary
print("=" * 60)
print("NEXT STEPS")
print("=" * 60)

if WHISPER_AVAILABLE:
    print("✓ System is ready!")
    print()
    print("1. Open http://localhost:5173/studio")
    print("2. Upload your 19-second video")
    print("3. Click 'Generate Captions'")
    print("4. Wait 10-30 seconds")
    print("5. You should see 5-8 captions with EXACT spoken words!")
    print()
    print("If you still see 'Subscribe to the channel', restart Django server!")
else:
    print("✗ Whisper not detected!")
    print()
    print("FIX:")
    print("1. Stop Django server (Ctrl+C)")
    print("2. Restart: .\\venv\\Scripts\\python.exe manage.py runserver")
    print("3. Run this script again")

print("=" * 60)
