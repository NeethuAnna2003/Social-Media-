
import os
import django
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from posts.models import Post
from analytics.models import Hashtag, HashtagUsage, TrendingHashtag
from django.db.models import Count

def run():
    print("Starting Hashtag Refresh...")
    
    # 1. Clear existing analytics (Optional, but ensures clean state)
    # TrendingHashtag.objects.all().delete()
    # HashtagUsage.objects.all().delete()
    # Hashtag.objects.all().update(usage_count=0)
    
    # Actually, let's just process posts and assume idempotency or just purely add.
    # Better: Scan all posts, if hashtag usage doesn't exist for it, create it.
    
    posts = Post.objects.all()
    print(f"Scanning {posts.count()} posts...")
    
    count = 0
    for post in posts:
        text = post.text or ""
        tags = set(re.findall(r"#(\w+)", text.lower()))
        
        for tag_name in tags:
            # Create Hashtag
            hashtag, created = Hashtag.objects.get_or_create(name=tag_name)
            
            # Check if usage already recorded to avoid double counting
            usage_exists = HashtagUsage.objects.filter(
                hashtag=hashtag,
                content_type='post',
                content_id=post.id
            ).exists()
            
            if not usage_exists:
                # Increment count
                hashtag.usage_count += 1
                hashtag.save()
                
                # Record Usage
                HashtagUsage.objects.create(
                    hashtag=hashtag,
                    content_type='post',
                    content_id=post.id,
                    user=post.user
                )

                # Update Trending
                trending, _ = TrendingHashtag.objects.get_or_create(
                     hashtag=hashtag,
                     time_window='all',
                     defaults={'score': 0, 'rank': 999}
                )
                trending.score += 10
                trending.save()
                count += 1
                
    print(f"Processed hashtags. Added {count} new usage records.")
    
    # Re-rank (Simple sorting)
    # Update ranks based on score
    all_trends = TrendingHashtag.objects.filter(time_window='all').order_by('-score')
    for rank, trend in enumerate(all_trends, 1):
        trend.rank = rank
        trend.save()
        
    print("Ranks updated.")

if __name__ == "__main__":
    run()
