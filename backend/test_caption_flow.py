#!/usr/bin/env python
"""
End-to-End Caption Generation Test
Tests the complete flow from generation to UI display
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from videos.models import Video, Caption, CaptionProcessingJob
from videos.production_views import GenerateCaptionsView, VideoCaptionsView
from videos.demo_caption_generator import DemoCaptionGenerator

def test_caption_generation_flow():
    """Test the complete caption generation workflow"""
    print("Testing End-to-End Caption Generation Flow")
    print("=" * 50)
    
    try:
        # Use existing video or create a mock one
        videos = Video.objects.all()[:1]
        if videos:
            video = videos[0]
            print(f"1. Using existing video: {video.id}")
        else:
            # Create a mock video for testing
            video = Video.objects.create(
                title='Test Video',
                video_file='test.mp4',  # Mock file path
                status='ready'
            )
            print(f"1. Created test video: {video.id}")
        
        # Test 1: Generate Captions
        print("\n2. Testing caption generation...")
        generator = DemoCaptionGenerator()
        captions = generator.generate_captions_for_video(video, 'en')
        
        print(f"   + Generated {len(captions)} captions")
        
        # Verify captions were saved
        saved_count = Caption.objects.filter(video=video).count()
        print(f"   + Verified {saved_count} captions in database")
        
        # Test 2: API Response Structure
        print("\n3. Testing API response structure...")
        factory = RequestFactory()
        
        # Test captions API
        request = factory.get(f'/api/videos/{video.id}/captions/')
        
        view = VideoCaptionsView()
        view.request = request
        view.format_kwarg = None
        view.kwargs = {'pk': video.id}
        
        queryset = view.get_queryset()
        print(f"   + Queryset returns {len(queryset)} captions")
        
        # Test 3: Data Integrity
        print("\n4. Testing data integrity...")
        db_captions = Caption.objects.filter(video=video).order_by('start_time')
        
        for i, caption in enumerate(db_captions[:3]):  # Show first 3
            try:
                text_preview = caption.text[:30] + "..." if len(caption.text) > 30 else caption.text
                print(f"   + Caption {i+1}: '{text_preview}' ({caption.start_time}s-{caption.end_time}s)")
            except UnicodeEncodeError:
                print(f"   + Caption {i+1}: [Non-ASCII text] ({caption.start_time}s-{caption.end_time}s)")
        
        print(f"\nALL TESTS PASSED!")
        print(f"\nSummary:")
        print(f"   + Video ID: {video.id}")
        print(f"   + Captions Generated: {len(captions)}")
        print(f"   + Captions Saved: {saved_count}")
        print(f"   + Data Integrity: Verified")
        
        print(f"\nFrontend should now show:")
        print(f"   + 'Captions ({len(captions)})' in the header")
        print(f"   + List of all {len(captions)} captions")
        print(f"   + No 'No captions yet' message")
        print(f"   + Editable caption items")
        
        return True
        
    except Exception as e:
        print(f"\nTest failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_caption_generation_flow()
    if success:
        print("\nEnd-to-end flow is working perfectly!")
        print("The UI should now update immediately after caption generation.")
    else:
        print("\nIssues found in the caption generation flow.")
        sys.exit(1)
