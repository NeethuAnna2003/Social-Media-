"""
Enhanced Video Processing with Gemini AI
Handles actual video processing, caption generation, and thumbnail creation
"""

import os
import tempfile
from pathlib import Path
from typing import List, Dict, Optional
from django.conf import settings
import google.generativeai as genai
from PIL import Image
import subprocess
import json

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)


class VideoProcessor:
    """
    Complete video processing with Gemini AI
    Extracts frames, generates captions, and creates thumbnails
    """
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def extract_frames(self, video_path: str, num_frames: int = 10) -> List[str]:
        """
        Extract frames from video using ffmpeg
        
        Args:
            video_path: Path to video file
            num_frames: Number of frames to extract
        
        Returns:
            List of frame file paths
        """
        try:
            # Create temp directory for frames
            temp_dir = tempfile.mkdtemp()
            frame_paths = []
            
            # Get video duration
            duration_cmd = [
                'ffprobe', '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                video_path
            ]
            
            try:
                duration = float(subprocess.check_output(duration_cmd).decode().strip())
            except:
                duration = 60  # Default to 60 seconds if ffprobe fails
            
            # Calculate frame intervals
            interval = duration / (num_frames + 1)
            
            # Extract frames
            for i in range(1, num_frames + 1):
                timestamp = interval * i
                frame_path = os.path.join(temp_dir, f'frame_{i:03d}.jpg')
                
                extract_cmd = [
                    'ffmpeg', '-ss', str(timestamp),
                    '-i', video_path,
                    '-vframes', '1',
                    '-q:v', '2',
                    frame_path,
                    '-y'
                ]
                
                try:
                    subprocess.run(extract_cmd, capture_output=True, check=True)
                    if os.path.exists(frame_path):
                        frame_paths.append(frame_path)
                except:
                    continue
            
            return frame_paths
            
        except Exception as e:
            print(f"Error extracting frames: {e}")
            return []
    
    def analyze_video_content(self, video_path: str) -> Dict:
        """
        Analyze video content using Gemini Vision
        
        Args:
            video_path: Path to video file
        
        Returns:
            Analysis dictionary with description, topics, etc.
        """
        try:
            # Extract a few frames
            frames = self.extract_frames(video_path, num_frames=5)
            
            if not frames:
                return {
                    'description': 'Video content',
                    'topics': [],
                    'language': 'en'
                }
            
            # Analyze first frame
            img = Image.open(frames[0])
            
            prompt = """
            Analyze this video frame and provide:
            1. A brief description of what's happening
            2. Main topics or themes
            3. Likely spoken language (en for English, ml for Malayalam, hi for Hindi, etc.)
            
            Return as JSON:
            {
                "description": "brief description",
                "topics": ["topic1", "topic2"],
                "language": "language_code"
            }
            """
            
            response = self.model.generate_content([prompt, img])
            
            try:
                result = json.loads(response.text)
                return result
            except:
                return {
                    'description': response.text[:200],
                    'topics': [],
                    'language': 'en'
                }
                
        except Exception as e:
            print(f"Error analyzing video: {e}")
            return {
                'description': 'Video content',
                'topics': [],
                'language': 'en'
            }
    
    def generate_captions_from_description(
        self,
        description: str,
        duration: float,
        language: str = 'en'
    ) -> List[Dict]:
        """
        Generate time-synced captions based on video description
        
        Args:
            description: Video description
            duration: Video duration in seconds
            language: Target language code
        
        Returns:
            List of caption dictionaries
        """
        try:
            prompt = f"""
            Create time-synced captions for a {duration}-second video about: {description}
            
            Language: {language}
            
            Generate realistic captions that would match this video content.
            Each caption should be 2-5 seconds long.
            
            Return as JSON array:
            [
                {{
                    "start_time": 0.0,
                    "end_time": 3.5,
                    "text": "Caption text here",
                    "confidence": 0.95
                }}
            ]
            
            Make captions natural and well-timed across the full {duration} seconds.
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                captions = json.loads(response.text)
                return captions
            except:
                # Fallback: create simple captions
                return self._create_fallback_captions(description, duration)
                
        except Exception as e:
            print(f"Error generating captions: {e}")
            return self._create_fallback_captions(description, duration)
    
    def _create_fallback_captions(self, text: str, duration: float) -> List[Dict]:
        """Create simple captions as fallback"""
        words = text.split()
        caption_length = 8  # words per caption
        caption_duration = 3.5  # seconds
        
        captions = []
        current_time = 0.0
        
        for i in range(0, len(words), caption_length):
            chunk = ' '.join(words[i:i+caption_length])
            end_time = min(current_time + caption_duration, duration)
            
            captions.append({
                'start_time': current_time,
                'end_time': end_time,
                'text': chunk,
                'confidence': 0.8
            })
            
            current_time = end_time
            if current_time >= duration:
                break
        
        return captions
    
    def select_best_thumbnail_frames(
        self,
        frame_paths: List[str]
    ) -> List[Dict]:
        """
        Analyze frames and select best for thumbnails
        
        Args:
            frame_paths: List of frame file paths
        
        Returns:
            List of frame analyses sorted by quality
        """
        analyses = []
        
        for idx, frame_path in enumerate(frame_paths):
            try:
                img = Image.open(frame_path)
                
                prompt = """
                Analyze this video frame for thumbnail suitability.
                
                Rate on:
                - Clarity and sharpness (0-1)
                - Has faces (true/false)
                - Emotion if face present
                - Overall quality (0-1)
                
                Return JSON:
                {
                    "quality_score": 0.85,
                    "has_face": true,
                    "emotion": "happy",
                    "is_clear": true
                }
                """
                
                response = self.model.generate_content([prompt, img])
                
                try:
                    analysis = json.loads(response.text)
                except:
                    analysis = {
                        'quality_score': 0.5,
                        'has_face': False,
                        'emotion': 'neutral',
                        'is_clear': True
                    }
                
                analysis['frame_path'] = frame_path
                analysis['frame_index'] = idx
                analyses.append(analysis)
                
            except Exception as e:
                print(f"Error analyzing frame {frame_path}: {e}")
                continue
        
        # Sort by quality
        analyses.sort(
            key=lambda x: (x.get('has_face', False), x.get('quality_score', 0)),
            reverse=True
        )
        
        return analyses[:4]  # Return top 4


# Convenience functions
def process_video_complete(video_path: str, duration: float) -> Dict:
    """
    Complete video processing pipeline
    
    Args:
        video_path: Path to video file
        duration: Video duration in seconds
    
    Returns:
        Dictionary with captions and thumbnail data
    """
    processor = VideoProcessor()
    
    # Analyze video
    analysis = processor.analyze_video_content(video_path)
    
    # Generate captions
    captions = processor.generate_captions_from_description(
        analysis['description'],
        duration,
        analysis.get('language', 'en')
    )
    
    # Extract and analyze frames
    frames = processor.extract_frames(video_path, num_frames=10)
    thumbnail_frames = processor.select_best_thumbnail_frames(frames)
    
    return {
        'analysis': analysis,
        'captions': captions,
        'thumbnail_frames': thumbnail_frames,
        'detected_language': analysis.get('language', 'en')
    }
