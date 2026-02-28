import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from posts.models import Post
from posts.location_models import PostLocation
from posts.location_service import ImageLocationService

# Check post 68
post = Post.objects.get(id=68)
pl = PostLocation.objects.filter(post=post).first()

print(f"Post 68 current location: {pl.display_location if pl else 'None'}")
print(f"Status: {pl.detection_status if pl else 'None'}")

# Get image
media = post.media.first()
if media:
    print(f"\nTesting with image: {media.file}")
    service = ImageLocationService()
    result = service.get_or_detect_location(media.file)
    print(f"\nDetection result:")
    print(f"  Landmark: {result.get('landmark')}")
    print(f"  City: {result.get('city')}")
    print(f"  Country: {result.get('country')}")
    print(f"  Display: {result.get('detected_location')}")
    print(f"  Confidence: {result.get('overall_confidence')}")
    print(f"  Reasoning: {result.get('reasoning')}")
    print(f"  From cache: {result.get('from_cache')}")
    print(f"  Error: {result.get('error')}")
