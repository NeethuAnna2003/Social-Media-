"""
CRITICAL FIX: Replace GenerateCaptionsView in views.py

Find the GenerateCaptionsView class (around line 177) and replace the ENTIRE class with this:
"""

class GenerateCaptionsView(APIView):
    """
    Generate captions for a video using AI
    POST /api/videos/{id}/captions/generate/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk, user=request.user)
        
        language = request.data.get('language', 'en')
        
        # Create processing job
        job = CaptionProcessingJob.objects.create(
            video=video,
            status='processing',
            source_language=language
        )
        
        try:
            # Use real AI caption service
            
            
            captions_data = result['captions']
            detected_language = result.get('detected_language', language)
            
            # Save captions
            for caption_data in captions_data:
                Caption.objects.create(
                    video=video,
                    language=detected_language,
                    start_time=caption_data['start_time'],
                    end_time=caption_data['end_time'],
                    text=caption_data['text'],
                    confidence=caption_data.get('confidence', 0.85)
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
                'message': 'Captions generated successfully',
                'captions_count': len(captions_data),
                'language': detected_language
            })
            
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
            
            return Response(
                {'error': f'Failed to generate captions: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


"""
INSTRUCTIONS:
1. Open backend/videos/views.py
2. Find class GenerateCaptionsView (around line 177)
3. Delete the ENTIRE class (from 'class GenerateCaptionsView' to the end of the class)
4. Paste the code above in its place
5. Save the file
6. Restart Django server
"""
