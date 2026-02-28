
import os
import django
import sys

# Setup FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from stories.views import StoryFeedView
from django.contrib.auth import get_user_model

User = get_user_model()

def test_view():
    print("--- Testing StoryFeedView ---")
    try:
        meera = User.objects.get(username='Meera1')
    except User.DoesNotExist:
        print("Meera1 not found!")
        return

    factory = RequestFactory()
    request = factory.get('/api/stories/feed/')
    force_authenticate(request, user=meera)
    
    view = StoryFeedView.as_view()
    response = view(request)
    
    print(f"Status Code: {response.status_code}")
    # Print data but handle OrderedDict
    import json
    # Use DRF native render if needed or just print repr
    print(f"Data: {response.data}")

if __name__ == '__main__':
    test_view()
