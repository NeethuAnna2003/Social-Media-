"""
Celery tasks for asynchronous video processing
Handles long video processing, thumbnail generation, and caption tasks
"""

import os
import tempfile
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.files.base import ContentFile
from pathlib import Path
import logging

# Optional heavy dependencies — import gracefully so startup doesn't crash
try:
    from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = ImageDraw = ImageFont = ImageEnhance = ImageFilter = None

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    np = None
    NUMPY_AVAILABLE = False

from .models import Video, Caption, CaptionProcessingJob, ThumbnailOption
from .services import UnifiedCaptionService
from .audio_processor import AudioProcessor, AudioProcessingError

logger = logging.getLogger(__name__)



@shared_task(bind=True, max_retries=3)
def generate_video_captions_async(self, video_id: int, language: str = 'auto'):
    """
    Asynchronous task to generate captions using Unified Caption Service
    
    Args:
        video_id: Video ID
        language: Target language code
    """
    try:
        video = Video.objects.get(id=video_id)
        
        # Create processing job
        job = CaptionProcessingJob.objects.create(
            video=video,
            source_language=language,
            target_language=language
        )
        
        # Update video status
        video.status = 'processing'
        video.processing_progress = 0
        video.save()
        
        # Use Unified Service (handles all fallbacks internally)
        logger.info(f"Starting caption generation for video {video_id} using UnifiedCaptionService")
        service = UnifiedCaptionService()
        created_captions = service.generate_captions(video, language, job)
        
        # Prepare response data
        captions_data = []
        detected_language = language if language != 'auto' else 'en'
        
        if created_captions and len(created_captions) > 0:
            detected_language = created_captions[0].language
            for caption in created_captions:
                captions_data.append({
                    'id': caption.id,
                    'start_time': caption.start_time,
                    'end_time': caption.end_time,
                    'text': caption.text,
                    'confidence': caption.confidence,
                    'language': caption.language
                })
        
        logger.info(f"Successfully generated {len(created_captions)} captions for video {video_id}")
        return {
            'status': 'success',
            'video_id': video_id,
            'captions_count': len(created_captions),
            'language': detected_language,
            'captions': captions_data
        }
        
    except Video.DoesNotExist:
        logger.error(f"Video {video_id} not found")
        return {
            'status': 'error',
            'video_id': video_id,
            'error': 'Video not found'
        }
        
    except Exception as e:
        logger.error(f"Caption generation failed for video {video_id}: {e}")
        
        # Retry on failure
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (self.request.retries + 1))
        
        return {
            'status': 'error',
            'video_id': video_id,
            'error': str(e)
        }


@shared_task(bind=True, max_retries=3)
def translate_video_captions_async(self, video_id: int, target_language: str):
    """
    Asynchronous task to translate video captions
    
    Args:
        video_id: Video ID
        target_language: Target language code
    """
    try:
        video = Video.objects.get(id=video_id)
        
        # Get original captions
        original_captions = video.captions.filter(is_translated=False)
        if not original_captions.exists():
            raise Exception("No original captions found for translation")
        
        # Use AI service for translation
        from .ai_services import GeminiTranslationService
        translation_service = GeminiTranslationService()
        
        # Prepare captions for translation
        captions_data = []
        for caption in original_captions:
            captions_data.append({
                'text': caption.text,
                'start_time': caption.start_time,
                'end_time': caption.end_time
            })
        
        # Translate captions
        source_lang = video.original_language or 'en'
        translated_captions = translation_service.translate_captions(
            captions_data, source_lang, target_language
        )
        
        # Create translated caption objects
        created_count = 0
        for trans_caption in translated_captions:
            Caption.objects.create(
                video=video,
                language=target_language,
                start_time=trans_caption['start_time'],
                end_time=trans_caption['end_time'],
                text=trans_caption['text'],
                confidence=0.8,  # Translation confidence
                is_translated=True,
                original_text=trans_caption.get('original_text', '')
            )
            created_count += 1
        
        # Update video settings
        video.translation_language = target_language
        video.save()
        
        logger.info(f"Successfully translated {created_count} captions for video {video_id}")
        return {
            'status': 'success',
            'video_id': video_id,
            'translated_count': created_count,
            'target_language': target_language
        }
        
    except Video.DoesNotExist:
        logger.error(f"Video {video_id} not found")
        return {
            'status': 'error',
            'video_id': video_id,
            'error': 'Video not found'
        }
        
    except Exception as e:
        logger.error(f"Translation failed for video {video_id}: {e}")
        
        # Retry on failure
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (self.request.retries + 1))
        
        return {
            'status': 'error',
            'video_id': video_id,
            'error': str(e)
        }


@shared_task(bind=True, max_retries=3)
def generate_video_thumbnails_async(self, video_id: int, template_types: list = None, custom_text: str = None):
    """
    Asynchronous task to generate AI thumbnails for a video
    
    Args:
        video_id: Video ID
        template_types: List of template types to generate
        custom_text: Optional text to override AI hook
    """
    if template_types is None:
        template_types = ['clean', 'face', 'gradient', 'creator']
    
    try:
        video = Video.objects.get(id=video_id)
        
        # ... (check status) ...
        
        # Extract frames from video
        frame_timestamps, frame_images = extract_video_frames(video.video_file.path)
        
        if not frame_images:
            raise Exception("No frames could be extracted from video")
        
        # Analyze frames using AI
        from .ai_services import GeminiThumbnailService
        thumbnail_service = GeminiThumbnailService()
        
        # Analyze each frame
        frame_analyses = []
        for i, (timestamp, frame_path) in enumerate(zip(frame_timestamps, frame_images)):
            # Use 'with' context manager to ensure handles are closed
            # (Assuming GeminiThumbnailService.analyze_frame is fixed)
            analysis = thumbnail_service.analyze_frame(frame_path)
            frame_analyses.append({
                'timestamp': timestamp,
                'analysis': analysis,
                'frame_path': frame_path
            })
            
            # Update progress
            progress = 20 + (30 * (i + 1) / len(frame_images))
            video.processing_progress = int(progress)
            video.save()
        
        # Rank frames by quality
        ranked_indices = thumbnail_service.rank_thumbnails(
            [fa['analysis'] for fa in frame_analyses]
        )
        
        # Get transcript context for AI Hook Generation
        transcript_text = ""
        if video.captions.filter(is_translated=False).exists():
             captions = video.captions.filter(is_translated=False).order_by('start_time')[:20]
             transcript_text = " ".join([c.text for c in captions])

        # Generate thumbnails for each template
        created_thumbnails = []
        for template_type in template_types:
            # Get best frame for this template
            best_frame_idx = ranked_indices[0] if ranked_indices else 0
            frame_data = frame_analyses[best_frame_idx]
            
            # 4. Text Generation (Hook Line)
            if custom_text:
                hook_text = custom_text
            else:
                # AI generates short, clickable text based on context & transcript
                hook_text = thumbnail_service.suggest_thumbnail_text(
                    video.title,
                    frame_data['analysis'],
                    transcript=transcript_text
                )
            
            # Generate thumbnail with template
            thumbnail_path = generate_thumbnail_with_template(
                frame_data['frame_path'],
                template_type,
                hook_text, # Use AI Hook or Custom Text
                frame_data['analysis']
            )
            
            # Create ThumbnailOption object
            thumbnail_option = ThumbnailOption.objects.create(
                video=video,
                template=template_type,
                frame_timestamp=frame_data['timestamp'],
                has_face=frame_data['analysis'].get('has_face', False),
                emotion_detected=frame_data['analysis'].get('emotion', ''),
                quality_score=frame_data['analysis'].get('quality_score', 0.5),
                overlay_text=hook_text
            )
            
            # Save generated image
            with open(thumbnail_path, 'rb') as f:
                thumbnail_option.image.save(
                    f"thumbnail_{template_type}_{video_id}.jpg",
                    ContentFile(f.read()),
                    save=True
                )
            
            created_thumbnails.append(thumbnail_option)
        
        # Update video status
        video.status = 'ready'
        video.processing_progress = 100
        video.save()
        
        # Cleanup temp files
        cleanup_temp_files(frame_images)
        
        logger.info(f"Successfully generated {len(created_thumbnails)} thumbnails for video {video_id}")
        return {
            'status': 'success',
            'video_id': video_id,
            'thumbnails_count': len(created_thumbnails),
            'templates': template_types
        }
        
    except Video.DoesNotExist:
        logger.error(f"Video {video_id} not found")
        return {
            'status': 'error',
            'video_id': video_id,
            'error': 'Video not found'
        }
        
    except Exception as e:
        logger.error(f"Thumbnail generation failed for video {video_id}: {e}")
        
        # Update video status
        try:
            video = Video.objects.get(id=video_id)
            video.status = 'failed'
            video.error_message = str(e)
            video.save()
        except:
            pass
        
        # Retry on failure
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (self.request.retries + 1))
        
        return {
            'status': 'error',
            'video_id': video_id,
            'error': str(e)
        }


def extract_video_frames(video_path: str, num_frames: int = 10) -> tuple:
    """
    Extract frames from video at regular intervals
    
    Args:
        video_path: Path to video file
        num_frames: Number of frames to extract
        
    Returns:
        Tuple of (timestamps, frame_paths)
    """
    try:
        # Open video
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise Exception("Could not open video file")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        
        # Calculate frame intervals
        frame_interval = max(1, total_frames // num_frames)
        timestamps = []
        frame_paths = []
        temp_dir = tempfile.mkdtemp()
        
        for i in range(0, total_frames, frame_interval):
            # Set frame position
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            
            # Read frame
            ret, frame = cap.read()
            
            if ret:
                # Save frame
                timestamp = i / fps
                frame_path = os.path.join(temp_dir, f"frame_{i:06d}.jpg")
                cv2.imwrite(frame_path, frame)
                
                timestamps.append(timestamp)
                frame_paths.append(frame_path)
                
                if len(frame_paths) >= num_frames:
                    break
        
        cap.release()
        
        return timestamps, frame_paths
        
    except Exception as e:
        logger.error(f"Failed to extract frames: {e}")
        return [], []


def generate_thumbnail_with_template(
    frame_path: str, 
    template_type: str, 
    video_title: str,
    frame_analysis: dict
) -> str:
    """
    Generate thumbnail with specific template
    
    Args:
        frame_path: Path to frame image
        template_type: Template type (clean, face, gradient, creator)
        video_title: Video title for overlay
        frame_analysis: Frame analysis results
        
    Returns:
        Path to generated thumbnail
    """
    try:
        # Open frame
        with Image.open(frame_path) as src_img:
        # Resize to standard thumbnail size
            img = src_img.resize((1280, 720), Image.Resampling.LANCZOS)
        
        # Apply Visual Enhancements (Step 5)
        # 1. Background blur/cut-out (Simulated with vignette + focus)
        # 2. Color grading & contrast boost
        # 3. Face enhancement (handled by template logic usually, but here we do global)
        img = enhance_image(img)
        img = apply_vignette(img)
        
        # Create overlay based on template
        if template_type == 'clean':
            thumbnail = apply_clean_template(img, video_title)
        elif template_type == 'face':
            thumbnail = apply_face_template(img, video_title, frame_analysis)
        elif template_type == 'gradient':
            thumbnail = apply_gradient_template(img, video_title)
        elif template_type == 'creator':
            thumbnail = apply_creator_template(img, video_title)
        else:
            thumbnail = img  # Default: no template
        
        # Save thumbnail
        temp_dir = tempfile.mkdtemp()
        thumbnail_path = os.path.join(temp_dir, f"thumbnail_{template_type}.jpg")
        thumbnail.save(thumbnail_path, 'JPEG', quality=90)
        
        return thumbnail_path
        
    except Exception as e:
        logger.error(f"Failed to generate thumbnail with template {template_type}: {e}")
        return frame_path  # Fallback to original frame


def apply_clean_template(img: Image.Image, title: str) -> Image.Image:
    """Apply clean title overlay template"""
    draw = ImageDraw.Draw(img)
    
    # Add semi-transparent overlay at bottom
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 128))
    img.paste(overlay, (0, 0), overlay)
    
    # Add title text
    try:
        font = ImageFont.truetype("arial.ttf", 48)
    except:
        font = ImageFont.load_default()
    
    # Wrap text if too long
    max_width = img.width - 100
    lines = []
    words = title.split()
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                lines.append(word)
    
    if current_line:
        lines.append(' '.join(current_line))
    
    # Draw text
    y_position = img.height - 100 - (len(lines) - 1) * 60
    for line in lines[:3]:  # Max 3 lines
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x_position = (img.width - text_width) // 2
        
        draw.text((x_position, y_position), line, fill='white', font=font)
        y_position += 60
    
    return img


def apply_face_template(img: Image.Image, title: str, analysis: dict) -> Image.Image:
    """Apply face-focused template"""
    # Similar to clean template but optimized for faces
    return apply_clean_template(img, title)


def apply_gradient_template(img: Image.Image, title: str) -> Image.Image:
    """Apply gradient background template"""
    draw = ImageDraw.Draw(img)
    
    # Create gradient overlay
    for y in range(img.height):
        alpha = int(255 * (y / img.height))
        color = (0, 0, 0, alpha // 2)
        draw.line([(0, y), (img.width, y)], fill=color)
    
    # Add title
    try:
        font = ImageFont.truetype("arial.ttf", 48)
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), title, font=font)
    text_width = bbox[2] - bbox[0]
    x_position = (img.width - text_width) // 2
    y_position = img.height - 100
    
    # Add text shadow
    draw.text((x_position + 2, y_position + 2), title, fill='black', font=font)
    draw.text((x_position, y_position), title, fill='white', font=font)
    
    return img


def apply_creator_template(img: Image.Image, title: str) -> Image.Image:
    """Apply creator-style template"""
    draw = ImageDraw.Draw(img)
    
    # Add border
    border_color = (255, 255, 255)
    draw.rectangle([(10, 10), (img.width - 10, img.height - 10)], 
                  outline=border_color, width=5)
    
    # Add title at bottom with background
    try:
        font = ImageFont.truetype("arial.ttf", 48)
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), title, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Background rectangle
    padding = 20
    bg_x = (img.width - text_width) // 2 - padding
    bg_y = img.height - text_height - 40
    bg_width = text_width + (padding * 2)
    bg_height = text_height + (padding * 2)
    
    draw.rectangle([(bg_x, bg_y), (bg_x + bg_width, bg_y + bg_height)], 
                  fill=(0, 0, 0, 200))
    
    # Draw text
    x_position = (img.width - text_width) // 2
    y_position = img.height - text_height - 20
    
    draw.text((x_position, y_position), title, fill='white', font=font)
    
    return img


def cleanup_temp_files(file_paths: list):
    """Clean up temporary files"""
    for path in file_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file {path}: {e}")


def enhance_image(img: Image.Image) -> Image.Image:
    """
    Apply visual enhancements to thumbnail base image
    - Contrast boost
    - Saturation boost
    - Sharpening
    """
    # 1. Contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.2)  # 20% boost
    
    # 2. Color/Saturation
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.3)  # 30% boost (vibrant)
    
    # 3. Sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.5)  # Sharpen details
    
    return img


def apply_vignette(img: Image.Image) -> Image.Image:
    """Apply cinematic vignette effect"""
    width, height = img.size
    
    # Create vignette mask
    # Simple radial gradient simulation
    
    # Check if numpy is available (it is imported as np)
    try:
        # Create gradient mask
        xx, yy = np.mgrid[:height, :width]
        
        # Normalized distance from center
        center_y, center_x = height / 2, width / 2
        distance = np.sqrt((xx - center_y) ** 2 + (yy - center_x) ** 2)
        max_dist = np.sqrt(center_y ** 2 + center_x ** 2)
        
        # Vignette strength
        normalized_dist = distance / max_dist
        vignette_arr = normalized_dist * 255 * 0.7
        vignette_arr = np.clip(vignette_arr, 0, 255).astype('uint8')
        
        # Create PIL image from mask
        mask_layer = Image.fromarray(vignette_arr, mode='L')
        
        # Create black layer
        black_layer = Image.new('RGBA', img.size, (0, 0, 0, 255))
        black_layer.putalpha(mask_layer)
        
        # Composite
        img = img.convert('RGBA')
        img = Image.alpha_composite(img, black_layer)
        
        return img.convert('RGB')
        
    except Exception as e:
        logger.warning(f"Vignette failed: {e}")
        return img
