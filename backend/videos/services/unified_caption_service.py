"""
Unified Caption Service — Production-Ready
==========================================
Single source of truth for caption generation.
Uses AssemblyAICaptionService which handles:
  1. AssemblyAI cloud  (95%+ accuracy, requires API key)
  2. OpenAI Whisper    (99%+ accuracy, fully local, no key needed)

NO DEMO/FAKE CAPTIONS — only real AI transcription.
"""

import logging
from typing import List, Optional
from django.conf import settings
from ..models import Video, Caption, CaptionProcessingJob
from .assemblyai_caption_service import AssemblyAICaptionService

logger = logging.getLogger(__name__)

# Keep these for __init__.py compatibility
WHISPER_AVAILABLE = True


class UnifiedCaptionService:
    """
    Orchestrates real AI caption generation.
    Delegates entirely to AssemblyAICaptionService which handles
    AssemblyAI cloud → OpenAI Whisper local fallback.
    """

    def __init__(self):
        self.engine = AssemblyAICaptionService()

    def generate_captions(
        self,
        video: Video,
        language: str = 'auto',
        job: Optional[CaptionProcessingJob] = None
    ) -> List[Caption]:
        """
        Generate real AI captions for a video.
        Returns list of saved Caption objects.
        Raises Exception on complete failure (never returns fake captions).
        """
        logger.info(
            f"UnifiedCaptionService: generating captions for video {video.id} "
            f"(lang={language}, model={self.engine.model_size})"
        )

        result = self.engine.generate_captions(
            video_path=video.video_file.path,
            language=language,
            job=job,
        )

        if not result['success'] or not result['captions']:
            error = result.get('error', 'Caption generation produced no output.')
            logger.error(f"Caption generation failed for video {video.id}: {error}")
            # Update video status
            video.status = 'failed'
            video.error_message = error
            video.save()
            raise Exception(error)

        detected_language = result.get('detected_language') or 'en'
        engine_used = result.get('engine', 'unknown')

        # Persist Caption objects to DB
        caption_objects: List[Caption] = []
        for cap in result['captions']:
            obj = Caption.objects.create(
                video=video,
                language=detected_language,
                start_time=cap['start_time'],
                end_time=cap['end_time'],
                text=cap['text'],
                confidence=cap.get('confidence', 0.9),
                is_translated=False,
            )
            caption_objects.append(obj)

        # Update video metadata
        video.status = 'ready'
        video.processing_progress = 100
        video.original_language = detected_language
        video.error_message = None
        video.save()

        logger.info(
            f"Generated {len(caption_objects)} real captions for video {video.id} "
            f"via {engine_used} (lang={detected_language})"
        )
        return caption_objects
