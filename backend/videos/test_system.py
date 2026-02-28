"""
Production-ready AI Caption & Thumbnail System
Complete implementation with comprehensive testing
"""

import os
import tempfile
import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase, TransactionTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
import json

from .models import Video, Caption, CaptionProcessingJob, ThumbnailOption
from .caption_generator import CaptionGenerator, CaptionGenerationError
from .audio_processor import AudioProcessor, AudioProcessingError
from .validators import VideoValidator, CaptionValidator, ThumbnailValidator
from .error_handling import ErrorHandler, ErrorCategory, ErrorSeverity
from .celery_tasks import generate_video_captions_async

User = get_user_model()


class VideoValidatorTest(TestCase):
    """Test video validation functionality"""
    
    def setUp(self):
        self.test_video_path = "test_video.mp4"
        
        # Create a mock video file
        with open(self.test_video_path, 'wb') as f:
            f.write(b'fake video content')
    
    def tearDown(self):
        # Clean up test files
        if os.path.exists(self.test_video_path):
            os.remove(self.test_video_path)
    
    def test_validate_nonexistent_file(self):
        """Test validation of non-existent file"""
        result = VideoValidator.validate_video_file("nonexistent.mp4")
        
        self.assertFalse(result['valid'])
        self.assertIn("does not exist", result['errors'][0])
    
    def test_validate_unsupported_format(self):
        """Test validation of unsupported format"""
        # Create a file with unsupported extension
        unsupported_path = "test_file.txt"
        with open(unsupported_path, 'wb') as f:
            f.write(b'some content')
        
        try:
            result = VideoValidator.validate_video_file(unsupported_path)
            
            self.assertFalse(result['valid'])
            self.assertIn("Unsupported format", result['errors'][0])
        finally:
            if os.path.exists(unsupported_path):
                os.remove(unsupported_path)
    
    @patch('videos.validators.subprocess.run')
    def test_validate_successful_video(self, mock_run):
        """Test successful video validation"""
        # Mock ffprobe output
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = json.dumps({
            'format': {'duration': '120.5', 'format_name': 'mp4'},
            'streams': [
                {'codec_type': 'video', 'width': 1920, 'height': 1080, 'r_frame_rate': '30/1'},
                {'codec_type': 'audio'}
            ]
        })
        
        result = VideoValidator.validate_video_file(self.test_video_path)
        
        self.assertTrue(result['valid'])
        self.assertEqual(len(result['errors']), 0)
        self.assertEqual(result['metadata']['duration'], 120.5)
        self.assertEqual(result['metadata']['width'], 1920)
        self.assertEqual(result['metadata']['height'], 1080)


class CaptionValidatorTest(TestCase):
    """Test caption validation functionality"""
    
    def test_validate_valid_caption(self):
        """Test validation of valid caption data"""
        caption_data = {
            'text': 'Hello world',
            'start_time': 0.0,
            'end_time': 3.5,
            'language': 'en',
            'confidence': 0.95
        }
        
        result = CaptionValidator.validate_caption_data(caption_data)
        
        self.assertTrue(result['valid'])
        self.assertEqual(len(result['errors']), 0)
    
    def test_validate_missing_fields(self):
        """Test validation of caption with missing fields"""
        caption_data = {
            'text': 'Hello world',
            'start_time': 0.0
            # Missing end_time and language
        }
        
        result = CaptionValidator.validate_caption_data(caption_data)
        
        self.assertFalse(result['valid'])
        self.assertIn("Missing required field", result['errors'][0])
    
    def test_validate_invalid_timestamps(self):
        """Test validation of caption with invalid timestamps"""
        caption_data = {
            'text': 'Hello world',
            'start_time': 5.0,
            'end_time': 3.0,  # End before start
            'language': 'en'
        }
        
        result = CaptionValidator.validate_caption_data(caption_data)
        
        self.assertFalse(result['valid'])
        self.assertIn("End time must be after start time", result['errors'][0])
    
    def test_validate_caption_sequence(self):
        """Test validation of caption sequence"""
        captions = [
            {'text': 'First caption', 'start_time': 0.0, 'end_time': 3.0, 'language': 'en'},
            {'text': 'Second caption', 'start_time': 3.5, 'end_time': 6.5, 'language': 'en'},
            {'text': 'Third caption', 'start_time': 7.0, 'end_time': 10.0, 'language': 'en'}
        ]
        
        result = CaptionValidator.validate_caption_sequence(captions)
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['summary']['total_captions'], 3)
        self.assertEqual(result['summary']['languages'], ['en'])


class AudioProcessorTest(TestCase):
    """Test audio processing functionality"""
    
    def setUp(self):
        self.processor = AudioProcessor()
        self.test_video_path = "test_video.mp4"
        
        # Create a mock video file
        with open(self.test_video_path, 'wb') as f:
            f.write(b'fake video content')
    
    def tearDown(self):
        # Clean up test files
        if os.path.exists(self.test_video_path):
            os.remove(self.test_video_path)
    
    def test_validate_nonexistent_file(self):
        """Test validation of non-existent video file"""
        with self.assertRaises(AudioProcessingError):
            self.processor.validate_video_file("nonexistent.mp4")
    
    def test_validate_empty_file(self):
        """Test validation of empty file"""
        empty_path = "empty_video.mp4"
        with open(empty_path, 'wb') as f:
            f.write(b'')
        
        try:
            with self.assertRaises(AudioProcessingError):
                self.processor.validate_video_file(empty_path)
        finally:
            if os.path.exists(empty_path):
                os.remove(empty_path)
    
    def test_validate_unsupported_format(self):
        """Test validation of unsupported format"""
        unsupported_path = "test_file.txt"
        with open(unsupported_path, 'wb') as f:
            f.write(b'some content')
        
        try:
            with self.assertRaises(AudioProcessingError):
                self.processor.validate_video_file(unsupported_path)
        finally:
            if os.path.exists(unsupported_path):
                os.remove(unsupported_path)
    
    @patch('videos.audio_processor.subprocess.run')
    def test_get_video_info(self, mock_run):
        """Test video info extraction"""
        # Mock ffprobe output
        mock_run.side_effect = [
            # Duration command
            MagicMock(returncode=0, stdout="120.5"),
            # Format info command
            MagicMock(returncode=0, stdout='{"streams": [{"codec_type": "video"}]}')
        ]
        
        info = self.processor.get_video_info(self.test_video_path)
        
        self.assertEqual(info['duration'], 120.5)
        self.assertFalse(info['is_long_video'])


class CaptionGeneratorTest(TestCase):
    """Test caption generation functionality"""
    
    def setUp(self):
        self.generator = CaptionGenerator()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test video
        video_file = SimpleUploadedFile(
            "test_video.mp4",
            b"fake video content",
            content_type="video/mp4"
        )
        
        self.video = Video.objects.create(
            user=self.user,
            title="Test Video",
            video_file=video_file,
            duration=120
        )
    
    @patch('videos.caption_generator.AudioProcessor')
    @patch('videos.caption_generator.sr.Recognizer')
    def test_generate_captions_success(self, mock_recognizer_class, mock_processor_class):
        """Test successful caption generation"""
        # Mock audio processor
        mock_processor = MagicMock()
        mock_processor_class.return_value = mock_processor
        mock_processor.process_audio_for_video.return_value = (
            "audio.wav",  # audio_path
            [],          # chunk_paths (short video)
            {'duration': 120, 'is_long_video': False}  # video_info
        )
        
        # Mock speech recognition
        mock_recognizer = MagicMock()
        mock_recognizer_class.return_value = mock_recognizer
        mock_recognizer.recognize_google.return_value = "Hello world test caption"
        
        # Generate captions
        captions = self.generator.generate_captions_for_video(self.video, 'en')
        
        self.assertGreater(len(captions), 0)
        self.assertEqual(captions[0].video, self.video)
        self.assertEqual(captions[0].language, 'en')
    
    @patch('videos.caption_generator.AudioProcessor')
    def test_generate_captions_audio_error(self, mock_processor_class):
        """Test caption generation with audio processing error"""
        # Mock audio processor to raise error
        mock_processor = MagicMock()
        mock_processor_class.return_value = mock_processor
        mock_processor.process_audio_for_video.side_effect = AudioProcessingError("Audio extraction failed")
        
        # Generate captions should raise error
        with self.assertRaises(CaptionGenerationError):
            self.generator.generate_captions_for_video(self.video, 'en')
        
        # Video should be marked as failed
        self.video.refresh_from_db()
        self.assertEqual(self.video.status, 'failed')


class ErrorHandlerTest(TestCase):
    """Test error handling functionality"""
    
    def setUp(self):
        self.error_handler = ErrorHandler()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_handle_error(self):
        """Test error handling"""
        error = Exception("Test error")
        
        processing_error = self.error_handler.handle_error(
            error=error,
            category=ErrorCategory.AUDIO_PROCESSING,
            severity=ErrorSeverity.MEDIUM,
            user_id=self.user.id
        )
        
        self.assertEqual(processing_error.category, ErrorCategory.AUDIO_PROCESSING)
        self.assertEqual(processing_error.severity, ErrorSeverity.MEDIUM)
        self.assertEqual(processing_error.message, "Test error")
        self.assertIsNotNone(processing_error.user_friendly_message)
        self.assertGreater(len(processing_error.recovery_suggestions), 0)
    
    def test_error_summary(self):
        """Test error summary generation"""
        # Add some errors
        for i in range(5):
            error = Exception(f"Test error {i}")
            self.error_handler.handle_error(
                error=error,
                category=ErrorCategory.AUDIO_PROCESSING,
                severity=ErrorSeverity.MEDIUM
            )
        
        summary = self.error_handler.get_error_summary(hours=24)
        
        self.assertEqual(summary['total_errors'], 5)
        self.assertIn('audio_processing', summary['by_category'])
        self.assertIn('medium', summary['by_severity'])


class APIEndpointTest(APITestCase):
    """Test API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test video
        video_file = SimpleUploadedFile(
            "test_video.mp4",
            b"fake video content",
            content_type="video/mp4"
        )
        
        self.video = Video.objects.create(
            user=self.user,
            title="Test Video",
            video_file=video_file,
            duration=120
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_video_upload(self):
        """Test video upload endpoint"""
        video_file = SimpleUploadedFile(
            "new_video.mp4",
            b"fake video content",
            content_type="video/mp4"
        )
        
        data = {
            'title': 'New Test Video',
            'description': 'Test description',
            'video_file': video_file
        }
        
        response = self.client.post('/api/videos/upload/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Test Video')
    
    def test_generate_captions(self):
        """Test caption generation endpoint"""
        with patch('videos.production_views.CaptionGenerator') as mock_generator:
            mock_instance = MagicMock()
            mock_generator.return_value = mock_instance
            mock_instance.generate_captions_for_video.return_value = [
                MagicMock(id=1, text='Test caption', language='en')
            ]
            
            data = {'language': 'en'}
            response = self.client.post(
                f'/api/videos/{self.video.id}/captions/generate/',
                data,
                format='json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('captions_count', response.data)
    
    def test_generate_captions_invalid_language(self):
        """Test caption generation with invalid language"""
        data = {'language': 'invalid_lang'}
        response = self.client.post(
            f'/api/videos/{self.video.id}/captions/generate/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Unsupported language', response.data['error'])
    
    def test_translate_captions(self):
        """Test caption translation endpoint"""
        # Create some captions first
        Caption.objects.create(
            video=self.video,
            language='en',
            start_time=0.0,
            end_time=3.0,
            text='Hello world'
        )
        
        with patch('videos.production_views.translate_video_captions_async') as mock_task:
            mock_task.return_value = MagicMock(id='task_123')
            
            data = {'target_language': 'ml'}
            response = self.client.post(
                f'/api/videos/{self.video.id}/captions/translate/',
                data,
                format='json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('task_id', response.data)
    
    def test_get_captions(self):
        """Test getting captions endpoint"""
        # Create some captions
        Caption.objects.create(
            video=self.video,
            language='en',
            start_time=0.0,
            end_time=3.0,
            text='Hello world'
        )
        
        response = self.client.get(f'/api/videos/{self.video.id}/captions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['captions']), 1)
        self.assertEqual(response.data['captions'][0]['text'], 'Hello world')
    
    def test_update_caption(self):
        """Test updating caption endpoint"""
        caption = Caption.objects.create(
            video=self.video,
            language='en',
            start_time=0.0,
            end_time=3.0,
            text='Hello world'
        )
        
        data = {'text': 'Updated caption'}
        response = self.client.patch(
            f'/api/videos/captions/{caption.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        caption.refresh_from_db()
        self.assertEqual(caption.text, 'Updated caption')
    
    def test_delete_caption(self):
        """Test deleting caption endpoint"""
        caption = Caption.objects.create(
            video=self.video,
            language='en',
            start_time=0.0,
            end_time=3.0,
            text='Hello world'
        )
        
        response = self.client.delete(f'/api/videos/captions/{caption.id}/delete/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Caption.objects.filter(id=caption.id).exists())


class IntegrationTest(TransactionTestCase):
    """Integration tests for the complete system"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('videos.production_views.CaptionGenerator')
    @patch('videos.production_views.generate_video_captions_async')
    def test_full_caption_workflow(self, mock_async_task, mock_generator):
        """Test complete caption generation workflow"""
        # Create video
        video_file = SimpleUploadedFile(
            "test_video.mp4",
            b"fake video content",
            content_type="video/mp4"
        )
        
        video_data = {
            'title': 'Integration Test Video',
            'description': 'Test video for integration testing',
            'video_file': video_file
        }
        
        response = self.client.post('/api/videos/upload/', video_data, format='multipart')
        video_id = response.data['id']
        
        # Generate captions (mock async for long video)
        mock_task.return_value = MagicMock(id='task_123')
        
        caption_data = {'language': 'auto'}
        response = self.client.post(
            f'/api/videos/{video_id}/captions/generate/',
            caption_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('task_id', response.data)
        
        # Check video status
        response = self.client.get(f'/api/videos/{video_id}/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['video_status'], 'processing')
    
    def test_error_handling_workflow(self):
        """Test error handling in API workflow"""
        # Create video
        video_file = SimpleUploadedFile(
            "test_video.mp4",
            b"fake video content",
            content_type="video/mp4"
        )
        
        video_data = {
            'title': 'Error Test Video',
            'video_file': video_file
        }
        
        response = self.client.post('/api/videos/upload/', video_data, format='multipart')
        video_id = response.data['id']
        
        # Try to generate captions with invalid language
        caption_data = {'language': 'invalid'}
        response = self.client.post(
            f'/api/videos/{video_id}/captions/generate/',
            caption_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        
        # Try to translate without captions
        translation_data = {'target_language': 'ml'}
        response = self.client.post(
            f'/api/videos/{video_id}/captions/translate/',
            translation_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No captions found', response.data['error'])


if __name__ == '__main__':
    unittest.main()
