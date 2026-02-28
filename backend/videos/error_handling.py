"""
Error handling and recovery utilities for AI video processing
Provides comprehensive error tracking, retry logic, and user feedback
"""

import logging
import traceback
from typing import Dict, Any, Optional, List
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    AUDIO_PROCESSING = "audio_processing"
    SPEECH_RECOGNITION = "speech_recognition"
    AI_SERVICE = "ai_service"
    VIDEO_PROCESSING = "video_processing"
    FILE_SYSTEM = "file_system"
    NETWORK = "network"
    VALIDATION = "validation"
    PERMISSION = "permission"
    TIMEOUT = "timeout"


@dataclass
class ProcessingError:
    """Structured error information"""
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    technical_details: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    user_friendly_message: Optional[str] = None
    recovery_suggestions: Optional[List[str]] = None
    timestamp: timezone.datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = timezone.now()
        
        # Generate user-friendly message if not provided
        if not self.user_friendly_message:
            self.user_friendly_message = self._generate_user_message()
        
        # Generate recovery suggestions if not provided
        if not self.recovery_suggestions:
            self.recovery_suggestions = self._generate_recovery_suggestions()
    
    def _generate_user_message(self) -> str:
        """Generate user-friendly error message"""
        messages = {
            ErrorCategory.AUDIO_PROCESSING: "Audio processing failed. The video file may be corrupted or in an unsupported format.",
            ErrorCategory.SPEECH_RECOGNITION: "Speech recognition failed. The audio may be unclear or in an unsupported language.",
            ErrorCategory.AI_SERVICE: "AI service temporarily unavailable. Please try again in a few minutes.",
            ErrorCategory.VIDEO_PROCESSING: "Video processing failed. The file may be too large or corrupted.",
            ErrorCategory.FILE_SYSTEM: "Storage issue detected. Please contact support.",
            ErrorCategory.NETWORK: "Network connection failed. Please check your internet connection.",
            ErrorCategory.VALIDATION: "Invalid input provided. Please check your file format and settings.",
            ErrorCategory.PERMISSION: "Permission denied. Please check your account settings.",
            ErrorCategory.TIMEOUT: "Processing timed out. The file may be too large or the service is busy.",
        }
        return messages.get(self.category, "An unexpected error occurred during processing.")
    
    def _generate_recovery_suggestions(self) -> List[str]:
        """Generate recovery suggestions based on error type"""
        suggestions = {
            ErrorCategory.AUDIO_PROCESSING: [
                "Try uploading a different video format (MP4 recommended)",
                "Check if the video file plays correctly",
                "Ensure the video has audio content",
                "Try a smaller video file"
            ],
            ErrorCategory.SPEECH_RECOGNITION: [
                "Ensure the video has clear speech",
                "Try reducing background noise",
                "Check if the language is supported",
                "Try manual caption entry"
            ],
            ErrorCategory.AI_SERVICE: [
                "Wait a few minutes and try again",
                "Check if you have exceeded usage limits",
                "Try generating captions for a shorter video",
                "Contact support if the issue persists"
            ],
            ErrorCategory.VIDEO_PROCESSING: [
                "Try a smaller video file (under 2GB)",
                "Ensure the video is not corrupted",
                "Try a different video format",
                "Check available storage space"
            ],
            ErrorCategory.FILE_SYSTEM: [
                "Contact support immediately",
                "Try uploading to a different account",
                "Check your storage quota"
            ],
            ErrorCategory.NETWORK: [
                "Check your internet connection",
                "Try again with a stable connection",
                "Use a wired connection if possible",
                "Try uploading from a different network"
            ],
            ErrorCategory.VALIDATION: [
                "Check file format requirements",
                "Ensure all required fields are filled",
                "Verify file size limits",
                "Check language settings"
            ],
            ErrorCategory.PERMISSION: [
                "Check your account permissions",
                "Ensure you're logged in correctly",
                "Contact your administrator",
                "Try logging out and back in"
            ],
            ErrorCategory.TIMEOUT: [
                "Try a smaller video file",
                "Check your internet speed",
                "Try during off-peak hours",
                "Contact support for large files"
            ],
        }
        return suggestions.get(self.category, ["Try again later", "Contact support if the issue persists"])


class ErrorHandler:
    """
    Centralized error handling and recovery system
    """
    
    def __init__(self):
        self.error_log = []
        self.max_log_size = 1000
    
    def handle_error(
        self,
        error: Exception,
        category: ErrorCategory,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        video_id: Optional[int] = None
    ) -> ProcessingError:
        """
        Handle and log an error
        
        Args:
            error: The exception that occurred
            category: Error category
            severity: Error severity
            context: Additional context information
            user_id: User ID if available
            video_id: Video ID if available
            
        Returns:
            ProcessingError object
        """
        # Create structured error
        processing_error = ProcessingError(
            category=category,
            severity=severity,
            message=str(error),
            technical_details=traceback.format_exc(),
            context=context,
            user_id=user_id,
            video_id=video_id
        )
        
        # Log error
        self._log_error(processing_error)
        
        # Send notifications for critical errors
        if severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            self._send_notification(processing_error)
        
        # Add to error log
        self._add_to_log(processing_error)
        
        return processing_error
    
    def _log_error(self, error: ProcessingError):
        """Log error to system logs"""
        log_data = {
            'category': error.category.value,
            'severity': error.severity.value,
            'message': error.message,
            'timestamp': error.timestamp.isoformat(),
        }
        
        if error.technical_details:
            log_data['technical_details'] = error.technical_details
        
        if hasattr(error, 'context') and error.context:
            log_data['context'] = error.context
        
        if hasattr(error, 'user_id') and error.user_id:
            log_data['user_id'] = error.user_id
        
        if hasattr(error, 'video_id') and error.video_id:
            log_data['video_id'] = error.video_id
        
        # Log with appropriate level
        if error.severity == ErrorSeverity.CRITICAL:
            logger.critical(f"Critical error: {error.message}", extra=log_data)
        elif error.severity == ErrorSeverity.HIGH:
            logger.error(f"High severity error: {error.message}", extra=log_data)
        elif error.severity == ErrorSeverity.MEDIUM:
            logger.warning(f"Medium severity error: {error.message}", extra=log_data)
        else:
            logger.info(f"Low severity error: {error.message}", extra=log_data)
    
    def _send_notification(self, error: ProcessingError):
        """Send notification for critical errors"""
        if not settings.DEBUG:  # Only in production
            try:
                subject = f"Critical Error in Video Processing: {error.category.value}"
                message = f"""
                Category: {error.category.value}
                Severity: {error.severity.value}
                Message: {error.message}
                Timestamp: {error.timestamp}
                
                Technical Details:
                {error.technical_details}
                
                User ID: {getattr(error, 'user_id', 'N/A')}
                Video ID: {getattr(error, 'video_id', 'N/A')}
                """
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[settings.ADMIN_EMAIL],
                    fail_silently=False
                )
            except Exception as e:
                logger.error(f"Failed to send error notification: {e}")
    
    def _add_to_log(self, error: ProcessingError):
        """Add error to in-memory log"""
        self.error_log.append(error)
        
        # Trim log if too large
        if len(self.error_log) > self.max_log_size:
            self.error_log = self.error_log[-self.max_log_size:]
    
    def get_error_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get summary of recent errors"""
        cutoff_time = timezone.now() - timezone.timedelta(hours=hours)
        recent_errors = [e for e in self.error_log if e.timestamp > cutoff_time]
        
        summary = {
            'total_errors': len(recent_errors),
            'by_category': {},
            'by_severity': {},
            'top_errors': []
        }
        
        for error in recent_errors:
            # Count by category
            category = error.category.value
            summary['by_category'][category] = summary['by_category'].get(category, 0) + 1
            
            # Count by severity
            severity = error.severity.value
            summary['by_severity'][severity] = summary['by_severity'].get(severity, 0) + 1
        
        # Get most common errors
        error_counts = {}
        for error in recent_errors:
            key = f"{error.category.value}:{error.message}"
            error_counts[key] = error_counts.get(key, 0) + 1
        
        summary['top_errors'] = sorted(
            error_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return summary
    
    def can_retry(self, error: ProcessingError) -> bool:
        """Determine if an error can be retried"""
        return error.retry_count < error.max_retries
    
    def increment_retry(self, error: ProcessingError) -> ProcessingError:
        """Increment retry count"""
        error.retry_count += 1
        return error


class RetryManager:
    """
    Manages retry logic for failed operations
    """
    
    def __init__(self):
        self.retry_delays = {
            ErrorSeverity.LOW: 1,      # 1 second
            ErrorSeverity.MEDIUM: 5,   # 5 seconds
            ErrorSeverity.HIGH: 30,    # 30 seconds
            ErrorSeverity.CRITICAL: 60 # 1 minute
        }
    
    def get_retry_delay(self, error: ProcessingError) -> int:
        """Get delay before next retry"""
        base_delay = self.retry_delays.get(error.severity, 30)
        
        # Exponential backoff
        return base_delay * (2 ** error.retry_count)
    
    def should_retry(self, error: ProcessingError) -> bool:
        """Determine if operation should be retried"""
        # Don't retry certain error types
        non_retryable_categories = [
            ErrorCategory.PERMISSION,
            ErrorCategory.VALIDATION,
            ErrorCategory.FILE_SYSTEM
        ]
        
        if error.category in non_retryable_categories:
            return False
        
        # Check retry count
        return error.retry_count < error.max_retries


class RecoveryManager:
    """
    Manages recovery strategies for different error types
    """
    
    def __init__(self):
        self.recovery_strategies = {
            ErrorCategory.AUDIO_PROCESSING: self._recover_audio_processing,
            ErrorCategory.SPEECH_RECOGNITION: self._recover_speech_recognition,
            ErrorCategory.AI_SERVICE: self._recover_ai_service,
            ErrorCategory.VIDEO_PROCESSING: self._recover_video_processing,
            ErrorCategory.NETWORK: self._recover_network,
            ErrorCategory.TIMEOUT: self._recover_timeout,
        }
    
    def attempt_recovery(self, error: ProcessingError, context: Dict[str, Any]) -> Dict[str, Any]:
        """Attempt to recover from error"""
        strategy = self.recovery_strategies.get(error.category)
        
        if strategy:
            try:
                return strategy(error, context)
            except Exception as e:
                logger.error(f"Recovery strategy failed: {e}")
                return {'success': False, 'message': 'Recovery failed'}
        
        return {'success': False, 'message': 'No recovery strategy available'}
    
    def _recover_audio_processing(self, error: ProcessingError, context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from audio processing errors"""
        video_path = context.get('video_path')
        
        if not video_path:
            return {'success': False, 'message': 'No video path provided'}
        
        # Try alternative audio extraction
        try:
            from .audio_processor import AudioProcessor
            processor = AudioProcessor()
            
            # Validate file again
            processor.validate_video_file(video_path)
            
            # Try with different settings
            audio_path = processor.extract_audio(video_path)
            
            return {
                'success': True,
                'message': 'Audio extraction recovered with alternative method',
                'audio_path': audio_path
            }
        except Exception as e:
            return {'success': False, 'message': f'Recovery failed: {str(e)}'}
    
    def _recover_speech_recognition(self, error: ProcessingError, context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from speech recognition errors"""
        # Try with different language settings
        suggestions = [
            "Try with English language setting",
            "Check audio quality",
            "Try manual caption entry"
        ]
        
        return {
            'success': False,
            'message': 'Speech recognition requires manual intervention',
            'suggestions': suggestions
        }
    
    def _recover_ai_service(self, error: ProcessingError, context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from AI service errors"""
        # Check service availability
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
            # Test connection
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content("test")
            
            return {
                'success': True,
                'message': 'AI service is now available'
            }
        except Exception as e:
            return {
                'success': False,
                'message': 'AI service still unavailable',
                'suggestion': 'Wait and try again later'
            }
    
    def _recover_video_processing(self, error: ProcessingError, context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from video processing errors"""
        return {
            'success': False,
            'message': 'Video processing requires file validation',
            'suggestions': [
                'Check video file integrity',
                'Try a different file format',
                'Reduce file size'
            ]
        }
    
    def _recover_network(self, error: ProcessingError, context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from network errors"""
        return {
            'success': False,
            'message': 'Network issue detected',
            'suggestions': [
                'Check internet connection',
                'Try again with stable connection',
                'Use wired connection if possible'
            ]
        }
    
    def _recover_timeout(self, error: ProcessingError, context: Dict[str, Any]) -> Dict[str, Any]:
        """Recover from timeout errors"""
        return {
            'success': False,
            'message': 'Processing timed out',
            'suggestions': [
                'Try with smaller file',
                'Process during off-peak hours',
                'Check system resources'
            ]
        }


# Global error handler instance
error_handler = ErrorHandler()
retry_manager = RetryManager()
recovery_manager = RecoveryManager()


def handle_processing_error(
    error: Exception,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    **kwargs
) -> ProcessingError:
    """Convenience function to handle processing errors"""
    return error_handler.handle_error(error, category, severity, **kwargs)


def create_user_error_response(error: ProcessingError) -> Dict[str, Any]:
    """Create user-friendly error response"""
    return {
        'error': error.user_friendly_message,
        'error_code': f"{error.category.value}_{error.severity.value}",
        'retry_available': retry_manager.should_retry(error),
        'recovery_suggestions': error.recovery_suggestions,
        'timestamp': error.timestamp.isoformat()
    }
