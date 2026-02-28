from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from django_apscheduler.jobstores import DjangoJobStore
from django_apscheduler.models import DjangoJobExecution
from django_apscheduler import util
import logging

from videos.models import Video

logger = logging.getLogger(__name__)

def publish_scheduled_videos():
    """
    Check for scheduled videos that need to be published now.
    """
    now = timezone.now()
    scheduled_videos = Video.objects.filter(status='scheduled', scheduled_at__lte=now)
    
    count = scheduled_videos.count()
    if count > 0:
        logger.info(f"Found {count} scheduled videos to publish.")
        for video in scheduled_videos:
            try:
                post = video.publish()
                if post:
                    logger.info(f"Published video {video.id}: Post {post.id}")
                else:
                    logger.warning(f"Failed to publish video {video.id} (publish() returned None)")
            except Exception as e:
                logger.error(f"Error publishing video {video.id}: {e}")
    else:
        # Avoid spamming logs every minute unless debug
        pass

@util.close_old_connections
def delete_old_job_executions(max_age=604_800):
    """
    This job deletes APScheduler job execution entries older than `max_age` from the database.
    It helps to prevent the database from filling up with old historical records that are no
    longer useful.
  
    :param max_age: The maximum length of time to retain historical job execution records.
                    Defaults to 7 days.
    """
    DjangoJobExecution.objects.delete_old_job_executions(max_age)


class Command(BaseCommand):
    help = "Runs APScheduler."

    def handle(self, *args, **options):
        scheduler = BlockingScheduler(timezone=settings.TIME_ZONE)
        scheduler.add_jobstore(DjangoJobStore(), "default")

        scheduler.add_job(
            publish_scheduled_videos,
            trigger=IntervalTrigger(seconds=60),  # Check every minute
            id="publish_scheduled_videos",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job 'publish_scheduled_videos'.")

        scheduler.add_job(
            delete_old_job_executions,
            trigger=IntervalTrigger(weeks=1),
            id="delete_old_job_executions",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added weekly job: 'delete_old_job_executions'.")

        try:
            logger.info("Starting scheduler...")
            scheduler.start()
        except KeyboardInterrupt:
            logger.info("Stopping scheduler...")
            scheduler.shutdown()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
