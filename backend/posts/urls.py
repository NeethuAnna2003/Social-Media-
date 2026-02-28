from django.urls import path
from . import views
from . import feature_views

app_name = 'posts'

urlpatterns = [
    # Post endpoints
    path('', views.PostListView.as_view(), name='post-list'),
    path('feed/', views.PostListView.as_view(), name='post-feed'),
    path('<int:pk>/', views.PostDetailView.as_view(), name='post-detail'),
    
    # Like endpoints
    # Like endpoints
    path('<int:pk>/like/', views.LikePostView.as_view(), name='post-like'),
    path('<int:pk>/archive/', views.ArchivePostView.as_view(), name='post-archive'),
    
    # Hashtag endpoints
    path('hashtag/<str:tag>/', views.HashtagPostListView.as_view(), name='hashtag-feed'),
    
    # Comment endpoints
    path('<int:pk>/comments/', views.CommentListCreateView.as_view(), name='comment-list'),
    path('<int:pk>/comments/create/', views.CommentCreateView.as_view(), name='comment-create'),
    path('<int:post_pk>/comments/<int:pk>/', views.CommentDetailView.as_view(), name='comment-detail'),
    
    # ==========================================
    # IMAGE LOCATION DETECTION ENDPOINTS
    # ==========================================
    path('<int:post_id>/detect-location/', feature_views.DetectImageLocationView.as_view(), name='detect-location'),
    path('<int:post_id>/location/', feature_views.PostLocationDetailView.as_view(), name='post-location'),
    
    # ==========================================
    # COMMENT WORD FILTER ENDPOINTS
    # ==========================================
    # User endpoints
    path('filter/requests/', feature_views.ProhibitedWordRequestListCreateView.as_view(), name='word-filter-requests'),
    path('filter/requests/<int:pk>/', feature_views.ProhibitedWordRequestDetailView.as_view(), name='word-filter-request-detail'),
    path('filter/words/', feature_views.ProhibitedWordListView.as_view(), name='prohibited-words'),
    path('filter/words/<int:word_id>/toggle/', feature_views.ProhibitedWordToggleView.as_view(), name='prohibited-word-toggle'),
    path('filter/words/<int:pk>/', feature_views.ProhibitedWordDeleteView.as_view(), name='prohibited-word-delete'),
    path('filter/filtered-comments/', feature_views.FilteredCommentListView.as_view(), name='filtered-comments'),
    
    # Admin endpoints
    path('filter/admin/requests/', feature_views.AdminProhibitedWordRequestListView.as_view(), name='admin-word-filter-requests'),
    path('filter/admin/requests/<int:request_id>/review/', feature_views.AdminProhibitedWordRequestReviewView.as_view(), name='admin-word-filter-review'),
    path('filter/admin/filtered-comments/', feature_views.AdminFilteredCommentListView.as_view(), name='admin-filtered-comments'),
    
    # Utility endpoints
    path('comments/<int:comment_id>/visibility/', feature_views.check_comment_visibility, name='comment-visibility'),
    path('<int:post_id>/visible-comments/', feature_views.get_visible_comments_for_post, name='visible-comments'),
]

