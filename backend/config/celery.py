"""
Celery Configuration for AI Video Processing
"""

import os
from celery import Celery

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('connectify')

# Load config from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# Celery Beat schedule (for periodic tasks)
from celery.schedules import crontab

app.conf.beat_schedule = {
    'cleanup-old-jobs': {
        'task': 'videos.tasks.cleanup_old_jobs',
        'schedule': 3600.0,  # Every hour
    },
    'publish-scheduled-videos': {
        'task': 'videos.scheduled_tasks.publish_scheduled_videos',
        'schedule': crontab(minute='*/1'),  # Every minute
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
