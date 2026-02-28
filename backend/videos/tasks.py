"""
Celery Tasks for AI Video Processing
Async caption and thumbnail generation
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_captions_task(self, job_id: int):
    """
    Async task to generate captions for a video
    
    Args:
        job_id: ID of CaptionProcessingJob
    """
    from .models import CaptionProcessingJob, Caption, Video
    from .services.caption_service import CaptionGenerationService
    
    try:
        # Get job
        job = CaptionProcessingJob.objects.select_related('video').get(id=job_id)
        video = job.video
        
        logger.info(f"Starting caption generation task for job {job_id}, video {video.id}")
        
        # Update job status
        job.status = 'extracting_audio'
        job.started_at = timezone.now()
        job.save()
        
        # Generate captions
        service = CaptionGenerationService()
        result = service.generate_captions(
            video_path=video.video_file.path,
            language=job.target_language or 'auto',
            job=job
        )
        
        if result['success']:
            # Save captions to database in a transaction
            with transaction.atomic():
                # Delete old captions if regenerating
                Caption.objects.filter(
                    video=video,
                    language=result['detected_language'],
                    is_manually_edited=False
                ).delete()
                
                # Create new captions
                captions_to_create = []
                for caption_data in result['captions']:
                    captions_to_create.append(
                        Caption(
                            video=video,
                            language=result['detected_language'],
                            start_time=caption_data['start_time'],
                            end_time=caption_data['end_time'],
                            text=caption_data['text'],
                            confidence=caption_data.get('confidence', 0.0)
                        )
                    )
                
                Caption.objects.bulk_create(captions_to_create)
                
                # Update job
                job.status = 'completed'
                job.detected_language = result['detected_language']
                job.captions_generated = len(captions_to_create)
                job.completed_at = timezone.now()
                job.save()
                
                # Update video
                video.original_language = result['detected_language']
                video.has_captions = True
                video.caption_status = 'ready'
                video.error_message = None
                video.save()
            
            logger.info(f"Caption generation completed for job {job_id}: {len(captions_to_create)} captions")
            
        else:
            # Handle failure
            job.status = 'failed'
            job.error_message = result['error']
            job.error_type = result.get('error_type', 'unknown')
            job.save()
            
            video.caption_status = 'failed'
            video.error_message = result['error']
            video.save()
            
            logger.error(f"Caption generation failed for job {job_id}: {result['error']}")
            
    except CaptionProcessingJob.DoesNotExist:
        logger.error(f"CaptionProcessingJob {job_id} not found")
        
    except Exception as e:
        logger.error(f"Caption generation task failed for job {job_id}: {e}", exc_info=True)
        
        # Retry logic
        try:
            job = CaptionProcessingJob.objects.get(id=job_id)
            job.retry_count += 1
            job.error_message = str(e)
            job.save()
            
            if job.can_retry():
                # Retry with exponential backoff
                logger.info(f"Retrying caption generation for job {job_id} (attempt {job.retry_count})")
                raise self.retry(exc=e, countdown=60 * (2 ** job.retry_count))
            else:
                job.status = 'failed'
                job.save()
                logger.error(f"Max retries exceeded for job {job_id}")
        except Exception as retry_error:
            logger.error(f"Failed to handle retry for job {job_id}: {retry_error}")


@shared_task(bind=True, max_retries=3)
def translate_captions_task(self, video_id: int, target_language: str):
    """
    Async task to translate captions
    
    Args:
        video_id: ID of Video
        target_language: Target language code
    """
    from .models import Video, Caption
    from .services.translation_service import CaptionTranslationService
    
    try:
        video = Video.objects.get(id=video_id)
        
        logger.info(f"Starting caption translation for video {video_id} to {target_language}")
        
        # Get original captions
        if video.original_language:
            original_captions = Caption.objects.filter(
                video=video,
                language=video.original_language,
                is_translated=False
            )
        else:
            original_captions = Caption.objects.filter(
                video=video,
                is_translated=False
            )
        
        if not original_captions.exists():
            logger.warning(f"No original captions found for video {video_id}")
            return
        
        # Translate captions
        service = CaptionTranslationService()
        result = service.translate_captions(
            list(original_captions),
            video.original_language or original_captions.first().language,
            target_language
        )
        
        if result['success']:
            # Save translated captions
            with transaction.atomic():
                # Delete old translations
                Caption.objects.filter(
                    video=video,
                    language=target_language,
                    is_translated=True
                ).delete()
                
                # Create new translations
                translated_to_create = []
                for caption_data in result['translated_captions']:
                    translated_to_create.append(
                        Caption(
                            video=video,
                            language=target_language,
                            start_time=caption_data['start_time'],
                            end_time=caption_data['end_time'],
                            text=caption_data['text'],
                            is_translated=True,
                            original_text=caption_data.get('original_text', '')
                        )
                    )
                
                Caption.objects.bulk_create(translated_to_create)
                
                # Update video
                video.translation_language = target_language
                video.save()
            
            logger.info(f"Translation completed for video {video_id}: {len(translated_to_create)} captions")
            
        else:
            logger.error(f"Translation failed for video {video_id}: {result['error']}")
            
    except Video.DoesNotExist:
        logger.error(f"Video {video_id} not found")
        
    except Exception as e:
        logger.error(f"Translation task failed for video {video_id}: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=60)


@shared_task
def cleanup_old_jobs():
    """
    Periodic task to cleanup old processing jobs
    Runs every hour via Celery Beat
    """
    from .models import CaptionProcessingJob, ThumbnailProcessingJob
    from datetime import timedelta
    
    cutoff_date = timezone.now() - timedelta(days=7)
    
    # Delete old completed jobs
    deleted_caption_jobs = CaptionProcessingJob.objects.filter(
        status='completed',
        completed_at__lt=cutoff_date
    ).delete()
    
    deleted_thumbnail_jobs = ThumbnailProcessingJob.objects.filter(
        status='completed',
        completed_at__lt=cutoff_date
    ).delete()
    
    logger.info(f"Cleaned up {deleted_caption_jobs[0]} caption jobs and {deleted_thumbnail_jobs[0]} thumbnail jobs")


@shared_task
def cleanup_temp_files():
    """
    Periodic task to cleanup temporary files
    """
    import os
    from pathlib import Path
    from django.conf import settings
    from datetime import datetime, timedelta
    
    temp_dirs = [
        settings.TEMP_AUDIO_DIR,
        settings.TEMP_FRAMES_DIR
    ]
    
    cutoff_time = datetime.now() - timedelta(hours=1)
    files_deleted = 0
    
    for temp_dir in temp_dirs:
        if not os.path.exists(temp_dir):
            continue
            
        for file_path in Path(temp_dir).glob('*'):
            try:
                if file_path.is_file():
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if file_time < cutoff_time:
                        file_path.unlink()
                        files_deleted += 1
            except Exception as e:
                logger.warning(f"Failed to delete temp file {file_path}: {e}")
    
    logger.info(f"Cleaned up {files_deleted} temporary files")
