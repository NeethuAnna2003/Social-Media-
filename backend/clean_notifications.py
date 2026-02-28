import os
import django
import sys

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from notifications.models import Notification
from chat.models import Message

def clean_slate():
    print("--- Cleaning Notifications & Messages ---")
    
    # 1. Clear Notifications
    n_count = Notification.objects.filter(is_read=False).count()
    if n_count > 0:
        print(f"   Marking {n_count} notifications as read...")
        Notification.objects.filter(is_read=False).update(is_read=True)
    else:
        print("   No unread notifications.")

    # 2. Clear Messages
    m_count = Message.objects.filter(is_read=False).count()
    if m_count > 0:
        print(f"   Marking {m_count} messages as read...")
        Message.objects.filter(is_read=False).update(is_read=True)
    else:
        print("   No unread messages.")
        
    print("--- Clean Slate Ready ---")

if __name__ == "__main__":
    clean_slate()
