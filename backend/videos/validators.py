"""
Validation utilities for AI video processing system
Ensures data integrity and input validation
"""

import os
import mimetypes
from typing import Dict, List, Optional, Any
from django.core.exceptions import ValidationError
from django.conf import settings
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class VideoValidator:
    """Validates video files and related data"""
    
    SUPPORTED_FORMATS = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv']
    MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
    MIN_FILE_SIZE = 1024  # 1KB
    MAX_DURATION = 7200  # 2 hours in seconds
    MIN_DURATION = 1    # 1 second
    
    @classmethod
    def validate_video_file(cls, file_path: str) -> Dict[str, Any]:
        """
        Validate video file comprehensively
        
        Args:
            file_path: Path to video file
            
        Returns:
            Validation result with details
            
        Raises:
            ValidationError: If validation fails
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'metadata': {}
        }
        
        try:
            # Check file existence
            if not os.path.exists(file_path):
                raise ValidationError("Video file does not exist")
            
            # Check file size
            file_size = os.path.getsize(file_path)
            if file_size < cls.MIN_FILE_SIZE:
                raise ValidationError(f"File too small: {file_size} bytes")
            
            if file_size > cls.MAX_FILE_SIZE:
                raise ValidationError(f"File too large: {file_size} bytes (max: {cls.MAX_FILE_SIZE})")
            
            # Check file extension
            file_ext = Path(file_path).suffix.lower()
            if file_ext not in cls.SUPPORTED_FORMATS:
                raise ValidationError(f"Unsupported format: {file_ext}")
            
            # Check MIME type
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type or not mime_type.startswith('video/'):
                result['warnings'].append(f"Unusual MIME type: {mime_type}")
            
            # Extract video metadata
            metadata = cls._extract_metadata(file_path)
            result['metadata'] = metadata
            
            # Validate duration
            duration = metadata.get('duration', 0)
            if duration < cls.MIN_DURATION:
                raise ValidationError(f"Video too short: {duration}s")
            
            if duration > cls.MAX_DURATION:
                raise ValidationError(f"Video too long: {duration}s (max: {cls.MAX_DURATION}s)")
            
            # Check video quality
            if metadata.get('width', 0) < 320:
                result['warnings'].append("Low video resolution")
            
            if metadata.get('height', 0) < 240:
                result['warnings'].append("Low video height")
            
            # Check audio
            if not metadata.get('has_audio', True):
                result['warnings'].append("No audio track detected")
            
        except ValidationError as e:
            result['valid'] = False
            result['errors'].append(str(e))
        except Exception as e:
            result['valid'] = False
            result['errors'].append(f"Validation error: {str(e)}")
            logger.error(f"Video validation failed: {e}")
        
        return result
    
    @classmethod
    def _extract_metadata(cls, file_path: str) -> Dict[str, Any]:
        """Extract video metadata using ffprobe"""
        import subprocess
        import json
        
        metadata = {
            'duration': 0,
            'width': 0,
            'height': 0,
            'fps': 0,
            'has_audio': False,
            'format': '',
            'size': 0
        }
        
        try:
            # Get file size
            metadata['size'] = os.path.getsize(file_path)
            
            # Use ffprobe to get metadata
            cmd = [
                'ffprobe', '-v', 'error',
                '-show_entries', 'stream=width,height,r_frame_rate,codec_type',
                '-show_entries', 'format=duration,size,format_name',
                '-of', 'json',
                file_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                
                # Get format info
                format_info = data.get('format', {})
                metadata['duration'] = float(format_info.get('duration', 0))
                metadata['format'] = format_info.get('format_name', '')
                
                # Get stream info
                streams = data.get('streams', [])
                for stream in streams:
                    if stream.get('codec_type') == 'video':
                        metadata['width'] = int(stream.get('width', 0))
                        metadata['height'] = int(stream.get('height', 0))
                        fps_str = stream.get('r_frame_rate', '0/1')
                        if '/' in fps_str:
                            num, den = fps_str.split('/')
                            metadata['fps'] = float(num) / float(den) if float(den) > 0 else 0
                    elif stream.get('codec_type') == 'audio':
                        metadata['has_audio'] = True
            
        except Exception as e:
            logger.warning(f"Failed to extract video metadata: {e}")
        
        return metadata


class CaptionValidator:
    """Validates caption data"""
    
    MAX_TEXT_LENGTH = 200
    MIN_DURATION = 0.5
    MAX_DURATION = 10.0
    MAX_CONFIDENCE = 1.0
    SUPPORTED_LANGUAGES = ['en', 'ml', 'hi', 'ta', 'te', 'kn', 'bn', 'gu', 'mr', 'pa', 'or', 'as']
    
    @classmethod
    def validate_caption_data(cls, caption_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate caption data
        
        Args:
            caption_data: Caption data dictionary
            
        Returns:
            Validation result
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        try:
            # Validate required fields
            required_fields = ['text', 'start_time', 'end_time', 'language']
            for field in required_fields:
                if field not in caption_data:
                    raise ValidationError(f"Missing required field: {field}")
            
            # Validate text
            text = caption_data['text']
            if not isinstance(text, str):
                raise ValidationError("Text must be a string")
            
            if len(text.strip()) == 0:
                raise ValidationError("Text cannot be empty")
            
            if len(text) > cls.MAX_TEXT_LENGTH:
                result['warnings'].append(f"Text too long: {len(text)} chars")
            
            # Validate timestamps
            start_time = float(caption_data['start_time'])
            end_time = float(caption_data['end_time'])
            
            if start_time < 0:
                raise ValidationError("Start time cannot be negative")
            
            if end_time <= start_time:
                raise ValidationError("End time must be after start time")
            
            duration = end_time - start_time
            if duration < cls.MIN_DURATION:
                result['warnings'].append(f"Caption too short: {duration}s")
            
            if duration > cls.MAX_DURATION:
                result['warnings'].append(f"Caption too long: {duration}s")
            
            # Validate language
            language = caption_data['language']
            if language not in cls.SUPPORTED_LANGUAGES:
                result['warnings'].append(f"Unsupported language: {language}")
            
            # Validate confidence if provided
            confidence = caption_data.get('confidence')
            if confidence is not None:
                try:
                    confidence = float(confidence)
                    if confidence < 0 or confidence > cls.MAX_CONFIDENCE:
                        raise ValidationError(f"Invalid confidence: {confidence}")
                except (ValueError, TypeError):
                    result['warnings'].append("Invalid confidence format")
            
        except ValidationError as e:
            result['valid'] = False
            result['errors'].append(str(e))
        except Exception as e:
            result['valid'] = False
            result['errors'].append(f"Validation error: {str(e)}")
        
        return result
    
    @classmethod
    def validate_caption_sequence(cls, captions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate a sequence of captions for consistency
        
        Args:
            captions: List of caption dictionaries
            
        Returns:
            Validation result
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'summary': {}
        }
        
        try:
            if not captions:
                raise ValidationError("No captions provided")
            
            # Validate individual captions
            for i, caption in enumerate(captions):
                caption_result = cls.validate_caption_data(caption)
                if not caption_result['valid']:
                    result['valid'] = False
                    result['errors'].extend([f"Caption {i}: {err}" for err in caption_result['errors']])
                result['warnings'].extend([f"Caption {i}: {warn}" for warn in caption_result['warnings']])
            
            # Check for overlaps
            sorted_captions = sorted(captions, key=lambda x: x['start_time'])
            for i in range(len(sorted_captions) - 1):
                current = sorted_captions[i]
                next_caption = sorted_captions[i + 1]
                
                if current['end_time'] > next_caption['start_time']:
                    result['warnings'].append(f"Caption overlap: {current['start_time']}-{current['end_time']} and {next_caption['start_time']}-{next_caption['end_time']}")
            
            # Check for gaps
            for i in range(len(sorted_captions) - 1):
                current = sorted_captions[i]
                next_caption = sorted_captions[i + 1]
                
                gap = next_caption['start_time'] - current['end_time']
                if gap > 5.0:  # 5 second gap
                    result['warnings'].append(f"Large gap: {gap}s between captions")
            
            # Generate summary
            result['summary'] = {
                'total_captions': len(captions),
                'languages': list(set(c['language'] for c in captions)),
                'total_duration': max(c['end_time'] for c in captions) if captions else 0,
                'avg_caption_length': sum(len(c['text']) for c in captions) / len(captions) if captions else 0
            }
            
        except ValidationError as e:
            result['valid'] = False
            result['errors'].append(str(e))
        except Exception as e:
            result['valid'] = False
            result['errors'].append(f"Validation error: {str(e)}")
        
        return result


class ThumbnailValidator:
    """Validates thumbnail data"""
    
    SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp']
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    MIN_DIMENSION = 320
    MAX_DIMENSION = 4096
    ASPECT_RATIO_TOLERANCE = 0.2
    
    @classmethod
    def validate_thumbnail_data(cls, thumbnail_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate thumbnail data
        
        Args:
            thumbnail_data: Thumbnail data dictionary
            
        Returns:
            Validation result
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        try:
            # Validate required fields
            required_fields = ['template', 'frame_timestamp']
            for field in required_fields:
                if field not in thumbnail_data:
                    raise ValidationError(f"Missing required field: {field}")
            
            # Validate template
            template = thumbnail_data['template']
            valid_templates = ['clean', 'face', 'gradient', 'creator']
            if template not in valid_templates:
                raise ValidationError(f"Invalid template: {template}")
            
            # Validate timestamp
            timestamp = float(thumbnail_data['frame_timestamp'])
            if timestamp < 0:
                raise ValidationError("Timestamp cannot be negative")
            
            # Validate image if provided
            if 'image' in thumbnail_data:
                image_result = cls._validate_image(thumbnail_data['image'])
                result['errors'].extend(image_result['errors'])
                result['warnings'].extend(image_result['warnings'])
                if not image_result['valid']:
                    result['valid'] = False
            
            # Validate quality score if provided
            quality_score = thumbnail_data.get('quality_score')
            if quality_score is not None:
                try:
                    score = float(quality_score)
                    if score < 0 or score > 1.0:
                        raise ValidationError(f"Invalid quality score: {score}")
                except (ValueError, TypeError):
                    result['warnings'].append("Invalid quality score format")
            
        except ValidationError as e:
            result['valid'] = False
            result['errors'].append(str(e))
        except Exception as e:
            result['valid'] = False
            result['errors'].append(f"Validation error: {str(e)}")
        
        return result
    
    @classmethod
    def _validate_image(cls, image_path: str) -> Dict[str, Any]:
        """Validate image file"""
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        try:
            if not os.path.exists(image_path):
                raise ValidationError("Image file does not exist")
            
            # Check file size
            file_size = os.path.getsize(image_path)
            if file_size > cls.MAX_FILE_SIZE:
                raise ValidationError(f"Image too large: {file_size} bytes")
            
            # Check file extension
            file_ext = Path(image_path).suffix.lower()
            if file_ext not in cls.SUPPORTED_FORMATS:
                raise ValidationError(f"Unsupported image format: {file_ext}")
            
            # Check image dimensions
            from PIL import Image
            with Image.open(image_path) as img:
                width, height = img.size
                
                if width < cls.MIN_DIMENSION or height < cls.MIN_DIMENSION:
                    result['warnings'].append(f"Small image dimensions: {width}x{height}")
                
                if width > cls.MAX_DIMENSION or height > cls.MAX_DIMENSION:
                    result['warnings'].append(f"Large image dimensions: {width}x{height}")
                
                # Check aspect ratio (should be close to 16:9)
                expected_ratio = 16 / 9
                actual_ratio = width / height
                if abs(actual_ratio - expected_ratio) > cls.ASPECT_RATIO_TOLERANCE:
                    result['warnings'].append(f"Unusual aspect ratio: {actual_ratio:.2f}")
        
        except ValidationError as e:
            result['valid'] = False
            result['errors'].append(str(e))
        except Exception as e:
            result['valid'] = False
            result['errors'].append(f"Image validation error: {str(e)}")
        
        return result


class APIValidator:
    """Validates API requests and responses"""
    
    @classmethod
    def validate_caption_generation_request(cls, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate caption generation request"""
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        try:
            # Validate language
            language = request_data.get('language', 'auto')
            valid_languages = ['auto'] + CaptionValidator.SUPPORTED_LANGUAGES
            if language not in valid_languages:
                raise ValidationError(f"Invalid language: {language}")
            
            # Validate regenerate flag
            regenerate = request_data.get('regenerate', False)
            if not isinstance(regenerate, bool):
                result['warnings'].append("Regenerate flag should be boolean")
            
        except ValidationError as e:
            result['valid'] = False
            result['errors'].append(str(e))
        
        return result
    
    @classmethod
    def validate_translation_request(cls, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate translation request"""
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        try:
            # Validate target language
            target_language = request_data.get('target_language')
            if not target_language:
                raise ValidationError("Target language is required")
            
            if target_language not in CaptionValidator.SUPPORTED_LANGUAGES:
                raise ValidationError(f"Invalid target language: {target_language}")
            
        except ValidationError as e:
            result['valid'] = False
            result['errors'].append(str(e))
        
        return result
    
    @classmethod
    def validate_thumbnail_generation_request(cls, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate thumbnail generation request"""
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        try:
            # Validate templates
            templates = request_data.get('templates', ['clean'])
            valid_templates = ['clean', 'face', 'gradient', 'creator']
            
            if not isinstance(templates, list):
                raise ValidationError("Templates must be a list")
            
            for template in templates:
                if template not in valid_templates:
                    raise ValidationError(f"Invalid template: {template}")
            
            # Validate regenerate flag
            regenerate = request_data.get('regenerate', False)
            if not isinstance(regenerate, bool):
                result['warnings'].append("Regenerate flag should be boolean")
            
        except ValidationError as e:
            result['valid'] = False
            result['errors'].append(str(e))
        
        return result


# Convenience functions
def validate_video_file(file_path: str) -> Dict[str, Any]:
    """Validate video file"""
    return VideoValidator.validate_video_file(file_path)


def validate_caption_data(caption_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate caption data"""
    return CaptionValidator.validate_caption_data(caption_data)


def validate_thumbnail_data(thumbnail_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate thumbnail data"""
    return ThumbnailValidator.validate_thumbnail_data(thumbnail_data)
