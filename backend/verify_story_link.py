"""
Quick script to verify Story model has link_url field and check existing data
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from stories.models import Story

print("=" * 60)
print("STORY MODEL VERIFICATION")
print("=" * 60)

# Check if link_url field exists
fields = [f.name for f in Story._meta.get_fields()]
print(f"\n[OK] Story model fields: {', '.join(fields)}")
print(f"\n[OK] link_url field exists: {'link_url' in fields}")

# Check recent stories
recent_stories = Story.objects.all().order_by('-created_at')[:5]
print(f"\n[OK] Total stories in database: {Story.objects.count()}")
print(f"\n[OK] Recent stories (last 5):")
print("-" * 60)

for story in recent_stories:
    print(f"\nID: {story.id}")
    print(f"User: {story.user.username}")
    print(f"Caption: {story.caption[:50] if story.caption else 'None'}...")
    print(f"Link URL: {story.link_url if story.link_url else 'None'}")
    print(f"Created: {story.created_at}")
    print("-" * 60)

print("\n[SUCCESS] Verification complete!")
print("\nTo test the feature:")
print("1. Go to /news and click on an article")
print("2. Click 'Share' -> 'Add to Story'")
print("3. Share the story")
print("4. View your story - you should see 'View Post' button")
print("=" * 60)
