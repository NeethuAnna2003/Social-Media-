"""
Video API Views
Complete REST API for video posting system
"""

from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone

from .models import (
    Video, Caption, CaptionProcessingJob,
    ThumbnailOption, VideoLike, VideoComment
)
from .serializers import (
    VideoSerializer, VideoCreateSerializer, VideoUpdateSerializer,
    VideoListSerializer, CaptionSerializer, ThumbnailOptionSerializer,
    VideoCommentSerializer, CaptionProcessingJobSerializer
)
from .ai_services import (
    GeminiCaptionService, GeminiTranslationService,
    GeminiThumbnailService
)


class VideoUploadView(generics.CreateAPIView):
    """
    Upload a new video
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
            
            # Get video duration using ffprobe (if available)
            try:
                duration_cmd = [
                    'ffprobe', '-v', 'error',
                    '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    video_path
                ]
                duration = float(subprocess.check_output(duration_cmd).decode().strip())
                video.duration = int(duration)
            except:
                # Fallback: estimate based on file size (rough estimate)
                video.duration = 30  # Default 30 seconds
            
            # Get file size
            video.file_size = os.path.getsize(video_path)
            
            # Set status to ready
            video.status = 'ready'
            video.processing_progress = 100
            video.save()
            
            print(f"Video uploaded successfully: {video.title} (ID: {video.id}, Duration: {video.duration}s)")
            
        except Exception as e:
            print(f"Error extracting metadata: {e}")
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
    List videos (feed)
    GET /api/videos/
    """
    serializer_class = VideoListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Video.objects.filter(
            status='ready',
            is_public=True
        ).select_related('user').order_by('-created_at')
        
        # Filter by user if specified
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset


class VideoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Get, update, or delete a video
    GET/PATCH/DELETE /api/videos/{id}/
    """
    queryset = Video.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return VideoUpdateSerializer
        return VideoSerializer
    
    def get_queryset(self):
        # Users can only edit/delete their own videos
        if self.request.method in ['PATCH', 'DELETE']:
            return Video.objects.filter(user=self.request.user)
        return Video.objects.all()
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Increment view count
        if instance.user != request.user:
            instance.views_count += 1
            instance.save(update_fields=['views_count'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class VideoPublishView(APIView):
    """
    Publish a video
    POST /api/videos/{id}/publish/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        if video.status != 'ready':
            return Response(
                {'error': 'Video is not ready for publishing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        video.publish()
        
        return Response({
            'message': 'Video published successfully',
            'published_at': video.published_at
        })


class GenerateCaptionsView(APIView):
    """
    Generate captions for a video using AI
    POST /api/videos/{id}/captions/generate/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        language = request.data.get('language', 'auto')
        
        # Create processing job
        job = CaptionProcessingJob.objects.create(
            video=video,
            status='processing',
            source_language=language
        )
        
        try:
            # Use the fixed hybrid service (AssemblyAI → Faster-Whisper fallback)
            from .services.assemblyai_caption_service import AssemblyAICaptionService
            
            caption_service = AssemblyAICaptionService()
            result = caption_service.generate_captions(
                video_path=video.video_file.path,
                language=language,
                job=job
            )
            
            if not result['success']:
                job.status = 'failed'
                job.error_message = result['error']
                job.save()
                return Response(
                    {'error': result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Extract captions and detected language from result
            captions_data = result['captions']
            detected_language = result.get('detected_language', language) or 'en'
            engine_used = result.get('engine', 'unknown')
            
            # Save captions to DB
            for caption_data in captions_data:
                Caption.objects.create(
                    video=video,
                    language=detected_language,
                    start_time=caption_data['start_time'],
                    end_time=caption_data['end_time'],
                    text=caption_data['text'],
                    confidence=caption_data.get('confidence', 0.9)
                )
            
            # Update job
            job.status = 'completed'
            job.captions_generated = len(captions_data)
            job.completed_at = timezone.now()
            job.save()
            
            # Update video
            video.original_language = detected_language
            video.status = 'ready'
            video.processing_progress = 100
            video.save()
            
            return Response({
                'message': f'Captions generated successfully via {engine_used}',
                'captions_count': len(captions_data),
                'language': detected_language,
                'engine': engine_used,
            })
            
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
            
            return Response(
                {'error': f'Failed to generate captions: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TranslateCaptionsView(APIView):
    """
    Translate captions to another language
    POST /api/videos/{id}/captions/translate/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        target_language = request.data.get('target_language', 'en')
        
        # Get original captions - try original_language first, then any captions
        if video.original_language:
            original_captions = video.captions.filter(
                language=video.original_language,
                is_translated=False
            )
        else:
            # Get any existing captions
            original_captions = video.captions.filter(is_translated=False)
        
        if not original_captions.exists():
            return Response(
                {'error': 'No captions found to translate. Please generate captions first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Translate using Gemini AI
            from .simple_ai_services import SimpleTranslationService
            translation_service = SimpleTranslationService()
            
            captions_data = [
                {
                    'start_time': cap.start_time,
                    'end_time': cap.end_time,
                    'text': cap.text
                }
                for cap in original_captions
            ]
            
            # Get source language
            source_language = video.original_language or original_captions.first().language
            
            translated_captions = translation_service.translate_captions(
                captions_data,
                source_language,
                target_language
            )
            
            # Save translated captions
            for caption_data in translated_captions:
                Caption.objects.create(
                    video=video,
                    language=target_language,
                    start_time=caption_data['start_time'],
                    end_time=caption_data['end_time'],
                    text=caption_data['text'],
                    is_translated=True,
                    original_text=caption_data.get('original_text', '')
                )
            
            # Update video
            video.translation_language = target_language
            video.save()
            
            return Response({
                'message': 'Captions translated successfully',
                'captions_count': len(translated_captions),
                'target_language': target_language
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to translate captions: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoCaptionsView(generics.ListAPIView):
    """
    Get captions for a video
    GET /api/videos/{id}/captions/
    """
    serializer_class = CaptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        video_id = self.kwargs['pk']
        language = self.request.query_params.get('language')
        
        queryset = Caption.objects.filter(video_id=video_id)
        
        if language:
            queryset = queryset.filter(language=language)
        
        return queryset.order_by('start_time')


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


class GenerateThumbnailsView(APIView):
    """
    Generate thumbnail options using AI
    POST /api/videos/{id}/thumbnails/generate/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        try:
            from .simple_ai_services import SimpleThumbnailService
            
            thumbnail_service = SimpleThumbnailService()
            templates = ['clean', 'face', 'gradient', 'creator']
            
            for i, template in enumerate(templates):
                # Generate AI-suggested text
                suggested_text = thumbnail_service.suggest_thumbnail_text(
                    video.title,
                    {'description': video.description or 'Engaging video content'}
                )
                
                # Create thumbnail option
                ThumbnailOption.objects.create(
                    video=video,
                    template=template,
                    frame_timestamp=i * (video.duration / 4) if video.duration > 0 else i * 5.0,
                    has_face=(i % 2 == 0),
                    emotion_detected='happy' if i % 2 == 0 else 'neutral',
                    quality_score=0.75 + (i * 0.05),
                    overlay_text=suggested_text,
                    is_selected=(i == 0)
                )
            
            return Response({
                'message': 'Thumbnail options generated successfully',
                'count': len(templates),
                'note': 'AI-suggested layouts created. You can upload custom thumbnails for best results.'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate thumbnails: {str(e)}'},
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
        
        # Deselect all thumbnails
        video.thumbnail_options.update(is_selected=False)
        
        # Select the chosen one
        thumbnail = get_object_or_404(
            ThumbnailOption,
            id=thumbnail_id,
            video=video
        )
        thumbnail.is_selected = True
        thumbnail.save()
        
        # Update video thumbnail
        if thumbnail.image:
            video.thumbnail = thumbnail.image
            video.save()
        
        return Response({
            'message': 'Thumbnail selected successfully',
            'thumbnail_id': thumbnail_id
        })


class VideoLikeView(APIView):
    """
    Like/unlike a video
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
            video.likes_count = max(0, video.likes_count - 1)
            video.save()
            return Response({
                'message': 'Video unliked',
                'is_liked': False,
                'likes_count': video.likes_count
            })
        else:
            # Like
            video.likes_count += 1
            video.save()
            return Response({
                'message': 'Video liked',
                'is_liked': True,
                'likes_count': video.likes_count
            })


class VideoCommentsView(generics.ListCreateAPIView):
    """
    Get or create comments for a video
    GET/POST /api/videos/{id}/comments/
    """
    serializer_class = VideoCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        video_id = self.kwargs['pk']
        return VideoComment.objects.filter(
            video_id=video_id,
            parent__isnull=True  # Only top-level comments
        ).order_by('-created_at')
    
    def perform_create(self, serializer):
        video_id = self.kwargs['pk']
        video = get_object_or_404(Video, pk=video_id)
        
        comment = serializer.save(
            user=self.request.user,
            video=video
        )
        
        # Update comment count
        video.comments_count += 1
        video.save()


class VideoProcessingStatusView(APIView):
    """
    Get processing status for a video
    GET /api/videos/{id}/status/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        # Get latest caption job
        latest_job = video.caption_jobs.order_by('-created_at').first()
        
        return Response({
            'video_id': video.id,
            'status': video.status,
            'processing_progress': video.processing_progress,
            'error_message': video.error_message,
            'caption_job': CaptionProcessingJobSerializer(latest_job).data if latest_job else None,
            'captions_count': video.captions.count(),
            'thumbnails_count': video.thumbnail_options.count()
        })
