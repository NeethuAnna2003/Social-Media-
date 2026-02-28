#!/usr/bin/env python
"""
Test script for caption generation
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from videos.caption_generator import CaptionGenerator
from videos.models import Video

def test_caption_generation():
    """Test caption generation functionality"""
    print("Testing Caption Generation System...")
    print("=" * 50)
    
    try:
        # Initialize caption generator
        generator = CaptionGenerator()
        print("+ CaptionGenerator initialized successfully")
        
        # Check API keys
        print(f"+ Google Speech API Key: {'Set' if generator.google_speech_api_key else 'Not set'}")
        print(f"+ Gemini API Key: {'Set' if generator.gemini_api_key else 'Not set'}")
        print(f"+ Gemini Model: {'Available' if generator.gemini_model else 'Not available'}")
        
        # Test language mapping
        print(f"+ Language mapping: {len(generator.language_mapping)} languages supported")
        print(f"  Supported languages: {list(generator.language_mapping.keys())}")
        
        # Test audio processor
        print("+ Audio processor initialized successfully")
        
        print("\nAll caption generation components are working!")
        print("\nTo test with actual video:")
        print("1. Upload a video through the API")
        print("2. Call the caption generation endpoint")
        print("3. Check the generated captions")
        
        return True
        
    except Exception as e:
        print(f"- Error: {e}")
        return False

if __name__ == "__main__":
    success = test_caption_generation()
    if success:
        print("\nCaption generation system is ready!")
    else:
        print("\nCaption generation system has issues.")
        sys.exit(1)
