"""
Production-Ready Caption Generation Service
Uses Whisper AI for real speech-to-text processing
"""

import os
import subprocess
from pathlib import Path
from typing import List, Dict, Optional
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class CaptionGenerationService:
    """
    Production caption generation with real audio processing
    """
    
    def __init__(self):
        self.temp_dir = Path(settings.TEMP_AUDIO_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize Whisper model (lazy loading)
        self._whisper_model = None
    
    @property
    def whisper_model(self):
        """Lazy load Whisper model"""
        if self._whisper_model is None:
            try:
                import whisper
                model_size = settings.WHISPER_MODEL_SIZE
                logger.info(f"Loading Whisper model: {model_size}")
                self._whisper_model = whisper.load_model(model_size)
                logger.info("Whisper model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                raise
        return self._whisper_model
    
    def generate_captions(
        self,
        video_path: str,
        language: str = 'auto',
        job=None
    ) -> Dict:
        """
        Main caption generation pipeline
        
        Args:
            video_path: Path to video file
            language: Language code or 'auto' for detection
            job: CaptionProcessingJob instance for progress tracking
        
        Returns:
            {
                'success': bool,
                'captions': List[Dict],
                'detected_language': str,
                'error': Optional[str],
                'error_type': Optional[str]
            }
        """
        audio_path = None
        
        try:
            # Step 1: Validate video file
            if not os.path.exists(video_path):
                return self._error_response(
                    'Video file not found',
                    'file_not_found'
                )
            
            logger.info(f"Starting caption generation for: {video_path}")
            self._update_job(job, 'extracting_audio', 10)
            
            # Step 2: Extract audio
            audio_path = self._extract_audio(video_path)
            if not audio_path:
                return self._error_response(
                    'Failed to extract audio from video',
                    'audio_extraction_failed'
                )
            
            logger.info(f"Audio extracted to: {audio_path}")
            self._update_job(job, 'detecting_language', 30)
            
            # Step 3: Detect language (if auto)
            if language == 'auto':
                detected_lang = self._detect_language(audio_path)
                logger.info(f"Detected language: {detected_lang}")
            else:
                detected_lang = language
            
            self._update_job(job, 'generating_captions', 50)
            
            # Step 4: Generate captions using Whisper
            captions = self._transcribe_audio(audio_path, detected_lang)
            
            if not captions:
                return self._error_response(
                    'No captions could be generated from audio',
                    'transcription_failed'
                )
            
            logger.info(f"Generated {len(captions)} captions")
            
            # Step 5: Cleanup
            self._cleanup_temp_file(audio_path)
            
            self._update_job(job, 'completed', 100)
            
            return {
                'success': True,
                'captions': captions,
                'detected_language': detected_lang,
                'error': None,
                'error_type': None
            }
            
        except Exception as e:
            logger.error(f"Caption generation failed: {e}", exc_info=True)
            self._cleanup_temp_file(audio_path)
            return self._error_response(
                str(e),
                'unexpected_error'
            )
    
    def _extract_audio(self, video_path: str) -> Optional[str]:
        """
        Extract audio from video using ffmpeg
        
        Returns:
            Path to extracted audio file or None if failed
        """
        try:
            video_name = Path(video_path).stem
            audio_path = self.temp_dir / f"{video_name}_{os.getpid()}.wav"
            
            # ffmpeg command to extract audio
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-vn',  # No video
                '-acodec', 'pcm_s16le',  # PCM 16-bit
                '-ar', '16000',  # 16kHz sample rate
                '-ac', '1',  # Mono
                '-y',  # Overwrite
                str(audio_path)
            ]
            
            logger.info(f"Running ffmpeg: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"ffmpeg error: {result.stderr}")
                return None
            
            if not os.path.exists(audio_path):
                logger.error("Audio file was not created")
                return None
            
            return str(audio_path)
            
        except subprocess.TimeoutExpired:
            logger.error("Audio extraction timed out")
            return None
        except FileNotFoundError:
            logger.error("ffmpeg not found. Please install ffmpeg.")
            return None
        except Exception as e:
            logger.error(f"Audio extraction failed: {e}")
            return None
    
    def _detect_language(self, audio_path: str) -> str:
        """
        Detect language from audio using Whisper
        
        Returns:
            ISO 639-1 language code
        """
        try:
            import whisper
            
            # Load first 30 seconds for language detection
            audio = whisper.load_audio(audio_path, sr=16000)
            audio = whisper.pad_or_trim(audio)
            
            # Detect language
            mel = whisper.log_mel_spectrogram(audio).to(self.whisper_model.device)
            _, probs = self.whisper_model.detect_language(mel)
            
            detected_lang = max(probs, key=probs.get)
            confidence = probs[detected_lang]
            
            logger.info(f"Language detection: {detected_lang} (confidence: {confidence:.2f})")
            
            return detected_lang
            
        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            return 'en'  # Default to English
    
    def _transcribe_audio(self, audio_path: str, language: str) -> List[Dict]:
        """
        Transcribe audio to captions using Whisper
        
        Returns:
            List of caption dictionaries with timestamps
        """
        try:
            logger.info(f"Transcribing audio in {language}")
            
            # Transcribe with word-level timestamps
            result = self.whisper_model.transcribe(
                audio_path,
                language=language,
                word_timestamps=True,
                verbose=False
            )
            
            # Convert to caption format
            captions = []
            
            for segment in result['segments']:
                # Filter by confidence if available
                confidence = segment.get('no_speech_prob', 0.0)
                if confidence > 0.8:  # Skip if too much silence
                    continue
                
                text = segment['text'].strip()
                if not text:
                    continue
                
                # Ensure caption isn't too long
                if len(text) > settings.MAX_CAPTION_LENGTH:
                    # Split long captions
                    words = text.split()
                    chunk_size = 10
                    for i in range(0, len(words), chunk_size):
                        chunk = ' '.join(words[i:i+chunk_size])
                        captions.append({
                            'start_time': segment['start'] + (i / len(words)) * (segment['end'] - segment['start']),
                            'end_time': segment['start'] + ((i + chunk_size) / len(words)) * (segment['end'] - segment['start']),
                            'text': chunk,
                            'confidence': 1.0 - confidence
                        })
                else:
                    captions.append({
                        'start_time': segment['start'],
                        'end_time': segment['end'],
                        'text': text,
                        'confidence': 1.0 - confidence
                    })
            
            return captions
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return []
    
    def _update_job(self, job, status: str, progress: int):
        """Update job status and progress"""
        if job:
            job.status = status
            job.progress = progress
            job.save(update_fields=['status', 'progress'])
            logger.info(f"Job {job.id} updated: {status} ({progress}%)")
    
    def _cleanup_temp_file(self, file_path: Optional[str]):
        """Remove temporary audio file"""
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Cleaned up temp file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file: {e}")
    
    def _error_response(self, error: str, error_type: str) -> Dict:
        """Create error response"""
        return {
            'success': False,
            'captions': [],
            'detected_language': None,
            'error': error,
            'error_type': error_type
        }
