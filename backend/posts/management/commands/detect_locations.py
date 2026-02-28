"""
Management command to detect locations for existing posts
"""
from django.core.management.base import BaseCommand
from posts.models import Post
from posts.location_service import ImageLocationService
from posts.location_models import PostLocation


class Command(BaseCommand):
    help = 'Detect locations for existing posts with images'

    def handle(self, *args, **options):
        # Get all posts
        posts = Post.objects.all().order_by('-created_at')[:20]
        
        service = ImageLocationService()
        processed = 0
        
        for post in posts:
            try:
                image_file = None
                
                # Try to get image from post.image field
                if post.image and hasattr(post.image, 'file'):
                    try:
                        post.image.file
                        image_file = post.image
                    except:
                        pass
                
                # If not, try media table
                if not image_file:
                    first_media = post.media.filter(media_type='image').first()
                    if first_media and first_media.file:
                        image_file = first_media.file
                
                if not image_file:
                    continue
                
                self.stdout.write(f"Processing post {post.id}...")
                processed += 1
                
                # Detect location
                location_data = service.get_or_detect_location(image_file)
                
                if location_data.get('detected_location'):
                    self.stdout.write(f"  Location: {location_data.get('detected_location')}")
                else:
                    self.stdout.write(f"  No location detected")
                
                # Update PostLocation
                post_location, created = PostLocation.objects.get_or_create(post=post)
                
                if location_data.get('detected_location'):
                    post_location.display_location = location_data['detected_location']
                    post_location.is_detected = True
                    post_location.detection_status = 'completed'
                    self.stdout.write(self.style.SUCCESS(f"  OK - Location set"))
                else:
                    post_location.display_location = None
                    post_location.is_detected = False
                    post_location.detection_status = 'no_location'
                    error = location_data.get('error', 'Unknown')
                    self.stdout.write(self.style.WARNING(f"  SKIP - No location: {error}"))
                
                post_location.save()
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Error: {e}"))
        
        self.stdout.write(self.style.SUCCESS(f'\nDone! Processed {processed} posts.'))

