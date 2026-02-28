from videos.models import Video
from posts.models import Post
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

print(f"User: {user.username if user else 'None'}")
print(f"\nTotal videos: {Video.objects.filter(user=user).count()}")
print(f"Total posts: {Post.objects.filter(user=user).count()}")

# Check latest video
video = Video.objects.filter(user=user).order_by('-created_at').first()
if video:
    print(f"\nLatest Video:")
    print(f"  ID: {video.id}")
    print(f"  Title: {video.title}")
    print(f"  Status: {video.status}")
    print(f"  Captions: {video.captions.count()}")
    print(f"  scheduled_for: {video.scheduled_for}")
    print(f"  is_public: {video.is_public}")

# Check latest post
post = Post.objects.filter(user=user).order_by('-created_at').first()
if post:
    print(f"\nLatest Post:")
    print(f"  ID: {post.id}")
    print(f"  Text: {post.text[:50]}")
    print(f"  scheduled_for: {post.scheduled_for}")
    print(f"  is_public: {post.is_public}")
    print(f"  Media count: {post.media.count()}")
