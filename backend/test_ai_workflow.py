#!/usr/bin/env python
"""
Comprehensive AI Workflow Test Script
Tests the complete AI caption and thumbnail generation system
"""

import os
import sys
import django
import time
import requests
import json
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from videos.models import Video, Caption, CaptionProcessingJob, ThumbnailOption

User = get_user_model()

class AIWorkflowTest(TestCase):
    """Test the complete AI workflow from upload to generation"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create or get test user
        self.user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@example.com',
                'password': 'testpass123'
            }
        )
        if not created:
            # User already exists, just set the password
            self.user.set_password('testpass123')
            self.user.save()
        
        # Authenticate client
        self.client.force_authenticate(user=self.user)
        
        # Create a mock video file
        self.video_file = SimpleUploadedFile(
            "test_video.mp4",
            b"fake video content for testing",
            content_type="video/mp4"
        )
        
        print("Test setup completed")
    
    def test_01_video_upload(self):
        """Test video upload with AI options"""
        print("\nTesting video upload...")
        
        url = reverse('videos:video-upload')
        data = {
            'title': 'AI Test Video',
            'description': 'Test video for AI workflow',
            'video_file': self.video_file,
            'is_public': True
        }
        
        response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        
        self.video_id = response.data['id']
        print(f"Video uploaded successfully with ID: {self.video_id}")
        
        return response.data
    
    def test_02_language_detection(self):
        """Test language detection endpoint"""
        print("\nTesting language detection...")
        
        if not hasattr(self, 'video_id'):
            self.test_01_video_upload()
        
        url = reverse('videos:detect-language', kwargs={'pk': self.video_id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detected_language', response.data)
        self.assertIn('supported_languages', response.data)
        
        print(f"Language detected: {response.data['detected_language']}")
        print(f"Supported languages: {len(response.data['supported_languages'])}")
        
        return response.data
    
    def test_03_caption_generation(self):
        """Test AI caption generation"""
        print("\nTesting caption generation...")
        
        if not hasattr(self, 'video_id'):
            self.test_01_video_upload()
        
        url = reverse('videos:generate-captions', kwargs={'pk': self.video_id})
        data = {
            'language': 'en',
            'detect_language': False,
            'regenerate': True  # Always regenerate for testing
        }
        
        response = self.client.post(url, data)
        
        print(f"Caption generation response status: {response.status_code}")
        if response.status_code != 200 and response.status_code != 202:
            print(f"Error response: {response.data}")
        
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_202_ACCEPTED])
        
        if response.status_code == status.HTTP_200_OK:
            # Immediate result for short video
            self.assertIn('captions', response.data)
            self.assertGreater(len(response.data['captions']), 0)
            print(f"{len(response.data['captions'])} captions generated immediately")
        else:
            # Async processing for long video
            self.assertIn('task_id', response.data)
            self.task_id = response.data['task_id']
            print(f"Caption generation started with task ID: {self.task_id}")
        
        return response.data
    
    def test_04_caption_retrieval(self):
        """Test retrieving generated captions"""
        print("\nTesting caption retrieval...")
        
        if not hasattr(self, 'video_id'):
            self.test_01_video_upload()
            self.test_03_caption_generation()
        
        # Wait a moment for processing
        time.sleep(1)
        
        url = reverse('videos:video-captions', kwargs={'pk': self.video_id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('captions', response.data)
        
        captions = response.data['captions']
        print(f"Retrieved {len(captions)} captions")
        
        if captions:
            print(f"   First caption: {captions[0]['text'][:50]}...")
            print(f"   Language: {captions[0]['language']}")
            print(f"   Time range: {captions[0]['start_time']} - {captions[0]['end_time']}")
        
        return response.data
    
    def test_05_thumbnail_generation(self):
        """Test AI thumbnail generation (simplified test)"""
        print("\nTesting thumbnail generation...")
        
        if not hasattr(self, 'video_id'):
            self.test_01_video_upload()
        
        # For now, just test that the endpoint exists and responds
        # Thumbnail generation requires Celery to be running
        print("Thumbnail generation requires Celery worker - skipping detailed test")
        
        # Test that we can at least access the thumbnails endpoint
        url = reverse('videos:video-thumbnails', kwargs={'pk': self.video_id})
        response = self.client.get(url)
        
        # Should return 200 even if no thumbnails exist
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('thumbnails', response.data)
        
        print(f"Thumbnail endpoint accessible - found {len(response.data.get('thumbnails', []))} existing thumbnails")
        
        return response.data
    
    def test_06_task_status_monitoring(self):
        """Test task status monitoring"""
        print("\nTesting task status monitoring...")
        
        if not hasattr(self, 'task_id'):
            self.test_03_caption_generation()
        
        if hasattr(self, 'task_id'):
            url = reverse('videos:task-status', kwargs={'task_id': self.task_id})
            response = self.client.get(url)
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('status', response.data)
            self.assertIn('progress', response.data)
            
            print(f"Task status: {response.data['status']}")
            print(f"Progress: {response.data['progress']}%")
        
        return response.data if 'response' in locals() else None
    
    def test_07_complete_workflow(self):
        """Test the complete workflow end-to-end"""
        print("\nTesting complete AI workflow...")
        
        # Step 1: Upload video (only if not already uploaded)
        if not hasattr(self, 'video_id'):
            video_data = self.test_01_video_upload()
        else:
            print(f"Using existing video ID: {self.video_id}")
            video_data = {'id': self.video_id}
        
        # Step 2: Detect language
        lang_data = self.test_02_language_detection()
        
        # Step 3: Generate captions
        # Reset video status to ready before regenerating
        from videos.models import Video
        video = Video.objects.get(id=self.video_id)
        video.status = 'ready'
        video.save()
        print("Reset video status to 'ready' for caption regeneration")
        
        caption_data = self.test_03_caption_generation()
        
        # Step 4: Retrieve captions
        captions_data = self.test_04_caption_retrieval()
        
        # Step 5: Generate thumbnails
        thumbnail_data = self.test_05_thumbnail_generation()
        
        # Step 6: Check task status if async
        if hasattr(self, 'task_id') or hasattr(self, 'thumbnail_task_id'):
            self.test_06_task_status_monitoring()
        
        print("\nComplete AI workflow test finished successfully!")
        print(f"   Video ID: {self.video_id}")
        print(f"   Captions generated: {len(captions_data.get('captions', []))}")
        print(f"   Language detected: {lang_data.get('detected_language')}")
        
        return {
            'video': video_data,
            'language': lang_data,
            'captions': captions_data,
            'thumbnails': thumbnail_data
        }

def run_ai_workflow_tests():
    """Run all AI workflow tests"""
    print("=" * 60)
    print("AI CAPTION & THUMBNAIL WORKFLOW TESTS")
    print("=" * 60)
    
    test_case = AIWorkflowTest()
    test_case.setUp()
    
    try:
        # Run individual tests
        test_case.test_01_video_upload()
        test_case.test_02_language_detection()
        test_case.test_03_caption_generation()
        test_case.test_04_caption_retrieval()
        test_case.test_05_thumbnail_generation()
        
        # Run complete workflow test
        result = test_case.test_07_complete_workflow()
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\nTEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = run_ai_workflow_tests()
    sys.exit(0 if success else 1)
