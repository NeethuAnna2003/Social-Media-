"""
Caption Services Package
Unified caption generation system for Connectify AI
"""

from .unified_caption_service import UnifiedCaptionService
from .assemblyai_caption_service import AssemblyAICaptionService

# Compatibility shim — WHISPER_AVAILABLE is always True since openai-whisper is installed
WHISPER_AVAILABLE = True

__all__ = [
    'UnifiedCaptionService',
    'AssemblyAICaptionService',
    'WHISPER_AVAILABLE',
]
