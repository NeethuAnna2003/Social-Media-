from posts.models import Post
from django.db import connection

print("Checking database columns for 'posts_post' table:")
with connection.cursor() as cursor:
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'posts_post';")
    columns = [row[0] for row in cursor.fetchall()]

print(f"Columns found: {columns}")
required_columns = ['status', 'scheduled_at', 'published_at']
missing_columns = [col for col in required_columns if col not in columns]

if missing_columns:
    print(f"❌ MISSING COLUMNS: {missing_columns}")
    print("Please run migrations again: python manage.py migrate posts")
else:
    print("✅ All new columns are present.")

print("\nChecking latest post status:")
latest_post = Post.objects.last()
if latest_post:
    print(f"ID: {latest_post.id}")
    print(f"Status: {latest_post.status}")
    print(f"Scheduled At: {latest_post.scheduled_at}")
    print(f"Published At: {latest_post.published_at}")
    print(f"Is Public (Prop): {latest_post.is_public}")
    print(f"Scheduled For (Prop): {latest_post.scheduled_for}")
else:
    print("No posts found.")
