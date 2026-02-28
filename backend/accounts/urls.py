from django.urls import path
from .views import (
    RegisterView, ManageUserView, UpdateUserProfileView, UserProfileView,
    UserPostsListView, UserLikedPostsView, UserFollowersListView, UserFollowingListView, UserSearchView,
    PasswordResetView, PasswordResetConfirmView, SuggestedUsersView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ManageUserView.as_view(), name='profile'),
    path('profile/update/', UpdateUserProfileView.as_view(), name='profile-update'),
    path('search/', UserSearchView.as_view(), name='user-search'),
    path('users/suggested/', SuggestedUsersView.as_view(), name='user-suggested'),
    path('users/<str:username>/', UserProfileView.as_view(), name='user-profile'),
    path('users/<str:username>/posts/', UserPostsListView.as_view(), name='user-posts'),
    path('users/<str:username>/liked-posts/', UserLikedPostsView.as_view(), name='user-liked-posts'),
    path('users/<str:username>/followers/', UserFollowersListView.as_view(), name='user-followers'),
    path('users/<str:username>/following/', UserFollowingListView.as_view(), name='user-following'),
    path('password-reset/', PasswordResetView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
