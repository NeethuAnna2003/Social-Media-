"""
Production-ready Audio Processing Service
Handles audio extraction, format conversion, and chunking for long videos
"""

import os
import tempfile
import subprocess
from pathlib import Path
from typing import List, Tuple, Optional
from django.conf import settings
from django.core.files.base import ContentFile
import logging

# Optional audio processing libraries — graceful fallback if missing
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    AudioSegment = None
    PYDUB_AVAILABLE = False

try:
    import speech_recognition as sr
    SR_AVAILABLE = True
except ImportError:
    sr = None
    SR_AVAILABLE = False

logger = logging.getLogger(__name__)


class AudioProcessingError(Exception):
    """Custom exception for audio processing errors"""
    pass


class AudioProcessor:
    """
    Robust audio extraction and processing service
    Supports multiple formats and handles edge cases
    """
    
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.supported_formats = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
        self.chunk_duration = 300  # 5 minutes for long videos
    
    def validate_video_file(self, video_path: str) -> bool:
        """
        Validate video file exists and is accessible
        
        Args:
            video_path: Path to video file
            
        Returns:
            True if valid
            
        Raises:
            AudioProcessingError: If file is invalid
        """
        if not os.path.exists(video_path):
            raise AudioProcessingError(f"Video file not found: {video_path}")
        
        if not os.access(video_path, os.R_OK):
            raise AudioProcessingError(f"Video file not readable: {video_path}")
        
        file_ext = Path(video_path).suffix.lower()
        if file_ext not in self.supported_formats:
            raise AudioProcessingError(f"Unsupported video format: {file_ext}")
        
        # Check file size (should be > 0)
        if os.path.getsize(video_path) == 0:
            raise AudioProcessingError(f"Video file is empty: {video_path}")
        
        return True
    
    def get_video_info(self, video_path: str) -> dict:
        """
        Extract video metadata using ffprobe
        
        Args:
            video_path: Path to video file
            
        Returns:
            Dictionary with duration, format, etc.
            
        Raises:
            AudioProcessingError: If ffprobe fails
        """
        try:
            # Get video duration
            duration_cmd = [
                'ffprobe', '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                video_path
            ]
            
            duration_result = subprocess.run(
                duration_cmd, 
                capture_output=True, 
                text=True, 
                timeout=30
            )
            
            if duration_result.returncode != 0:
                raise AudioProcessingError(f"ffprobe failed: {duration_result.stderr}")
            
            duration = float(duration_result.stdout.strip())
            
            # Get video format info
            format_cmd = [
                'ffprobe', '-v', 'error',
                '-show_entries', 'stream=codec_name,width,height',
                '-of', 'json',
                video_path
            ]
            
            format_result = subprocess.run(
                format_cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                'duration': duration,
                'is_long_video': duration > 600,  # 10 minutes
                'format_info': format_result.stdout if format_result.returncode == 0 else None
            }
            
        except subprocess.TimeoutExpired:
            raise AudioProcessingError("ffprobe timed out")
        except Exception as e:
            raise AudioProcessingError(f"Failed to get video info: {str(e)}")
    
    def extract_audio(self, video_path: str, output_path: Optional[str] = None) -> str:
        """
        Extract audio from video file using ffmpeg
        
        Args:
            video_path: Path to video file
            output_path: Optional output path for audio
            
        Returns:
            Path to extracted audio file
            
        Raises:
            AudioProcessingError: If extraction fails
        """
        try:
            if output_path is None:
                # Create temporary file
                temp_dir = tempfile.mkdtemp()
                output_path = os.path.join(temp_dir, f"audio_{os.path.basename(video_path)}.wav")
            
            # Extract audio using ffmpeg
            cmd = [
                'ffmpeg', '-i', video_path,
                '-vn',  # No video
                '-acodec', 'pcm_s16le',  # WAV format
                '-ar', '16000',  # 16kHz sample rate
                '-ac', '1',  # Mono
                '-y',  # Overwrite output
                output_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                raise AudioProcessingError(f"ffmpeg failed: {result.stderr}")
            
            if not os.path.exists(output_path):
                raise AudioProcessingError("Audio file was not created")
            
            # Verify audio file
            audio_size = os.path.getsize(output_path)
            if audio_size == 0:
                raise AudioProcessingError("Extracted audio file is empty")
            
            logger.info(f"Audio extracted successfully: {output_path} ({audio_size} bytes)")
            return output_path
            
        except subprocess.TimeoutExpired:
            raise AudioProcessingError("Audio extraction timed out")
        except Exception as e:
            raise AudioProcessingError(f"Failed to extract audio: {str(e)}")
    
    def chunk_audio(self, audio_path: str, chunk_duration: int = 300) -> List[str]:
        """
        Split audio into chunks for processing long videos
        
        Args:
            audio_path: Path to audio file
            chunk_duration: Chunk duration in seconds
            
        Returns:
            List of chunk file paths
        """
        try:
            # Load audio file
            audio = AudioSegment.from_wav(audio_path)
            duration_ms = len(audio)
            chunk_duration_ms = chunk_duration * 1000
            
            chunk_paths = []
            temp_dir = tempfile.mkdtemp()
            
            for i, start_ms in enumerate(range(0, duration_ms, chunk_duration_ms)):
                end_ms = min(start_ms + chunk_duration_ms, duration_ms)
                chunk = audio[start_ms:end_ms]
                
                chunk_path = os.path.join(temp_dir, f"chunk_{i:03d}.wav")
                chunk.export(chunk_path, format="wav")
                chunk_paths.append(chunk_path)
            
            logger.info(f"Audio split into {len(chunk_paths)} chunks")
            return chunk_paths
            
        except Exception as e:
            raise AudioProcessingError(f"Failed to chunk audio: {str(e)}")
    
    def convert_to_wav(self, audio_path: str) -> str:
        """
        Convert audio to WAV format for speech recognition
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Path to WAV file
        """
        try:
            audio = AudioSegment.from_file(audio_path)
            
            # Convert to mono, 16kHz
            audio = audio.set_channels(1)
            audio = audio.set_frame_rate(16000)
            
            temp_dir = tempfile.mkdtemp()
            wav_path = os.path.join(temp_dir, f"converted_{os.path.basename(audio_path)}.wav")
            
            audio.export(wav_path, format="wav")
            return wav_path
            
        except Exception as e:
            raise AudioProcessingError(f"Failed to convert audio: {str(e)}")
    
    def cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {path}: {e}")
    
    def process_audio_for_video(self, video_path: str) -> Tuple[str, List[str], dict]:
        """
        Complete audio processing pipeline for a video
        
        Args:
            video_path: Path to video file
            
        Returns:
            Tuple of (audio_path, chunk_paths, video_info)
        """
        temp_files = []
        
        try:
            # Validate video
            self.validate_video_file(video_path)
            
            # Get video info
            video_info = self.get_video_info(video_path)
            
            # Extract audio
            audio_path = self.extract_audio(video_path)
            temp_files.append(audio_path)
            
            # Convert to WAV if needed
            if not audio_path.endswith('.wav'):
                wav_path = self.convert_to_wav(audio_path)
                temp_files.append(wav_path)
                audio_path = wav_path
            
            # Chunk if long video
            chunk_paths = []
            if video_info['is_long_video']:
                chunk_paths = self.chunk_audio(audio_path, self.chunk_duration)
                temp_files.extend(chunk_paths)
            
            return audio_path, chunk_paths, video_info
            
        except Exception as e:
            # Cleanup on error
            self.cleanup_temp_files(temp_files)
            raise e


# Convenience function
def process_video_audio(video_path: str) -> Tuple[str, List[str], dict]:
    """
    Process audio for a video file
    
    Args:
        video_path: Path to video file
        
    Returns:
        Tuple of (audio_path, chunk_paths, video_info)
    """
    processor = AudioProcessor()
    return processor.process_audio_for_video(video_path)
