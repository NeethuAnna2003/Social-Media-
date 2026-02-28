# Video signals for post-save processing
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Video

@receiver(post_save, sender=Video)
def video_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for video post-save
    Triggers async processing tasks when a video is uploaded
    """
    if created:
        # Video was just created
        print(f"New video uploaded: {instance.title}")
        
        # TODO: Trigger async tasks when Celery is configured
        # from .tasks import process_video_captions, generate_video_thumbnails
        # process_video_captions.delay(instance.id)
        # generate_video_thumbnails.delay(instance.id)
