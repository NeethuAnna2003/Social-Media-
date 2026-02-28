#!/usr/bin/env python
"""
Test script to verify all dependencies are working
"""

import os
import sys

def test_imports():
    """Test all critical imports"""
    print("Testing imports...")
    
    try:
        # Test Django
        import django
        print("+ Django imported successfully")
    except ImportError as e:
        print(f"- Django import failed: {e}")
        return False
    
    try:
        # Test Google Gen AI
        import google.generativeai as genai
        print("+ Google Gen AI imported successfully")
    except ImportError as e:
        print(f"- Google Gen AI import failed: {e}")
        return False
    
    try:
        # Test Speech Recognition
        import speech_recognition as sr
        print("+ Speech Recognition imported successfully")
    except ImportError as e:
        print(f"- Speech Recognition import failed: {e}")
        return False
    
    try:
        # Test MoviePy
        import moviepy
        print("+ MoviePy imported successfully")
    except ImportError as e:
        print(f"- MoviePy import failed: {e}")
        return False
    
    try:
        # Test OpenCV
        import cv2
        print("+ OpenCV imported successfully")
    except ImportError as e:
        print(f"- OpenCV import failed: {e}")
        return False
    
    try:
        # Test Celery
        import celery
        print("+ Celery imported successfully")
    except ImportError as e:
        print(f"- Celery import failed: {e}")
        return False
    
    try:
        # Test Redis
        import redis
        print("+ Redis imported successfully")
    except ImportError as e:
        print(f"- Redis import failed: {e}")
        return False
    
    try:
        # Test PyDub
        import pydub
        print("+ PyDub imported successfully")
    except ImportError as e:
        print(f"- PyDub import failed: {e}")
        return False
    
    print("All imports successful!")
    return True

def test_django_setup():
    """Test Django configuration"""
    print("\nTesting Django setup...")
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    
    try:
        import django
        django.setup()
        print("+ Django setup successful")
        
        # Test model imports
        from videos.models import Video, Caption, ThumbnailOption
        print("+ Video models imported successfully")
        
        # Test service imports
        from videos.caption_generator import CaptionGenerator
        from videos.audio_processor import AudioProcessor
        print("+ Service modules imported successfully")
        
        return True
        
    except Exception as e:
        print(f"- Django setup failed: {e}")
        return False

if __name__ == "__main__":
    print("AI Caption & Thumbnail System - Dependency Test")
    print("=" * 50)
    
    imports_ok = test_imports()
    
    if imports_ok:
        django_ok = test_django_setup()
        
        if django_ok:
            print("\nAll tests passed! System is ready to run.")
        else:
            print("\nDjango setup failed.")
            sys.exit(1)
    else:
        print("\nImport tests failed.")
        sys.exit(1)
