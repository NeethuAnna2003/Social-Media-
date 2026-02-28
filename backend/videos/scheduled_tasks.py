"""
Updated Celery task to publish scheduled posts
Now makes Post public instead of creating new one
"""

from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def publish_scheduled_videos():
    """
    Celery periodic task to publish posts that are scheduled for now or earlier
    Run this every minute via Celery Beat
    """
    from posts.models import Post
    
    # Find posts scheduled for now or earlier that are still scheduled
    now = timezone.now()
    scheduled_posts = Post.objects.filter(
        status='scheduled',
        scheduled_at__lte=now
    )
    
    published_count = 0
    failed_count = 0
    
    for post in scheduled_posts:
        try:
            logger.info(f"Auto-publishing scheduled post: {post.id}")
            
            # Make post public
            post.status = 'published'
            post.published_at = now
            post.save()
            
            published_count += 1
            logger.info(f"✅ Successfully published post {post.id}")
                
        except Exception as e:
            failed_count += 1
            logger.error(f"❌ Error publishing post {post.id}: {e}")
    
    if published_count > 0 or failed_count > 0:
        logger.info(f"Scheduled publish task completed: {published_count} published, {failed_count} failed")
    
    return {
        'published': published_count,
        'failed': failed_count,
        'timestamp': now.isoformat()
    }
