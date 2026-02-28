"""
Whisper AI Caption System - Status Check
Run this to verify Whisper is installed and working
"""

print("=" * 60)
print("WHISPER AI CAPTION SYSTEM - STATUS CHECK")
print("=" * 60)
print()

# Check 1: Whisper Installation
print("1. Checking Whisper installation...")
try:
    import whisper
    print("   ✓ Whisper is installed")
    print(f"   Version: {whisper.__version__ if hasattr(whisper, '__version__') else 'Unknown'}")
except ImportError:
    print("   ✗ Whisper is NOT installed!")
    print("   Run: pip install openai-whisper")
print()

# Check 2: PyTorch
print("2. Checking PyTorch...")
try:
    import torch
    print("   ✓ PyTorch is installed")
    print(f"   Version: {torch.__version__}")
except ImportError:
    print("   ✗ PyTorch is NOT installed!")
print()

# Check 3: FFmpeg Python
print("3. Checking ffmpeg-python...")
try:
    import ffmpeg
    print("   ✓ ffmpeg-python is installed")
except ImportError:
    print("   ✗ ffmpeg-python is NOT installed!")
    print("   Run: pip install ffmpeg-python")
print()

# Check 4: Django
print("4. Checking Django...")
try:
    import django
    print("   ✓ Django is installed")
    print(f"   Version: {django.__version__}")
except ImportError:
    print("   ✗ Django is NOT installed!")
print()

# Check 5: Whisper Service
print("5. Checking Whisper Service integration...")
try:
    import os
    import sys
    
    # Add backend to path
    backend_path = os.path.dirname(os.path.abspath(__file__))
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    
    # Set Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    # Setup Django
    import django
    django.setup()
    
    from videos.services.local_whisper_service import WHISPER_AVAILABLE
    
    if WHISPER_AVAILABLE:
        print("   ✓ Whisper Service is AVAILABLE")
        print("   Caption generation will use REAL AI transcription!")
    else:
        print("   ✗ Whisper Service is NOT AVAILABLE")
        print("   Caption generation will use DEMO fallback (fake captions)")
        
except Exception as e:
    print(f"   ✗ Error checking Whisper Service: {e}")
print()

# Summary
print("=" * 60)
print("SUMMARY")
print("=" * 60)

try:
    if WHISPER_AVAILABLE:
        print("✓ System is ready for REAL AI caption generation!")
        print()
        print("Next steps:")
        print("1. Make sure Django server is running: python manage.py runserver")
        print("2. Open http://localhost:5173/studio")
        print("3. Upload a video and generate captions")
        print("4. You should see 5-8 captions with exact spoken words!")
    else:
        print("✗ System will use FAKE demo captions")
        print()
        print("To fix:")
        print("1. Install Whisper: pip install openai-whisper")
        print("2. Restart Django server")
        print("3. Run this script again to verify")
except:
    print("⚠ Could not determine Whisper status")
    print("Make sure all dependencies are installed")

print("=" * 60)
