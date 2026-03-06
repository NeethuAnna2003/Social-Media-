"""
Django config initialization
Load Celery app when Django starts (if celery is installed)
"""

# Enable PyMySQL only when available (for optional MySQL environments).
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass

# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
# Make celery optional - only load if installed
try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    # Celery not installed, skip
    __all__ = ()
