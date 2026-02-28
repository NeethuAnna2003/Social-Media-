"""
Local Whisper Service
Production-ready caption generation using OpenAI Whisper (local execution)
"""

import os
import logging
from typing import List, Optional
from django.conf import settings
from django.utils import timezone

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    logging.warning("Whisper not installed. Install with: pip install openai-whisper")

from ..audio_processor import AudioProcessor
from ..models import Video, Caption, CaptionProcessingJob

logger = logging.getLogger(__name__)


class CaptionGenerationError(Exception):
    """Custom exception for caption generation errors"""
    pass


class LocalWhisperService:
    """
    Whisper-based caption generator (runs locally)
    Supports 99 languages with high accuracy
    """
    
    def __init__(self):
        self.audio_processor = AudioProcessor()
        
        # Use 'small' model by default for balance
        self.model_size = getattr(settings, 'WHISPER_MODEL_SIZE', 'small')
        self.device = getattr(settings, 'WHISPER_DEVICE', 'cpu')
        
        # Language mapping
        self.language_mapping = {
            'auto': None,  # Auto-detect
            'en': 'english',
            'ml': 'malayalam',
            'hi': 'hindi',
            'ta': 'tamil',
            'te': 'telugu',
            'kn': 'kannada',
            'bn': 'bengali',
            'gu': 'gujarati',
            'mr': 'marathi',
            'pa': 'punjabi',
            'or': 'odia',
            'as': 'assamese',
            # Add common european languages
            'es': 'spanish', 'fr': 'french', 'de': 'german',
            'it': 'italian', 'pt': 'portuguese', 'ru': 'russian',
            'ja': 'japanese', 'ko': 'korean', 'zh': 'chinese',
            'ar': 'arabic'
        }
        
        self.language_code_mapping = {v: k for k, v in self.language_mapping.items() if v}
        self.model = None
    
    def _load_model(self):
        """Lazy load Whisper model"""
        if not WHISPER_AVAILABLE:
            raise CaptionGenerationError("Whisper is not installed.")
        
        if self.model is None:
            logger.info(f"Loading Whisper model: {self.model_size}")
            try:
                self.model = whisper.load_model(self.model_size, device=self.device)
                logger.info(f"Whisper model loaded successfully on {self.device}")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                raise CaptionGenerationError(f"Failed to load Whisper model: {e}")
    
    def generate_captions(
        self, 
        video: Video, 
        language: str = 'auto',
        job: Optional[CaptionProcessingJob] = None
    ) -> List[Caption]:
        """
        Generate captions using Whisper
        
        Returns:
            List of created Caption objects
        """
        temp_files = []
        
        try:
            if job:
                job.status = 'processing'
                job.progress = 10
                job.save()
            
            # Load model first to fail fast
            self._load_model()
            
            # Extract audio
            logger.info(f"Extracting audio from video: {video.video_file.path}")
            audio_path, chunk_paths, video_info = self.audio_processor.process_audio_for_video(
                video.video_file.path
            )
            temp_files.append(audio_path)
            temp_files.extend(chunk_paths)
            
            if job:
                job.progress = 30
                job.save()
            
            # Determine language
            whisper_language = self.language_mapping.get(language, None)
            
            # Process
            all_captions = []
            detected_language_code = None
            
            if chunk_paths:
                # Long video
                total_chunks = len(chunk_paths)
                for i, chunk_path in enumerate(chunk_paths):
                    chunk_start = i * self.audio_processor.chunk_duration
                    chunk_captions, chunk_lang = self._transcribe_with_whisper(
                        chunk_path, whisper_language, chunk_start
                    )
                    all_captions.extend(chunk_captions)
                    if not detected_language_code and chunk_lang:
                        detected_language_code = chunk_lang
                        
                    if job:
                        progress = 30 + (50 * (i + 1) / total_chunks)
                        job.progress = int(progress)
                        job.save()
            else:
                # Short video
                all_captions, detected_language_code = self._transcribe_with_whisper(
                    audio_path, whisper_language
                )
                
                if job:
                    job.progress = 80
                    job.save()
            
            if not all_captions:
                raise CaptionGenerationError("Whisper generated no captions.")
            
            # Save captions
            caption_objects = []
            
            # Use detected language or fallback
            final_language = detected_language_code or (language if language != 'auto' else 'en')
            
            for caption_data in all_captions:
                caption = Caption.objects.create(
                    video=video,
                    language=caption_data.get('language', final_language),
                    start_time=caption_data['start_time'],
                    end_time=caption_data['end_time'],
                    text=caption_data['text'],
                    confidence=caption_data.get('confidence', 0.9)
                )
                caption_objects.append(caption)
            
            logger.info(f"Generated {len(caption_objects)} captions via Whisper")
            return caption_objects
            
        except Exception as e:
            logger.error(f"Whisper generation failed: {e}")
            raise e  # Propagate to Unified Service
        
        finally:
            self.audio_processor.cleanup_temp_files(temp_files)
    
    def _transcribe_with_whisper(self, audio_path, language, chunk_start_time=0.0):
        """Internal transcription logic"""
        try:
            logger.info(f"Transcribing {audio_path}...")
            result = self.model.transcribe(
                audio_path,
                task='transcribe',
                language=language,
                temperature=0.0,
                best_of=3,
                word_timestamps=True,
                fp16=False,
                condition_on_previous_text=True
            )
            
            detected_lang_name = result.get('language', 'english')
            detected_lang_code = self.language_code_mapping.get(detected_lang_name, 'en')
            
            captions = []
            segments = result.get('segments', [])
            
            for segment in segments:
                start = segment['start'] + chunk_start_time
                end = segment['end'] + chunk_start_time
                text = segment['text'].strip()
                
                # Check logprob for confidence approximation
                avg_logprob = segment.get('avg_logprob', -1.0)
                confidence = max(0.0, min(1.0, (avg_logprob + 1.0)))
                
                if text:
                    captions.append({
                        'start_time': start,
                        'end_time': end,
                        'text': text,
                        'language': detected_lang_code,
                        'confidence': confidence
                    })
            
            return captions, detected_lang_code
            
        except Exception as e:
            logger.error(f"Transcribe error: {e}")
            return [], None
