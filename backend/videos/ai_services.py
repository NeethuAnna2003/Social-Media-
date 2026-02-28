"""
AI Services for Video Processing using Google Gen AI
Provides caption generation, translation, and thumbnail analysis
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Optional
from django.conf import settings
import google.generativeai as genai
from PIL import Image
import io
import base64

# Configure Google Gen AI
api_key = getattr(settings, 'GEMINI_API_KEY', None)
if api_key:
    genai.configure(api_key=api_key)


class GeminiCaptionService:
    """
    Generate captions for videos using Gemini API
    Supports multiple languages and translation
    """
    
    def __init__(self):
        try:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        except Exception as e:
            print(f"Failed to initialize Gemini model: {e}")
            self.model = None
    
    def extract_audio_transcript(self, video_path: str, language: str = 'auto') -> List[Dict]:
        """
        Extract transcript from video using Gemini
        
        Args:
            video_path: Path to video file
            language: Target language code (en, ml, etc.) or 'auto' for detection
        
        Returns:
            List of caption dictionaries with start_time, end_time, text
        """
        try:
            if not self.model:
                print("Gemini model not initialized")
                return []
            
            # For now, we'll use a simplified approach
            # In production, you'd upload the video to Gemini
            prompt = f"""
            Analyze this video and generate time-synced captions.
            Language: {language if language != 'auto' else 'detect automatically'}
            
            Return a JSON array of captions in this format:
            [
                {{
                    "start_time": 0.0,
                    "end_time": 3.5,
                    "text": "Caption text here",
                    "confidence": 0.95
                }}
            ]
            
            Make captions:
            - Accurate and readable
            - Well-timed (2-5 seconds each)
            - Natural sentence breaks
            - Include punctuation
            """
            
            # Note: This is a placeholder. In production, you'd:
            # 1. Upload video to Gemini File API
            # 2. Process with video understanding
            # 3. Extract actual timestamps
            
            response = self.model.generate_content(prompt)
            
            # Parse response
            try:
                captions = json.loads(response.text)
                return captions
            except json.JSONDecodeError:
                # Fallback: return empty captions
                return []
                
        except Exception as e:
            print(f"Error generating captions: {e}")
            return []
    
    def detect_language(self, text: str) -> str:
        """
        Detect language of text using Gemini
        
        Args:
            text: Text to analyze
        
        Returns:
            Language code (en, ml, hi, etc.)
        """
        try:
            prompt = f"""
            Detect the language of this text and return ONLY the ISO 639-1 language code.
            Examples: en (English), ml (Malayalam), hi (Hindi), ta (Tamil)
            
            Text: {text[:200]}
            
            Return only the 2-letter code, nothing else.
            """
            
            response = self.model.generate_content(prompt)
            lang_code = response.text.strip().lower()
            
            # Validate it's a 2-letter code
            if len(lang_code) == 2 and lang_code.isalpha():
                return lang_code
            
            return 'en'  # Default to English
            
        except Exception as e:
            print(f"Error detecting language: {e}")
            return 'en'
    
    def generate_captions_from_text(self, text: str, duration: float) -> List[Dict]:
        """
        Generate time-synced captions from plain text
        Useful when you have a transcript but no timestamps
        
        Args:
            text: Full transcript text
            duration: Video duration in seconds
        
        Returns:
            List of caption dictionaries
        """
        try:
            prompt = f"""
            Split this transcript into time-synced captions for a {duration}-second video.
            
            Transcript:
            {text}
            
            Return a JSON array with this format:
            [
                {{
                    "start_time": 0.0,
                    "end_time": 3.5,
                    "text": "Caption text",
                    "confidence": 0.95
                }}
            ]
            
            Rules:
            - Distribute evenly across {duration} seconds
            - Each caption 2-5 seconds long
            - Natural sentence breaks
            - Good reading pace
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                captions = json.loads(response.text)
                return captions
            except json.JSONDecodeError:
                # Fallback: split text manually
                return self._manual_caption_split(text, duration)
                
        except Exception as e:
            print(f"Error generating captions: {e}")
            return []
    
    def _manual_caption_split(self, text: str, duration: float) -> List[Dict]:
        """Fallback method to split text into captions"""
        words = text.split()
        words_per_caption = 8
        caption_duration = 3.5
        
        captions = []
        current_time = 0.0
        
        for i in range(0, len(words), words_per_caption):
            chunk = ' '.join(words[i:i+words_per_caption])
            captions.append({
                'start_time': current_time,
                'end_time': min(current_time + caption_duration, duration),
                'text': chunk,
                'confidence': 0.8
            })
            current_time += caption_duration
            
            if current_time >= duration:
                break
        
        return captions


class GeminiTranslationService:
    """
    Translate captions using Gemini API
    Maintains natural flow and timing
    """
    
    def __init__(self):
        try:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        except Exception as e:
            print(f"Failed to initialize Gemini translation model: {e}")
            self.model = None
    
    def translate_captions(
        self,
        captions: List[Dict],
        source_lang: str,
        target_lang: str
    ) -> List[Dict]:
        """
        Translate captions while preserving timestamps
        
        Args:
            captions: List of caption dictionaries
            source_lang: Source language code
            target_lang: Target language code
        
        Returns:
            List of translated caption dictionaries
        """
        try:
            # Prepare captions for translation
            texts = [cap['text'] for cap in captions]
            
            prompt = f"""
            Translate these captions from {source_lang} to {target_lang}.
            Maintain natural flow and sentence structure.
            
            Captions:
            {json.dumps(texts, ensure_ascii=False)}
            
            Return a JSON array of translated texts in the same order.
            Keep translations concise and readable.
            """
            
            response = self.model.generate_content(prompt)
            
            try:
                translated_texts = json.loads(response.text)
                
                # Create new captions with translations
                translated_captions = []
                for i, caption in enumerate(captions):
                    if i < len(translated_texts):
                        translated_captions.append({
                            **caption,
                            'text': translated_texts[i],
                            'is_translated': True,
                            'original_text': caption['text']
                        })
                
                return translated_captions
                
            except json.JSONDecodeError:
                return captions  # Return original if parsing fails
                
        except Exception as e:
            print(f"Error translating captions: {e}")
            return captions
    
    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate a single text
        
        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
        
        Returns:
            Translated text
        """
        try:
            prompt = f"""
            Translate this text from {source_lang} to {target_lang}.
            Maintain natural flow and meaning.
            
            Text: {text}
            
            Return only the translation, nothing else.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            print(f"Error translating text: {e}")
            return text


class GeminiThumbnailService:
    """
    Analyze video frames and suggest thumbnails using Gemini Vision
    """
    
    def __init__(self):
        try:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        except Exception as e:
            print(f"Failed to initialize Gemini thumbnail model: {e}")
            self.model = None
    
    def analyze_frame(self, image_path: str) -> Dict:
        """
        Analyze a video frame for thumbnail suitability
        
        Args:
            image_path: Path to frame image
        
        Returns:
            Analysis dictionary with quality score, has_face, emotion, etc.
        """
        try:
            # Load image
            with Image.open(image_path) as img:
                prompt = """
                Analyze this image for thumbnail suitability.
                
                Return a JSON object with:
                {
                    "quality_score": 0.0-1.0,
                    "has_face": true/false,
                    "emotion": "happy/neutral/serious/etc",
                    "is_clear": true/false,
                    "suggested_text": "Catchy title suggestion",
                    "description": "What's in the image"
                }
                
                Rate quality based on:
                - Clarity and sharpness
                - Good composition
                - Engaging subject
                - Suitable for thumbnail
                """
                
                response = self.model.generate_content([prompt, img])
            
            try:
                analysis = json.loads(response.text)
                return analysis
            except json.JSONDecodeError:
                return {
                    'quality_score': 0.5,
                    'has_face': False,
                    'emotion': 'neutral',
                    'is_clear': True,
                    'suggested_text': '',
                    'description': ''
                }
                
        except Exception as e:
            print(f"Error analyzing frame: {e}")
            return {
                'quality_score': 0.5,
                'has_face': False,
                'emotion': 'neutral',
                'is_clear': True
            }
    
    def suggest_thumbnail_text(self, video_title: str, frame_analysis: Dict, transcript: str = '') -> str:
        """
        Suggest catchy text for thumbnail overlay
        
        Args:
            video_title: Original video title
            frame_analysis: Frame analysis results
            transcript: Video transcript context (optional)
        
        Returns:
            Suggested thumbnail text
        """
        try:
            # Context from description and transcript
            context = f"Video Title: {video_title}\n"
            if transcript:
                context += f"Transcript Snippet: {transcript[:500]}...\n"
            if frame_analysis.get('description'):
                context += f"Visual Context: {frame_analysis['description']}\n"

            prompt = f"""
            Generate a short, high-impact "Hook" text for a YouTube thumbnail based on this context.
            
            Context:
            {context}
            
            Requirements:
            - MAX 2-5 words.
            - High contrast & curiosity-driven (Clickbait style but honest).
            - Use strong emotions or mystery (e.g., "This Changed Everything", "You Won't Believe This", "AI Did This 😳").
            - Match the likely tone (Informative, Dramatic, or Fun).
            
            Return ONLY the text, nothing else. No quotes.
            """
            
            response = self.model.generate_content(prompt)
            text = response.text.strip().replace('"', '').replace("'", "")
            
            # Fallback if too long
            if len(text.split()) > 6:
                text = ' '.join(text.split()[:5])
                
            return text
            
        except Exception as e:
            print(f"Error suggesting text: {e}")
            # Fallback: use first 4 words of title
            words = video_title.split()[:4]
            return ' '.join(words).upper()
    
    def rank_thumbnails(self, analyses: List[Dict]) -> List[int]:
        """
        Rank thumbnail options by quality
        
        Args:
            analyses: List of frame analyses
        
        Returns:
            List of indices sorted by quality (best first)
        """
        # Sort by quality score, face presence, and clarity
        ranked = sorted(
            enumerate(analyses),
            key=lambda x: (
                x[1].get('has_face', False),
                x[1].get('quality_score', 0),
                x[1].get('is_clear', False)
            ),
            reverse=True
        )
        
        return [idx for idx, _ in ranked]


# Convenience functions for easy import
def generate_captions(video_path: str, language: str = 'auto') -> List[Dict]:
    """Generate captions for a video"""
    service = GeminiCaptionService()
    return service.extract_audio_transcript(video_path, language)


def translate_captions(captions: List[Dict], source_lang: str, target_lang: str) -> List[Dict]:
    """Translate captions"""
    service = GeminiTranslationService()
    return service.translate_captions(captions, source_lang, target_lang)


def analyze_thumbnail(image_path: str) -> Dict:
    """Analyze a frame for thumbnail suitability"""
    service = GeminiThumbnailService()
    return service.analyze_frame(image_path)
