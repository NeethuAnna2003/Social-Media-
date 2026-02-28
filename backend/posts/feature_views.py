"""
Views for Image Location Detection and Comment Filter Features
"""
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .location_models import ImageLocationCache, PostLocation
from .filter_models import ProhibitedWord, ProhibitedWordRequest, FilteredComment
from .models import Post, Comment
from .feature_serializers import (
    ImageLocationCacheSerializer,
    PostLocationSerializer,
    ProhibitedWordSerializer,
    ProhibitedWordRequestSerializer,
    ProhibitedWordRequestCreateSerializer,
    ProhibitedWordRequestReviewSerializer,
    FilteredCommentSerializer,
)
from .location_service import ImageLocationService
from .filter_service import CommentFilterService


# ==========================================
# IMAGE LOCATION DETECTION VIEWS
# ==========================================

class DetectImageLocationView(APIView):
    """
    Manually trigger location detection for a post's image.
    This is usually done automatically, but can be triggered manually.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        
        # Check if post has an image
        if not post.image and not post.media.filter(media_type='image').exists():
            return Response(
                {'error': 'Post has no image to analyze'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the image file
        image_file = None
        if post.image:
            image_file = post.image
        else:
            first_image = post.media.filter(media_type='image').first()
            if first_image:
                image_file = first_image.file
        
        if not image_file:
            return Response(
                {'error': 'Could not access image file'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Detect location
        service = ImageLocationService()
        location_data = service.get_or_detect_location(image_file)
        
        # Create or update PostLocation
        post_location, created = PostLocation.objects.get_or_create(post=post)
        
        if location_data.get('detected_location'):
            # Format display location
            display_location = f"📍 {location_data['detected_location']}"
            
            post_location.display_location = display_location
            post_location.is_detected = True
            post_location.detection_status = 'completed'
        else:
            post_location.display_location = None
            post_location.is_detected = False
            post_location.detection_status = 'no_location'
        
        post_location.save()
        
        serializer = PostLocationSerializer(post_location)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PostLocationDetailView(generics.RetrieveAPIView):
    """Get location data for a specific post."""
    serializer_class = PostLocationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'post_id'
    
    def get_queryset(self):
        return PostLocation.objects.select_related('location_cache', 'post')


# ==========================================
# COMMENT FILTER VIEWS
# ==========================================

class ProhibitedWordRequestListCreateView(generics.ListCreateAPIView):
    """
    List user's word filter requests and create new requests.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProhibitedWordRequestCreateSerializer
        return ProhibitedWordRequestSerializer
    
    def get_queryset(self):
        return ProhibitedWordRequest.objects.filter(
            user=self.request.user
        ).select_related('user', 'reviewed_by').order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create the request using the service
        service = CommentFilterService()
        word_request = service.create_filter_request(
            user_id=request.user.id,
            words=serializer.validated_data['words'],
            reason=serializer.validated_data.get('reason', '')
        )
        
        # Return the created request
        response_serializer = ProhibitedWordRequestSerializer(word_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ProhibitedWordRequestDetailView(generics.RetrieveAPIView):
    """View details of a specific word filter request."""
    serializer_class = ProhibitedWordRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ProhibitedWordRequest.objects.filter(
            user=self.request.user
        ).select_related('user', 'reviewed_by')


class ProhibitedWordListView(generics.ListAPIView):
    """
    List active prohibited words for the current user.
    """
    serializer_class = ProhibitedWordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ProhibitedWord.objects.filter(
            user=self.request.user,
            is_active=True
        ).select_related('user').order_by('word')


class ProhibitedWordToggleView(APIView):
    """
    Toggle a prohibited word on/off.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, word_id):
        word = get_object_or_404(
            ProhibitedWord,
            id=word_id,
            user=request.user
        )
        
        word.is_active = not word.is_active
        word.save()
        
        serializer = ProhibitedWordSerializer(word)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProhibitedWordDeleteView(generics.DestroyAPIView):
    """
    Delete a prohibited word.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ProhibitedWord.objects.filter(user=self.request.user)


class FilteredCommentListView(generics.ListAPIView):
    """
    List filtered comments (for the post owner to see what's being filtered).
    """
    serializer_class = FilteredCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FilteredComment.objects.filter(
            post_owner=self.request.user
        ).select_related('comment', 'post_owner', 'commenter').order_by('-created_at')


# ==========================================
# ADMIN VIEWS (For reviewing word requests)
# ==========================================

class AdminProhibitedWordRequestListView(generics.ListAPIView):
    """
    Admin view to list all pending word filter requests.
    """
    serializer_class = ProhibitedWordRequestSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        status_filter = self.request.query_params.get('status', 'pending')
        queryset = ProhibitedWordRequest.objects.select_related('user', 'reviewed_by')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')


class AdminProhibitedWordRequestReviewView(APIView):
    """
    Admin endpoint to approve or reject word filter requests.
    """
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, request_id):
        serializer = ProhibitedWordRequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        service = CommentFilterService()
        action = serializer.validated_data['action']
        admin_notes = serializer.validated_data.get('admin_notes', '')
        
        if action == 'approve':
            created_words = service.approve_request(
                request_id=request_id,
                admin_id=request.user.id,
                admin_notes=admin_notes
            )
            
            return Response({
                'status': 'approved',
                'created_words_count': len(created_words),
                'message': f'Request approved. {len(created_words)} word(s) added to filter.'
            }, status=status.HTTP_200_OK)
        
        elif action == 'reject':
            service.reject_request(
                request_id=request_id,
                admin_id=request.user.id,
                admin_notes=admin_notes
            )
            
            return Response({
                'status': 'rejected',
                'message': 'Request rejected.'
            }, status=status.HTTP_200_OK)


class AdminFilteredCommentListView(generics.ListAPIView):
    """
    Admin view to see all filtered comments across the platform.
    """
    serializer_class = FilteredCommentSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        return FilteredComment.objects.select_related(
            'comment', 'post_owner', 'commenter'
        ).order_by('-created_at')


# ==========================================
# UTILITY VIEWS
# ==========================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def check_comment_visibility(request, comment_id):
    """
    Check if a comment should be visible to the current user.
    """
    service = CommentFilterService()
    visibility = service.get_comment_visibility(comment_id, request.user.id)
    
    return Response(visibility, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_visible_comments_for_post(request, post_id):
    """
    Get list of comment IDs visible to the current user for a specific post.
    """
    service = CommentFilterService()
    visible_ids = service.get_visible_comments(post_id, request.user.id)
    
    return Response({
        'post_id': post_id,
        'visible_comment_ids': visible_ids
    }, status=status.HTTP_200_OK)
