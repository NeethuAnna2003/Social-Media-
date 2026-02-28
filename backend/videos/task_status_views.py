from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import Http404
import logging

from .models import Video, CaptionProcessingJob, ThumbnailOption

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_status_view(request, task_id):
    """
    Get status of a background task (caption or thumbnail generation)
    GET /api/videos/tasks/{task_id}/status/
    """
    try:
        # Try to find caption processing job first
        caption_job = CaptionProcessingJob.objects.filter(
            task_id=task_id,
            video__user=request.user
        ).first()
        
        if caption_job:
            return Response({
                'task_id': task_id,
                'task_type': 'caption',
                'status': caption_job.status,
                'progress': caption_job.progress,
                'error_message': caption_job.error_message,
                'created_at': caption_job.created_at.isoformat(),
                'updated_at': caption_job.updated_at.isoformat(),
                'video_id': caption_job.video.id,
                'video_title': caption_job.video.title,
                'captions': None,  # Will be populated when completed
            })
        
        # Thumbnail generation doesn't use a job model, it's handled by Celery directly
        # We'll check if any thumbnails were created for the video after task completion
        # For now, just handle caption jobs and Celery tasks
        
        # If no job found, check if it's a Celery task
        try:
            from celery.result import AsyncResult
            result = AsyncResult(task_id)
            
            if result.state == 'PENDING':
                return Response({
                    'task_id': task_id,
                    'task_type': 'celery',
                    'status': 'pending',
                    'progress': 0,
                    'error_message': None,
                })
            elif result.state == 'PROGRESS':
                return Response({
                    'task_id': task_id,
                    'task_type': 'celery',
                    'status': 'processing',
                    'progress': result.info.get('progress', 0),
                    'error_message': None,
                })
            elif result.state == 'SUCCESS':
                return Response({
                    'task_id': task_id,
                    'task_type': 'celery',
                    'status': 'completed',
                    'progress': 100,
                    'error_message': None,
                    'result': result.result,
                })
            elif result.state == 'FAILURE':
                return Response({
                    'task_id': task_id,
                    'task_type': 'celery',
                    'status': 'failed',
                    'progress': 0,
                    'error_message': str(result.info),
                })
            else:
                return Response({
                    'task_id': task_id,
                    'task_type': 'celery',
                    'status': result.state.lower(),
                    'progress': 0,
                    'error_message': None,
                })
                
        except Exception as e:
            logger.error(f"Error checking Celery task {task_id}: {e}")
            return Response(
                {'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
    except Exception as e:
        logger.error(f"Error getting task status {task_id}: {e}")
        return Response(
            {'error': 'Failed to get task status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
