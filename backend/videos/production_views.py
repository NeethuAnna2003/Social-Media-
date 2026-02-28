"""
Production-ready API Views for AI Caption and Thumbnail System
Comprehensive endpoints with proper error handling and validation
"""

from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from celery.result import AsyncResult
import logging

from .models import (
    Video, Caption, CaptionProcessingJob,
    ThumbnailOption, VideoLike, VideoComment
)
from .serializers import (
    VideoSerializer, VideoCreateSerializer, VideoUpdateSerializer,
    VideoListSerializer, CaptionSerializer, ThumbnailOptionSerializer,
    VideoCommentSerializer, CaptionProcessingJobSerializer
)
# Use Unified Service
from .services.unified_caption_service import UnifiedCaptionService
from .celery_tasks import (
    generate_video_captions_async,
    translate_video_captions_async,
    generate_video_thumbnails_async
)

logger = logging.getLogger(__name__)


class VideoUploadView(generics.CreateAPIView):
    """
    Upload a new video with proper metadata extraction
    POST /api/videos/upload/
    """
    queryset = Video.objects.all()
    serializer_class = VideoCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def perform_create(self, serializer):
        video = serializer.save(user=self.request.user)
        
        # Extract video metadata
        try:
            import subprocess
            import os
            
            video_path = video.video_file.path
            
            # Get video duration using ffprobe
            try:
                duration_cmd = [
                    'ffprobe', '-v', 'error',
                    '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    video_path
                ]
                duration = float(subprocess.check_output(duration_cmd).decode().strip())
                video.duration = int(duration)
            except Exception as e:
                logger.warning(f"Could not extract video duration: {e}")
                video.duration = 30  # Default fallback
            
            # Get file size
            video.file_size = os.path.getsize(video_path)
            
            # Set status to ready for processing
            video.status = 'ready'
            video.processing_progress = 100
            video.save()
            
            logger.info(f"Video uploaded successfully: {video.title} (ID: {video.id}, Duration: {video.duration}s)")
            
        except Exception as e:
            logger.error(f"Error extracting video metadata: {e}")
            # Still set to ready even if metadata extraction fails
            video.status = 'ready'
            video.processing_progress = 100
            video.duration = 30  # Default
            video.save()
    
    def create(self, request, *args, **kwargs):
        """Override create to return VideoSerializer response with ID"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the created video and return with VideoSerializer
        video = serializer.instance
        output_serializer = VideoSerializer(video, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class VideoListView(generics.ListAPIView):
    """
    List videos with filtering options
    GET /api/videos/
    """
    serializer_class = VideoListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Default: Feed only shows published videos
        queryset = Video.objects.filter(status='published')
        
        # Filter by user if requested
        user_id = self.request.query_params.get('user_id')
        if user_id:
            # If viewing a specific user, start with filtering by that user
            # But we must respect the base 'published' filter unless user is viewing themselves
            
            # Reset base query if needed:
            # If status filter is explicitly provided, we might want to allow it
            pass

        # Re-structure for clarity:
        base_status = 'published'
        status_filter = self.request.query_params.get('status')
        
        # If user is viewing their own profile, allow them to see specific statuses
        if user_id and str(user_id) == str(self.request.user.id):
             if status_filter:
                 base_status = status_filter
                 queryset = Video.objects.filter(user_id=user_id, status=base_status)
             else:
                 # Owner viewing their own videos (without status param) -> usually wants to see everything?
                 # Or just published?
                 # Let's say if no status param, show everything for owner
                 queryset = Video.objects.filter(user_id=user_id)
        else:
            # Viewing feed or other user
            if user_id:
                queryset = Video.objects.filter(user_id=user_id, status='published')
            else:
                # Main Feed
                queryset = Video.objects.filter(status='published')

        return queryset.select_related('user').prefetch_related('thumbnail_options')


class VideoDetailView(generics.RetrieveUpdateAPIView):
    """
    Get or update video details
    GET /api/videos/{id}/
    PATCH /api/videos/{id}/
    """
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.method == 'GET':
            return Video.objects.filter(
                Q(is_public=True) | Q(user=self.request.user)
            ).select_related('user').prefetch_related('captions', 'thumbnail_options')
        return Video.objects.filter(user=self.request.user)


class VideoProcessingStatusView(APIView):
    """
    Get video processing status and job progress
    GET /api/videos/{id}/status/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        # Get latest processing jobs
        caption_jobs = video.caption_jobs.all().order_by('-created_at')
        
        response_data = {
            'video_status': video.status,
            'processing_progress': video.processing_progress,
            'error_message': video.error_message,
            'caption_jobs': CaptionProcessingJobSerializer(caption_jobs, many=True).data,
            'captions_count': video.captions.count(),
            'thumbnails_count': video.thumbnail_options.count()
        }
        
        return Response(response_data)


class DetectLanguageView(APIView):
    """
    Detect spoken language from video audio
    POST /api/videos/{id}/detect-language/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        try:
            # Trigger async generation with auto detection
            from .celery_tasks import generate_video_captions_async
            
            # Start async task
            task = generate_video_captions_async.delay(video.id, 'auto')
            
            return Response({
                'message': 'Language detection and caption generation started',
                'task_id': task.id,
                'status': 'processing'
            })
            
        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            return Response(
                {'error': 'Failed to start language detection'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GenerateCaptionsView(APIView):
    """
    Generate captions for a video using Unified AI Service
    POST /api/videos/{id}/captions/generate/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)

        # Reset stuck 'processing' status (from previous failed attempts)
        if video.status == 'processing':
            logger.warning(f"Video {video.id} stuck in 'processing' — resetting to 'ready'.")
            video.status = 'ready'
            video.processing_progress = 100
            video.error_message = "Previous processing was interrupted"
            video.save()

        # Validate video is ready for processing
        if video.status not in ['ready', 'failed', 'completed']:
            return Response(
                {'error': f'Video is not ready. Current status: {video.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        language = request.data.get('language', 'auto')

        # ALWAYS delete existing captions and regenerate fresh
        deleted_count = video.captions.filter(is_translated=False).count()
        if deleted_count > 0:
            video.captions.filter(is_translated=False).delete()
            logger.info(f"Deleted {deleted_count} old captions for video {video.id} — regenerating.")

        # Update video status
        video.status = 'processing'
        video.processing_progress = 0
        video.error_message = None
        video.save()

        # Create processing job
        job = CaptionProcessingJob.objects.create(
            video=video,
            source_language=language,
            target_language=language
        )

        try:
            logger.info(f"Starting caption generation for video {video.id} (lang={language})")

            service = UnifiedCaptionService()
            created_captions = service.generate_captions(video, language, job)

            captions_data = []
            detected_language = language if language != 'auto' else 'en'

            if created_captions:
                detected_language = created_captions[0].language
                for caption in created_captions:
                    captions_data.append({
                        'id': caption.id,
                        'start_time': float(caption.start_time),
                        'end_time': float(caption.end_time),
                        'text': caption.text,
                        'language': caption.language,
                        'confidence': float(caption.confidence) if caption.confidence else 0.9
                    })

            logger.info(f"Generated {len(captions_data)} captions in {detected_language}")

            return Response({
                'message': 'Captions generated successfully',
                'captions_count': len(captions_data),
                'language': detected_language,
                'captions': captions_data,
                'status': 'success'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Caption generation failed for video {video.id}: {e}", exc_info=True)
            video.status = 'failed'
            video.error_message = str(e)
            video.save()

            return Response({
                'error': f'Caption generation failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TranslateCaptionsView(APIView):
    """
    Translate captions to another language
    POST /api/videos/{id}/captions/translate/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        target_language = request.data.get('target_language', 'en')
        
        # Validate target language
        supported_languages = ['en', 'ml', 'hi', 'ta', 'te', 'kn', 'bn', 'gu', 'mr', 'pa', 'or', 'as']
        if target_language not in supported_languages:
            return Response(
                {'error': f'Unsupported target language: {target_language}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get original captions
        if video.original_language:
            original_captions = video.captions.filter(
                language=video.original_language,
                is_translated=False
            )
        else:
            original_captions = video.captions.filter(is_translated=False)
        
        if not original_captions.exists():
            return Response(
                {'error': 'No captions found to translate. Please generate captions first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if translation already exists
        existing_translation = video.captions.filter(
            language=target_language,
            is_translated=True
        )
        if existing_translation.exists():
            regenerate = request.data.get('regenerate', False)
            if not regenerate:
                return Response({
                    'message': 'Translation already exists',
                    'captions_count': existing_translation.count(),
                    'target_language': target_language,
                    'regenerate_option': True
                })
            
            # Delete existing translation
            existing_translation.delete()
        
        try:
            # Process translation asynchronously
            task = translate_video_captions_async.delay(video.id, target_language)
            
            return Response({
                'message': 'Translation started',
                'task_id': task.id,
                'target_language': target_language,
                'source_language': video.original_language or original_captions.first().language
            })
            
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return Response(
                {'error': f'Failed to start translation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoCaptionsView(generics.ListAPIView):
    """
    Get captions for a video with language filtering
    GET /api/videos/{id}/captions/
    """
    serializer_class = CaptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        video_id = self.kwargs['pk']
        language = self.request.query_params.get('language')
        translated_only = self.request.query_params.get('translated_only', 'false').lower() == 'true'
        
        queryset = Caption.objects.filter(video_id=video_id)
        
        if language:
            queryset = queryset.filter(language=language)
        
        if translated_only:
            queryset = queryset.filter(is_translated=True)
        
        return queryset.order_by('start_time')
    
    def list(self, request, *args, **kwargs):
        """Override to add video context"""
        video_id = self.kwargs['pk']
        video = get_object_or_404(Video, pk=video_id)
        
        # Check permissions
        if not (video.is_public or video.user == request.user):
            return Response(
                {'error': 'Video not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'video_id': video.id,
            'video_title': video.title,
            'original_language': video.original_language,
            'translation_language': video.translation_language,
            'captions': serializer.data
        })


class UpdateCaptionView(generics.UpdateAPIView):
    """
    Update a specific caption
    PATCH /api/videos/captions/{id}/
    """
    queryset = Caption.objects.all()
    serializer_class = CaptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Users can only edit captions of their own videos
        return Caption.objects.filter(video__user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Override update to add validation and better error messages"""
        try:
            partial = kwargs.pop('partial', True)  # Allow partial updates
            instance = self.get_object()
            
            # Log the incoming data for debugging
            logger.info(f"Updating caption {instance.id} with data: {request.data}")
            
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            
            if not serializer.is_valid():
                logger.error(f"Caption update validation failed: {serializer.errors}")
                return Response({
                    'error': 'Invalid caption data',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            self.perform_update(serializer)
            
            return Response({
                'message': 'Caption updated successfully',
                'caption': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Caption update failed: {e}")
            return Response({
                'error': f'Failed to update caption: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def perform_update(self, serializer):
        """Mark caption as manually edited"""
        caption = serializer.save()
        logger.info(f"Caption {caption.id} updated by user {self.request.user.id}: {caption.text}")



class DeleteCaptionView(generics.DestroyAPIView):
    """
    Delete a specific caption
    DELETE /api/videos/captions/{id}/
    """
    queryset = Caption.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Caption.objects.filter(video__user=self.request.user)


class GenerateThumbnailsView(APIView):
    """
    Generate thumbnail options using AI
    POST /api/videos/{id}/thumbnails/generate/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        # Validate video status
        if video.status not in ['ready', 'failed', 'completed']:
            return Response(
                {'error': f'Video is not ready for thumbnail generation. Current status: {video.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get template preferences
        templates = request.data.get('templates', ['clean', 'face', 'gradient', 'creator'])
        custom_text = request.data.get('custom_text') # Step 4/8: User can Edit/Override Text
        valid_templates = ['clean', 'face', 'gradient', 'creator']
        
        # Filter valid templates
        templates = [t for t in templates if t in valid_templates]
        
        if not templates:
            templates = valid_templates
        
        try:
            # Check if thumbnails already exist
            existing_thumbnails = video.thumbnail_options.all()
            if existing_thumbnails.exists():
                regenerate = request.data.get('regenerate', False)
                if not regenerate:
                    return Response({
                        'message': 'Thumbnails already exist',
                        'thumbnails_count': existing_thumbnails.count(),
                        'templates': list(existing_thumbnails.values_list('template', flat=True)),
                        'regenerate_option': True
                    })
                
                # Delete existing thumbnails
                existing_thumbnails.delete()
            
            # Update video status
            video.status = 'processing'
            video.processing_progress = 0
            video.error_message = None
            video.save()
            
            # Generate thumbnails asynchronously
            task = generate_video_thumbnails_async.delay(video.id, templates, custom_text=custom_text)
            
            return Response({
                'message': 'Thumbnail generation started',
                'task_id': task.id,
                'templates': templates,
                'estimated_time': 'Processing in background'
            })
            
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {e}")
            return Response(
                {'error': f'Failed to start thumbnail generation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoThumbnailsView(generics.ListAPIView):
    """
    Get thumbnail options for a video
    GET /api/videos/{id}/thumbnails/
    """
    serializer_class = ThumbnailOptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        video_id = self.kwargs['pk']
        return ThumbnailOption.objects.filter(video_id=video_id).order_by('-quality_score')
    
    def list(self, request, *args, **kwargs):
        """Override to add video context"""
        video_id = self.kwargs['pk']
        video = get_object_or_404(Video, pk=video_id)
        
        # Check permissions
        if not (video.is_public or video.user == request.user):
            return Response(
                {'error': 'Video not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'video_id': video.id,
            'video_title': video.title,
            'selected_thumbnail': video.thumbnail.id if video.thumbnail else None,
            'thumbnails': serializer.data
        })


class SelectThumbnailView(APIView):
    """
    Select a thumbnail for the video
    POST /api/videos/{id}/thumbnails/select/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        thumbnail_id = request.data.get('thumbnail_id')
        
        if not thumbnail_id:
            return Response(
                {'error': 'thumbnail_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            thumbnail = get_object_or_404(
                ThumbnailOption, 
                pk=thumbnail_id, 
                video=video
            )
            
            # Update video thumbnail
            video.thumbnail = thumbnail.image
            video.save()
            
            # Mark as selected
            video.thumbnail_options.update(is_selected=False)
            thumbnail.is_selected = True
            thumbnail.save()
            
            return Response({
                'message': 'Thumbnail selected successfully',
                'thumbnail_id': thumbnail.id,
                'template': thumbnail.template
            })
            
        except Exception as e:
            logger.error(f"Thumbnail selection failed: {e}")
            return Response(
                {'error': f'Failed to select thumbnail: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaskStatusView(APIView):
    """
    Get status of async tasks
    GET /api/tasks/{task_id}/status/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, task_id):
        try:
            result = AsyncResult(task_id)
            
            response_data = {
                'task_id': task_id,
                'status': result.status,
                'ready': result.ready(),
                'successful': result.successful() if result.ready() else None,
                'result': result.result if result.ready() else None,
                'error': str(result.info) if result.failed() else None
            }
            
            return Response(response_data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get task status: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoPublishView(APIView):
    """
    Publish or schedule a video
    POST /api/videos/{id}/publish/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        # Get scheduled time if provided
        scheduled_at = request.data.get('scheduled_at') or request.data.get('scheduled_for')
        
        # Validate video is ready
        if video.status not in ['ready', 'completed', 'draft']:
             # Allow re-scheduling if already scheduled?
             if video.status == 'scheduled' and scheduled_at:
                 pass # updating schedule
             else:
                return Response(
                    {'error': f'Video cannot be published. Current status: {video.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # IMPORTANT: Validate captions exist (optional but good practice)
        # if not video.captions.exists():
        #     return Response(
        #         {'error': 'Please generate captions before publishing. Captions are required.'},
        #         status=status.HTTP_400_BAD_REQUEST
        #     )
        
        try:
            if scheduled_at:
                # Schedule for later
                from datetime import datetime
                
                # Handle ISO format
                try:
                    scheduled_datetime = datetime.fromisoformat(str(scheduled_at).replace('Z', '+00:00'))
                except ValueError:
                     return Response(
                        {'error': 'Invalid date format. Use ISO 8601.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate future time
                if scheduled_datetime <= timezone.now():
                    return Response(
                        {'error': 'Scheduled time must be in the future'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Update Video status
                video.status = 'scheduled'
                video.scheduled_at = scheduled_datetime
                video.save()
                
                return Response({
                    'message': 'Video scheduled successfully',
                    'status': 'scheduled',
                    'scheduled_at': video.scheduled_at
                })
            else:
                # Publish immediately
                post = video.publish()
                
                if post:
                     return Response({
                        'message': 'Video published successfully',
                        'status': video.status,
                        'published_at': video.published_at,
                        'post_id': post.id
                    })
                else:
                    return Response(
                        {'error': 'Failed to publish video. It might already be published.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        except Exception as e:
            return Response(
                {'error': f'Publishing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



# Existing views for engagement (likes, comments) remain the same
class VideoLikeView(APIView):
    """
    Like or unlike a video
    POST /api/videos/{id}/like/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        
        like, created = VideoLike.objects.get_or_create(
            video=video,
            user=request.user
        )
        
        if not created:
            # Unlike
            like.delete()
            liked = False
        else:
            liked = True
        
        # Update like count
        video.likes_count = video.likes.count()
        video.save()
        
        return Response({
            'liked': liked,
            'likes_count': video.likes_count
        })


class VideoCommentsView(generics.ListCreateAPIView):
    """
    Get or create video comments
    GET /api/videos/{id}/comments/
    POST /api/videos/{id}/comments/
    """
    serializer_class = VideoCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        video_id = self.kwargs['pk']
        return VideoComment.objects.filter(video_id=video_id).select_related('user')
    
    def perform_create(self, serializer):
        video_id = self.kwargs['pk']
        video = get_object_or_404(Video, pk=video_id)
        
        comment = serializer.save(
            user=self.request.user,
            video=video
        )
        
        # Update comment count
        video.comments_count = video.comments.count()
        video.save()
        
        return comment
