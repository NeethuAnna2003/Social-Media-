from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings
from .serializers import (
    RegisterSerializer, UserSerializer, UserUpdateSerializer, PublicProfileSerializer,
    PasswordResetSerializer, SetNewPasswordSerializer
)
from posts.models import Post
from posts.serializers import PostSerializer
from social.models import Follow

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class ManageUserView(generics.RetrieveAPIView):
    """View to retrieve the authenticated user."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class UpdateUserProfileView(generics.UpdateAPIView):
    """View to update the authenticated user's profile."""
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserProfileView(generics.RetrieveAPIView):
    """View to retrieve user profile by username."""
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'username'
    queryset = User.objects.all()

class UserPostsListView(generics.ListAPIView):
    """View to list posts by a specific user."""
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        username = self.kwargs.get('username')
        user = get_object_or_404(User, username=username)
        
        # 1. If viewing own profile, show all
        if self.request.user == user:
             return Post.objects.filter(user=user).order_by('-created_at')
        
        # 2. Privacy Check
        is_private = False
        if hasattr(user, 'profile') and user.profile.is_private:
            is_private = True
            
        # 3. If private, check Authorization
        if is_private:
            # Check if Viewer follows Profile Owner (Standard Instagram Logic)
            # We assume that if a Follow record exists, it was accepted (since private accs require requests)
            is_following = Follow.objects.filter(follower=self.request.user, following=user).exists()
            
            if not is_following:
                # Return 403 Forbidden so frontend knows it's a privacy restriction, not "0 posts"
                raise PermissionDenied("This account is private. Follow to see posts.")
                    
        if is_private:
            is_following = Follow.objects.filter(follower=self.request.user, following=user).exists()
            
            if not is_following:
                raise PermissionDenied("This account is private. Follow to see posts.")
                    
        # If public or following, return posts (excluding archived)
        return Post.objects.filter(user=user, is_archived=False).select_related('user').prefetch_related('likes', 'comments').order_by('-created_at')

class UserLikedPostsView(generics.ListAPIView):
    """View to list posts liked by a specific user (Favorites)."""
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        username = self.kwargs.get('username')
        user = get_object_or_404(User, username=username)
        
        # Privacy: Only the user can see their own liked posts
        if self.request.user != user:
             from rest_framework.exceptions import PermissionDenied
             raise PermissionDenied("You cannot view another user's liked posts.")

        return Post.objects.filter(likes__user=user, is_archived=False).select_related('user').prefetch_related('likes', 'comments').order_by('-likes__created_at')

class UserFollowersListView(generics.ListAPIView):
    """View to list followers of a user."""
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        username = self.kwargs.get('username')
        user = get_object_or_404(User, username=username)
        return [f.follower for f in user.followers_set.all()]

class UserFollowingListView(generics.ListAPIView):
    """View to list who a user is following."""
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        username = self.kwargs.get('username')
        user = get_object_or_404(User, username=username)
        return [f.following for f in user.following_set.all()]

class UserSearchView(generics.ListAPIView):
    """View to search users."""
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        if not query:
             return User.objects.none()
        
        return User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).select_related('profile').distinct()

class SuggestedUsersView(generics.ListAPIView):
    """View to suggest users to follow"""
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Get list of users already followed
        following_ids = user.following_set.values_list('following_id', flat=True)
        
        # Exclude self and following
        queryset = User.objects.exclude(id=user.id).exclude(id__in=following_ids)
        
        # Return 4 random users
        return queryset.order_by('?')[:4]

class PasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email=email).first()
            
            if not user:
                 return Response({"error": "Creating reset link failed: User with this email does not exist."}, status=status.HTTP_400_BAD_REQUEST)

            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"http://localhost:5173/reset-password/{uid}/{token}/"
            
            # FORCE PRINT for development visibility
            print(f"\n=======================================================")
            print(f" PASSWORD RESET LINK (DEV MODE):")
            print(f" {reset_link}")
            print(f"=======================================================\n")

            try:
                send_mail(
                    'Password Reset Request',
                    f'Click the link to reset your password: {reset_link}',
                    'noreply@connectify.com',
                    [email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Error sending email: {e}")
                return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response(
                {"message": "Password reset email sent successfully."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = SetNewPasswordSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            uidb64 = serializer.validated_data['uidb64']
            token = serializer.validated_data['token']
            password = serializer.validated_data['password']

            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                user = None

            if user is not None and default_token_generator.check_token(user, token):
                user.set_password(password)
                user.save()
                return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid token or user ID.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
