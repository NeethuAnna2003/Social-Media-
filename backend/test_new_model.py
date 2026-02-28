from posts.models import Post
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
user = User.objects.first()

print(f"Creating scheduled post for user: {user.username}")

# Create scheduled post
try:
    scheduled_time = timezone.now() + timedelta(minutes=5)
    post = Post.objects.create(
        user=user,
        text="Test Scheduled Post via Script",
        status='scheduled',
        scheduled_at=scheduled_time
    )
    print(f"✅ Created Post ID: {post.id}")
    print(f"  Status: {post.status}")
    print(f"  Scheduled At: {post.scheduled_at}")
    print(f"  Is Public (Property): {post.is_public}")
    print(f"  Scheduled For (Property): {post.scheduled_for}")

    # Check serializer output
    from posts.serializers import PostSerializer
    from django.test import RequestFactory
    factory = RequestFactory()
    request = factory.get('/')
    request.user = user
    
    serializer = PostSerializer(post, context={'request': request})
    data = serializer.data
    
    print("\nSerializer Output:")
    print(f"  is_scheduled: {data.get('is_scheduled')}")
    print(f"  scheduled_for: {data.get('scheduled_for')}")
    print(f"  status: {data.get('status')}")
    
except Exception as e:
    print(f"❌ Error: {e}")
