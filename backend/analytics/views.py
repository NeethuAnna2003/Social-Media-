from rest_framework import views, permissions, generics
from rest_framework.response import Response
from django.conf import settings
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.db import models # Added for engagement Q objects
from datetime import timedelta
from posts.models import Post, Like, Comment
from stories.models import Story
from social.models import Follow
from accounts.models import UserFollowing
from .models import TrendingHashtag, Hashtag
from .serializers import TrendingHashtagSerializer

class TrendingHashtagListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TrendingHashtagSerializer

    def get_queryset(self):
        # Order by score (descending) so highly used tags are first.
        # Fallback to rank if scores are tied, though usually score is key.
        return TrendingHashtag.objects.filter(time_window='all').order_by('-score')[:10]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        results = []
        if queryset.exists():
            for item in queryset:
                count = item.hashtag.usage_count
                results.append({
                    "hashtag": f"#{item.hashtag.name}",
                    "raw_count": count
                })
        else:
             top_tags = Hashtag.objects.order_by('-usage_count')[:10]
             for tag in top_tags:
                 results.append({
                     "hashtag": f"#{tag.name}",
                     "raw_count": tag.usage_count
                 })
                 
        formatted_data = []
        for item in results:
            count = item['raw_count']
            if count >= 1000:
                count_str = f"{count/1000:.1f}k Posts"
            else:
                count_str = f"{count} Posts"
            
            formatted_data.append({
                "hashtag": item['hashtag'],
                "total_posts": count_str
            })
            
        return Response(formatted_data)



class UserDashboardAnalyticsView(views.APIView):
    """
    Endpoint: GET /api/analytics/dashboard/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            from django.db.models.functions import Cast, ExtractWeekDay, ExtractHour
            from django.db.models import DateField
            user = request.user
            
            # --- 1. Overview Metrics ---
            post_count = Post.objects.filter(user=user).count()
            story_count = Story.objects.filter(user=user).count()
            total_likes_received = Like.objects.filter(post__user=user).count()
            
            # Comments received on user's posts (excluding flagged)
            comments_received_qs = Comment.objects.filter(post__user=user, is_flagged=False)
            total_comments_received = comments_received_qs.count()
            
            followers_count = user.followers_set.count() 
            following_count = user.following_set.count()

            # --- 2. Post Performance Analytics (Last 30 Days) ---
            thirty_days_ago = timezone.now() - timedelta(days=30)
            
            # Use Cast for SQLite compatibility
            daily_likes = Like.objects.filter(
                post__user=user,
                created_at__gte=thirty_days_ago
            ).annotate(date_cast=Cast('created_at', DateField())).values('date_cast').annotate(count=Count('id')).order_by('date_cast')
            
            daily_comments = comments_received_qs.filter(
                created_at__gte=thirty_days_ago
            ).annotate(date_cast=Cast('created_at', DateField())).values('date_cast').annotate(count=Count('id')).order_by('date_cast')

            # Engagement per Post (Top 5 Recent)
            recent_posts_engagement = Post.objects.filter(user=user).order_by('-created_at')[:5].annotate(
                total_likes=Count('likes', distinct=True),
                total_comments=Count('comments', distinct=True, filter=models.Q(comments__is_flagged=False))
            ).values('id', 'total_likes', 'total_comments', 'created_at')

            # --- 3. Follower Growth (Last 30 Days) ---
            daily_new_followers = Follow.objects.filter(
                following=user,
                created_at__gte=thirty_days_ago
            ).annotate(date_cast=Cast('created_at', DateField())).values('date_cast').annotate(count=Count('id')).order_by('date_cast')

            # --- 4. Top Interactors (Proxy for 'Most Viewed' - Who interacts with me?) ---
            # Aggregate users who have liked or commented on my posts
            from django.db.models import Sum, Value
            from django.db.models.functions import Coalesce
            
            # 1. Get users who liked my posts
            likers = Like.objects.filter(post__user=user)\
                .values('user', 'user__username', 'user__profile__profile_pic')\
                .annotate(count=Count('id'))
            
            # 2. Get users who commented on my posts
            commenters = Comment.objects.filter(post__user=user)\
                .values('user', 'user__username', 'user__profile__profile_pic')\
                .annotate(count=Count('id'))
                
            interactor_map = {}
            
            for item in likers:
                uid = item['user']
                if uid == user.id: continue # specific self-interaction check
                if uid not in interactor_map:
                    interactor_map[uid] = {
                        'id': uid,
                        'username': item['user__username'],
                        'avatar': item['user__profile__profile_pic'] or None,
                        'score': 0
                    }
                interactor_map[uid]['score'] += item['count']
                
            for item in commenters:
                uid = item['user']
                if uid == user.id: continue
                if uid not in interactor_map:
                    interactor_map[uid] = {
                        'id': uid,
                        'username': item['user__username'],
                        'avatar': item['user__profile__profile_pic'] or None,
                        'score': 0
                    }
                interactor_map[uid]['score'] += (item['count'] * 2) # Weighted comments higher
            
            # Sort by score desc
            sorted_interactors = sorted(interactor_map.values(), key=lambda x: x['score'], reverse=True)[:5]
            
            # Format for frontend
            top_interactors_data = []
            for u in sorted_interactors:
                top_interactors_data.append({
                    "id": u['id'],
                    "username": u['username'],
                    "avatar": request.build_absolute_uri(settings.MEDIA_URL + u['avatar']) if u['avatar'] else None,
                    "interaction_score": u['score']
                })

            # --- 5. Content Sentiment & Moderation ---
            user_posts_sentiment = Post.objects.filter(user=user).values('sentiment').annotate(count=Count('id'))
            sentiment_counts = {'positive': 0, 'neutral': 0, 'negative': 0}
            
            for p in user_posts_sentiment:
                s = (p.get('sentiment') or 'neutral').lower()
                if s in sentiment_counts:
                    sentiment_counts[s] += p['count']
                
            total_content = sum(sentiment_counts.values())
            sentiment_overview = []
            if total_content > 0:
                for k, v in sentiment_counts.items():
                    sentiment_overview.append({
                        "name": k.capitalize(),
                        "value": round((v / total_content) * 100, 1),
                        "count": v
                    })
            else:
                 sentiment_overview = [
                     {"name": "Positive", "value": 0, "count": 0},
                     {"name": "Neutral", "value": 100, "count": 0},
                     {"name": "Negative", "value": 0, "count": 0}
                 ]

            # --- 6. Media Gallery (Unified Post & PostMedia) ---
            from posts.models import PostMedia
            media_items = []
            
            # 1. Standard Post Images
            posts_with_image = Post.objects.filter(user=user).exclude(image='').exclude(image__isnull=True).order_by('-created_at')[:10]
            for p in posts_with_image:
                if p.image:
                    media_items.append({
                        "id": f"post_{p.id}",
                        "image": request.build_absolute_uri(p.image.url),
                        "likes": p.likes.count(),
                        "comments": p.comments.filter(is_flagged=False).count(),
                        "created_at": p.created_at,
                        "type": "image"
                    })

            # 2. PostMedia (Gallery/Videos)
            # Use select_related to avoid N+1 queries for post likes/comments access
            post_media = PostMedia.objects.filter(post__user=user).select_related('post').order_by('-created_at')[:10]
            for pm in post_media:
                 try:
                    media_items.append({
                        "id": f"media_{pm.id}",
                        "image": request.build_absolute_uri(pm.file.url),
                        "likes": pm.post.likes.count(),
                        "comments": pm.post.comments.filter(is_flagged=False).count(),
                        "created_at": pm.created_at,
                        "type": pm.media_type
                    })
                 except Exception as e:
                     print(f"Error processing media {pm.id}: {e}")
                     continue

            # 3. Sort by date and take top 8
            media_items.sort(key=lambda x: x['created_at'], reverse=True)
            media_gallery = media_items[:8]

            # --- 7. Top Content Performance ---
            top_content_qs = Post.objects.filter(user=user).annotate(
                total_likes_agg=Count('likes', distinct=True),
                total_comments_agg=Count('comments', distinct=True, filter=models.Q(comments__is_flagged=False))
            ).order_by('-total_likes_agg', '-total_comments_agg')[:5]

            top_content = []
            for p in top_content_qs:
                media_url = None
                if p.image:
                    media_url = request.build_absolute_uri(p.image.url)
                else:
                    # Fallback to PostMedia (first item)
                    first_media = p.media.first()
                    if first_media:
                        media_url = request.build_absolute_uri(first_media.file.url)

                top_content.append({
                    "id": p.id,
                    "media": media_url,
                    "content": p.text[:50] + "..." if len(p.text) > 50 else p.text,
                    "likes": p.total_likes_agg,
                    "comments": p.total_comments_agg,
                    "engagement_rate": round(((p.total_likes_agg + p.total_comments_agg) / max(1, followers_count)) * 100, 1),
                    "created_at": p.created_at.strftime("%Y-%m-%d")
                })

            # --- Formatting Helper ---
            def fill_dates(data_list, days=30):
                res = []
                param_map = {}
                for item in data_list:
                    d_val = item.get('date_cast') or item.get('date')
                    if d_val:
                        if hasattr(d_val, 'date'): d_val = d_val.date()
                        param_map[d_val.strftime("%Y-%m-%d")] = item['count']

                for i in range(days):
                    d = (timezone.now() - timedelta(days=i)).date()
                    d_str = d.strftime("%Y-%m-%d")
                    res.append({
                        "date": d_str,
                        "count": param_map.get(d_str, 0)
                    })
                return res[::-1]

            return Response({
                "metrics": {
                    "posts": post_count,
                    "stories": story_count,
                    "likes_received": total_likes_received,
                    "comments_received": total_comments_received,
                    "followers": followers_count,
                    "following": following_count,
                    "profile_visits": (post_count * 2) + total_likes_received,
                    "engagement_rate": round(((total_likes_received + total_comments_received) / max(1, followers_count)) * 10, 1) if followers_count > 0 else 0
                },
                "charts": {
                    "likes_over_time": fill_dates(daily_likes),
                    "comments_over_time": fill_dates(daily_comments),
                    "follower_growth": fill_dates(daily_new_followers),
                    "engagement_per_post": [
                        {
                            "id": p['id'],
                            "date": p['created_at'].strftime("%m-%d") if p['created_at'] else "N/A",
                            "likes": p['total_likes'],
                            "comments": p['total_comments']
                        } for p in recent_posts_engagement
                    ][::-1]
                },
                "top_interactors": top_interactors_data,
                "sentiment": sentiment_overview,
                "media_gallery": media_gallery,
                "top_content": top_content
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)


class SystemAdminDashboardView(views.APIView):
    """
    Endpoint: GET /api/analytics/admin-dashboard/
    Global analytics for the system admin.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        try:
            from django.db.models.functions import TruncWeek, TruncMonth, Cast
            from django.db.models import DateField
            
            now = timezone.now()
            thirty_days_ago = now - timedelta(days=30)
            
            # --- 1. KPI Cards ---
            from accounts.models import CustomUser as User
            
            total_users = User.objects.count()
            users_last_month = User.objects.filter(date_joined__lte=thirty_days_ago).count()
            users_growth = ((total_users - users_last_month) / max(1, users_last_month)) * 100
            
            total_posts = Post.objects.count()
            posts_last_month = Post.objects.filter(created_at__lte=thirty_days_ago).count()
            posts_growth = ((total_posts - posts_last_month) / max(1, posts_last_month)) * 100

            total_likes = Like.objects.count()
            total_comments = Comment.objects.count()
            total_engagement = total_likes + total_comments
            
            likes_last_month = Like.objects.filter(created_at__lte=thirty_days_ago).count()
            comments_last_month = Comment.objects.filter(created_at__lte=thirty_days_ago).count()
            engagement_last_month = likes_last_month + comments_last_month
            engagement_growth = ((total_engagement - engagement_last_month) / max(1, engagement_last_month)) * 100

            ai_flagged = Post.objects.filter(ai_status__in=['flagged', 'blocked']).count()
            ai_flagged_last_month = Post.objects.filter(
                ai_status__in=['flagged', 'blocked'], 
                created_at__lte=thirty_days_ago
            ).count()
            ai_growth = ((ai_flagged - ai_flagged_last_month) / max(1, ai_flagged_last_month)) * 100
            
            # --- 2. User Growth ---
            def get_growth_data(trunc_field, days=365):
                start_date = now - timedelta(days=days)
                # Use Cast for SQLite compatibility
                qs = User.objects.filter(date_joined__gte=start_date)\
                    .annotate(date_cast=Cast('date_joined', DateField()))\
                    .values('date_cast')\
                    .annotate(count=Count('id'))\
                    .order_by('date_cast')
                
                results = []
                for item in qs:
                    dt = item['date_cast']
                    if dt:
                        results.append({"date": dt.strftime('%Y-%m-%d'), "users": item['count']})
                return results

            user_growth_daily = get_growth_data('date_joined', 30)

            # --- 3. All App Activity (Comprehensive Graph) ---
            # Aggregate Posts, Stories, Likes, Comments in last 30 days
            from stories.models import Story
            
            def get_activity_qs(model_class):
                return model_class.objects.filter(created_at__gte=thirty_days_ago)\
                    .annotate(date_cast=Cast('created_at', DateField()))\
                    .values('date_cast')\
                    .annotate(count=Count('id'))\
                    .order_by('date_cast')

            posts_activity = get_activity_qs(Post)
            likes_activity = get_activity_qs(Like)
            comments_activity = get_activity_qs(Comment)
            stories_activity = get_activity_qs(Story)

            activity_map = {}
            for i in range(30):
                d = (now - timedelta(days=i)).date().strftime('%Y-%m-%d')
                activity_map[d] = {"date": d, "posts": 0, "likes": 0, "comments": 0, "stories": 0}

            def merge_activity(qs, key):
                for item in qs:
                    dt = item['date_cast']
                    if dt:
                        d_str = dt.strftime('%Y-%m-%d')
                        if d_str in activity_map:
                            activity_map[d_str][key] = item['count']

            merge_activity(posts_activity, 'posts')
            merge_activity(likes_activity, 'likes')
            merge_activity(comments_activity, 'comments')
            merge_activity(stories_activity, 'stories')

            app_activity_chart = sorted(activity_map.values(), key=lambda x: x['date'])

            # --- 4. Top Content ---
            top_posts = Post.objects.annotate(
                total_engagement=Count('likes', distinct=True) + Count('comments', distinct=True)
            ).order_by('-total_engagement')[:5]
            
            top_content_data = []
            for p in top_posts:
                media_url = None
                if p.image:
                    media_url = request.build_absolute_uri(p.image.url)
                else:
                    first_media = p.media.first()
                    if first_media:
                        media_url = request.build_absolute_uri(first_media.file.url)
                
                avatar_url = None
                try:
                    if hasattr(p.user, 'profile') and p.user.profile.profile_pic:
                        avatar_url = request.build_absolute_uri(p.user.profile.profile_pic.url)
                except Exception:
                    pass

                top_content_data.append({
                    "name": f"{p.user.username}: {p.text[:15]}...",
                    "media": media_url,
                    "avatar": avatar_url,
                    "likes": p.likes.count(),
                    "comments": p.comments.count(),
                    "engagement": p.likes.count() + p.comments.count()
                })

            # --- 5. AI Safety Analysis ---
            ai_usage_qs = Post.objects.filter(created_at__gte=thirty_days_ago)\
                .annotate(date_cast=Cast('created_at', DateField()))\
                .values('date_cast')\
                .annotate(
                    safe=Count('id', filter=models.Q(ai_status='safe')),
                    flagged=Count('id', filter=models.Q(ai_status__in=['flagged', 'blocked']))
                ).order_by('date_cast')
                
            ai_chart_data = []
            ai_temp_map = {item['date_cast'].strftime('%Y-%m-%d'): item for item in ai_usage_qs if item['date_cast']}
            for i in range(30):
                d = (now - timedelta(days=i)).date().strftime('%Y-%m-%d')
                item = ai_temp_map.get(d, {'safe': 0, 'flagged': 0})
                ai_chart_data.append({
                    "date": d,
                    "Safe": item['safe'],
                    "Flagged": item['flagged'],
                    "Total Checks": item['safe'] + item['flagged']
                })
            ai_chart_data.reverse()

            # --- 6. Funnel Chart ---
            uploads = Post.objects.count()
            published = Post.objects.filter(status='published').count()
            viewed_proxy = Post.objects.annotate(
                interactions=Count('likes') + Count('comments')
            ).filter(interactions__gt=0).count()
            
            funnel_data = [
                {"stage": "Post Uploaded", "value": uploads},
                {"stage": "Post Published", "value": published},
                {"stage": "Post Engaged", "value": viewed_proxy},
            ]

            data = {
                "kpi": {
                    "users": {"value": total_users, "growth": round(users_growth, 1)},
                    "posts": {"value": total_posts, "growth": round(posts_growth, 1)},
                    "engagement": {"value": total_engagement, "growth": round(engagement_growth, 1)},
                    "ai_flagged": {"value": ai_flagged, "growth": round(ai_growth, 1)}
                },
                "user_growth": {
                    "daily": user_growth_daily,
                    "weekly": [], # Simplified for now to fix error
                    "monthly": []
                },
                "app_activity": app_activity_chart,
                "top_content": top_content_data,
                "ai_usage": ai_chart_data,
                "funnel": funnel_data
            }
            
            return Response(data)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)


class UserSuggestionsView(views.APIView):
    """
    Endpoint: GET /api/analytics/suggestions/
    Provides intelligent user suggestions based on:
    1. New users to the platform (joined recently)
    2. Users with mutual followers
    3. Users not already followed
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            from django.contrib.auth import get_user_model
            from django.db.models import Count, Q, Exists, OuterRef
            
            User = get_user_model()
            current_user = request.user
            
            # Get users already followed by current user
            already_following_ids = Follow.objects.filter(
                follower=current_user
            ).values_list('following_id', flat=True)
            
            # Get pending follow requests
            pending_request_ids = []
            try:
                from accounts.models import FollowRequest
                pending_request_ids = FollowRequest.objects.filter(
                    from_user=current_user
                ).values_list('to_user_id', flat=True)
            except ImportError:
                pass
            
            # Exclude self, already following, and pending requests
            exclude_ids = list(already_following_ids) + list(pending_request_ids) + [current_user.id]
            
            # Get users current user's followers are following (mutual connections)
            my_followers = Follow.objects.filter(following=current_user).values_list('follower_id', flat=True)
            
            # Find users followed by my followers (potential mutual connections)
            mutual_candidates = Follow.objects.filter(
                follower_id__in=my_followers
            ).exclude(
                following_id__in=exclude_ids
            ).values('following_id').annotate(
                mutual_count=Count('follower_id')
            ).order_by('-mutual_count')[:10]
            
            mutual_user_ids = [item['following_id'] for item in mutual_candidates]
            
            # Get new users (joined in last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            new_users = User.objects.filter(
                date_joined__gte=thirty_days_ago
            ).exclude(
                id__in=exclude_ids
            ).order_by('-date_joined')[:10]
            
            # Combine and deduplicate suggestions
            suggestions = []
            seen_ids = set()
            
            # Priority 1: Users with mutual followers
            for user_id in mutual_user_ids:
                if user_id not in seen_ids:
                    try:
                        user = User.objects.get(id=user_id)
                        mutual_count = next(
                            (item['mutual_count'] for item in mutual_candidates if item['following_id'] == user_id),
                            0
                        )
                        
                        # Get follower counts
                        followers_count = Follow.objects.filter(following=user).count()
                        following_count = Follow.objects.filter(follower=user).count()
                        
                        # Check if profile is private
                        is_private = False
                        if hasattr(user, 'profile'):
                            is_private = user.profile.is_private
                        
                        suggestions.append({
                            'id': user.id,
                            'username': user.username,
                            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                            'profile_pic': request.build_absolute_uri(user.profile.profile_pic.url) if hasattr(user, 'profile') and user.profile.profile_pic else None,
                            'bio': user.profile.bio if hasattr(user, 'profile') else None,
                            'followers_count': followers_count,
                            'following_count': following_count,
                            'is_private': is_private,
                            'reason': f"{mutual_count} mutual follower{'s' if mutual_count > 1 else ''}",
                            'suggestion_type': 'mutual'
                        })
                        seen_ids.add(user_id)
                    except User.DoesNotExist:
                        continue
            
            # Priority 2: New users
            for user in new_users:
                if user.id not in seen_ids:
                    followers_count = Follow.objects.filter(following=user).count()
                    following_count = Follow.objects.filter(follower=user).count()
                    
                    is_private = False
                    if hasattr(user, 'profile'):
                        is_private = user.profile.is_private
                    
                    days_ago = (timezone.now() - user.date_joined).days
                    
                    suggestions.append({
                        'id': user.id,
                        'username': user.username,
                        'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                        'profile_pic': request.build_absolute_uri(user.profile.profile_pic.url) if hasattr(user, 'profile') and user.profile.profile_pic else None,
                        'bio': user.profile.bio if hasattr(user, 'profile') else None,
                        'followers_count': followers_count,
                        'following_count': following_count,
                        'is_private': is_private,
                        'reason': f"New to platform • Joined {days_ago} day{'s' if days_ago != 1 else ''} ago",
                        'suggestion_type': 'new'
                    })
                    seen_ids.add(user.id)
            
            # Priority 3: Discover People (Popular users fallback)
            remaining = 15 - len(suggestions)
            if remaining > 0:
                popular_users = User.objects.exclude(
                    id__in=exclude_ids + list(seen_ids)
                ).annotate(
                    num_followers=Count('followers_set')
                ).order_by('-num_followers')[:remaining]
                
                for user in popular_users:
                    followers_count = user.num_followers # Use annotated value
                    following_count = user.following_set.count() # Or Follow.objects.filter(follower=user).count()
                    
                    is_private = False
                    if hasattr(user, 'profile'):
                        is_private = user.profile.is_private
                    
                    suggestions.append({
                        'id': user.id,
                        'username': user.username,
                        'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                        'profile_pic': request.build_absolute_uri(user.profile.profile_pic.url) if hasattr(user, 'profile') and user.profile.profile_pic else None,
                        'bio': user.profile.bio if hasattr(user, 'profile') else None,
                        'followers_count': followers_count,
                        'following_count': following_count,
                        'is_private': is_private,
                        'reason': 'Suggested for you',
                        'suggestion_type': 'popular'
                    })
                    seen_ids.add(user.id)

            # Limit to top 15 suggestions
            return Response(suggestions[:15])
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
