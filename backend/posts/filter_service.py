"""
Comment Word Filter Service

Handles filtering of comments based on user-defined prohibited words.
Implements intelligent matching with variations and case-insensitivity.
"""
import re
from typing import List, Dict, Tuple, Optional
from django.db.models import Q


class CommentFilterService:
    """
    Service for filtering comments based on prohibited words.
    """
    
    def __init__(self):
        """Initialize the filter service."""
        pass
    
    def check_comment(self, comment_text: str, post_owner_id: int) -> Tuple[bool, List[str]]:
        """
        Check if a comment contains prohibited words for the post owner.
        
        Args:
            comment_text: The comment text to check
            post_owner_id: ID of the post owner
            
        Returns:
            tuple: (is_filtered, matched_words)
                - is_filtered: True if comment should be filtered
                - matched_words: List of prohibited words that matched
        """
        from .filter_models import ProhibitedWord
        
        # Get all active prohibited words for this user
        prohibited_words = ProhibitedWord.objects.filter(
            user_id=post_owner_id,
            is_active=True
        ).select_related('user')
        
        if not prohibited_words.exists():
            return False, []
        
        # Normalize comment text
        normalized_text = comment_text.lower().strip()
        
        matched_words = []
        
        for prohibited_word in prohibited_words:
            # Check main word
            if self._word_matches(normalized_text, prohibited_word.word.lower()):
                matched_words.append(prohibited_word.word)
                continue
            
            # Check variations
            for variation in prohibited_word.variations:
                if self._word_matches(normalized_text, variation.lower()):
                    matched_words.append(prohibited_word.word)
                    break
        
        is_filtered = len(matched_words) > 0
        
        # Update trigger count
        if is_filtered:
            for prohibited_word in prohibited_words:
                if prohibited_word.word in matched_words:
                    prohibited_word.times_triggered += 1
                    prohibited_word.save(update_fields=['times_triggered'])
        
        return is_filtered, matched_words
    
    def _word_matches(self, text: str, word: str) -> bool:
        """
        Check if a word matches in the text.
        Uses word boundary matching to avoid false positives.
        
        Args:
            text: Text to search in (should be lowercase)
            word: Word to search for (should be lowercase)
            
        Returns:
            bool: True if word is found
        """
        # Escape special regex characters
        escaped_word = re.escape(word)
        
        # Use word boundaries to match whole words
        # \b matches word boundaries (start/end of word)
        pattern = r'\b' + escaped_word + r'\b'
        
        return bool(re.search(pattern, text, re.IGNORECASE))
    
    def generate_variations(self, word: str) -> List[str]:
        """
        Generate common variations of a word.
        
        Args:
            word: Base word
            
        Returns:
            list: List of variations
        """
        variations = []
        word_lower = word.lower()
        
        # Add plural forms
        if not word_lower.endswith('s'):
            variations.append(word_lower + 's')
            variations.append(word_lower + 'es')
        
        # Add common misspellings with repeated letters
        # e.g., "fat" -> "fatt", "phatt"
        if len(word_lower) >= 3:
            # Double the last letter
            variations.append(word_lower + word_lower[-1])
            
            # Double middle consonants
            for i in range(1, len(word_lower) - 1):
                if word_lower[i] not in 'aeiou':
                    variation = word_lower[:i+1] + word_lower[i] + word_lower[i+1:]
                    variations.append(variation)
        
        # Remove duplicates and return
        return list(set(variations))
    
    def create_filter_request(self, user_id: int, words: List[str], reason: str = None) -> 'ProhibitedWordRequest':
        """
        Create a new prohibited word request.
        
        Args:
            user_id: User making the request
            words: List of words to prohibit
            reason: Optional reason for the request
            
        Returns:
            ProhibitedWordRequest: Created request
        """
        from .filter_models import ProhibitedWordRequest
        from accounts.models import CustomUser as User
        
        user = User.objects.get(id=user_id)
        
        # Join words with commas
        words_text = ', '.join(words)
        
        request = ProhibitedWordRequest.objects.create(
            user=user,
            requested_words=words_text,
            reason=reason,
            status='pending'
        )
        
        return request
    
    def approve_request(self, request_id: int, admin_id: int, admin_notes: str = None) -> List['ProhibitedWord']:
        """
        Approve a prohibited word request and create active filters.
        
        Args:
            request_id: ID of the request to approve
            admin_id: ID of the admin approving
            admin_notes: Optional admin notes
            
        Returns:
            list: List of created ProhibitedWord objects
        """
        from .filter_models import ProhibitedWordRequest, ProhibitedWord
        from accounts.models import CustomUser as User
        from django.utils import timezone
        
        request = ProhibitedWordRequest.objects.get(id=request_id)
        admin = User.objects.get(id=admin_id)
        
        # Update request status
        request.status = 'approved'
        request.reviewed_by = admin
        request.reviewed_at = timezone.now()
        request.admin_notes = admin_notes
        request.save()
        
        # Parse requested words
        words = [w.strip().lower() for w in request.requested_words.split(',') if w.strip()]
        
        # Create ProhibitedWord entries
        created_words = []
        for word in words:
            # Generate variations
            variations = self.generate_variations(word)
            
            # Create or update
            prohibited_word, created = ProhibitedWord.objects.get_or_create(
                user=request.user,
                word=word,
                defaults={
                    'variations': variations,
                    'is_active': True,
                    'request': request,
                }
            )
            
            if not created:
                # Update existing
                prohibited_word.variations = variations
                prohibited_word.is_active = True
                prohibited_word.request = request
                prohibited_word.save()
            
            created_words.append(prohibited_word)
        
        return created_words
    
    def reject_request(self, request_id: int, admin_id: int, admin_notes: str = None):
        """
        Reject a prohibited word request.
        
        Args:
            request_id: ID of the request to reject
            admin_id: ID of the admin rejecting
            admin_notes: Optional admin notes
        """
        from .filter_models import ProhibitedWordRequest
        from accounts.models import CustomUser as User
        from django.utils import timezone
        
        request = ProhibitedWordRequest.objects.get(id=request_id)
        admin = User.objects.get(id=admin_id)
        
        request.status = 'rejected'
        request.reviewed_by = admin
        request.reviewed_at = timezone.now()
        request.admin_notes = admin_notes
        request.save()
    
    def get_comment_visibility(self, comment_id: int, viewer_id: int) -> Dict:
        """
        Determine if a comment should be visible to a specific viewer.
        
        Filtered comments are PRIVATE - visible only to:
        1. The commenter (with warning)
        2. The post owner (can see it)
        3. Nobody else (hidden from public)
        
        This matches the sentiment analyzer behavior for negative comments.
        
        Args:
            comment_id: ID of the comment
            viewer_id: ID of the user viewing
            
        Returns:
            dict: Visibility information
        """
        from .filter_models import FilteredComment
        from posts.models import Comment
        
        try:
            filtered = FilteredComment.objects.select_related('comment', 'post_owner', 'commenter').get(
                comment_id=comment_id
            )
            
            comment = filtered.comment
            
            # Commenter can always see their own comment (with warning and highlighted words)
            if viewer_id == filtered.commenter_id:
                return {
                    'visible': True,
                    'is_filtered': True,
                    'show_warning': True,
                    'matched_words': filtered.matched_words,
                }
            
            # Post owner CAN see filtered comments (to moderate their posts)
            if viewer_id == filtered.post_owner_id:
                return {
                    'visible': True,
                    'is_filtered': True,
                    'show_warning': False,
                }
            
            # Other users CANNOT see filtered comments (private/hidden)
            # This makes filtered comments private, like negative sentiment comments
            return {
                'visible': False,
                'is_filtered': True,
                'show_warning': False,
            }
            
        except FilteredComment.DoesNotExist:
            # Comment is not filtered, visible to everyone
            return {
                'visible': True,
                'is_filtered': False,
                'show_warning': False,
            }
    
    def get_visible_comments(self, post_id: int, viewer_id: int) -> List[int]:
        """
        Get list of comment IDs that should be visible to a viewer.
        
        Args:
            post_id: ID of the post
            viewer_id: ID of the viewer
            
        Returns:
            list: List of visible comment IDs
        """
        from .filter_models import FilteredComment
        from posts.models import Comment
        
        # Get all comments for the post
        all_comment_ids = Comment.objects.filter(post_id=post_id).values_list('id', flat=True)
        
        # Get filtered comments for this post
        filtered_comments = FilteredComment.objects.filter(
            comment_id__in=all_comment_ids
        ).select_related('commenter', 'post_owner')
        
        visible_ids = []
        
        for comment_id in all_comment_ids:
            # Check if this comment is filtered
            filtered = filtered_comments.filter(comment_id=comment_id).first()
            
            if not filtered:
                # Not filtered, visible to everyone
                visible_ids.append(comment_id)
            elif viewer_id == filtered.post_owner_id:
                # Post owner CAN see filtered comments (to moderate)
                visible_ids.append(comment_id)
            elif viewer_id == filtered.commenter_id:
                # Commenter can see their own filtered comment
                visible_ids.append(comment_id)
            # else: Other users cannot see filtered comments (private)
        
        return visible_ids
