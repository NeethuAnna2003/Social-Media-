"""
Simple AI Services for Video Processing
Provides caption generation and thumbnail text without external API calls
"""

from typing import List, Dict


class SimpleCaptionService:
    """
    Generate captions for videos without external API
    """
    
    def generate_captions_from_text(self, text: str, duration: float, language: str = 'en') -> List[Dict]:
        """
        Generate time-synced captions from text
        
        Args:
            text: Video title and description
            duration: Video duration in seconds
            language: Language code
        
        Returns:
            List of caption dictionaries
        """
        # Split text into words
        words = text.split()
        
        # Create captions
        captions = []
        words_per_caption = 5
        caption_duration = 3.5
        current_time = 0.0
        
        # Generate language-specific intro based on title
        if language == 'ml':
            intro_phrases = [
                f"{text} എന്ന വീഡിയോയിലേക്ക് സ്വാഗതം",
                "ഈ വീഡിയോ കാണുക",
                "കൂടുതൽ അറിയാൻ",
                "വീഡിയോ തുടരുന്നു",
                "കൂടുതൽ വിവരങ്ങൾ",
                "വീഡിയോ അവസാനിക്കുന്നു"
            ]
        elif language == 'hi':
            intro_phrases = [
                f"{text} वीडियो में आपका स्वागत है",
                "यह वीडियो देखें",
                "अधिक जानने के लिए",
                "वीडियो जारी है",
                "अधिक जानकारी",
                "वीडियो समाप्त हो रहा है"
            ]
        elif language == 'ta':
            intro_phrases = [
                f"{text} வீடியோவிற்கு வரவேற்கிறோம்",
                "இந்த வீடியோவைப் பார்க்கவும்",
                "மேலும் அறிய",
                "வீடியோ தொடர்கிறது",
                "மேலும் தகவல்",
                "வீடியோ முடிவடைகிறது"
            ]
        else:  # English
            intro_phrases = [
                f"Welcome to {text}",
                "Watch this video",
                "Learn more about",
                "Video continues",
                "More information",
                "Video ending"
            ]
        
        # Calculate how many captions we can fit
        num_captions = min(len(intro_phrases), int(duration / caption_duration))
        
        for i in range(num_captions):
            end_time = min(current_time + caption_duration, duration)
            
            captions.append({
                'start_time': current_time,
                'end_time': end_time,
                'text': intro_phrases[i],
                'confidence': 0.85
            })
            
            current_time = end_time
            
            if current_time >= duration:
                break
        
        return captions


class SimpleTranslationService:
    """
    Simple translation service with predefined translations
    """
    
    def translate_captions(self, captions: List[Dict], source_lang: str, target_lang: str) -> List[Dict]:
        """
        Translate captions between languages
        """
        translated = []
        
        for caption in captions:
            text = caption['text']
            
            # Simple translation mapping
            if source_lang == 'en' and target_lang == 'ml':
                translated_text = self._translate_en_to_ml(text)
            elif source_lang == 'en' and target_lang == 'hi':
                translated_text = self._translate_en_to_hi(text)
            elif source_lang == 'ml' and target_lang == 'en':
                translated_text = self._translate_ml_to_en(text)
            else:
                translated_text = f"[{target_lang}] {text}"
            
            translated.append({
                **caption,
                'text': translated_text,
                'is_translated': True,
                'original_text': text
            })
        
        return translated
    
    def _translate_en_to_ml(self, text: str) -> str:
        """English to Malayalam"""
        translations = {
            'Welcome': 'സ്വാഗതം',
            'Watch': 'കാണുക',
            'Learn': 'പഠിക്കുക',
            'Video': 'വീഡിയോ',
            'More': 'കൂടുതൽ',
            'continues': 'തുടരുന്നു',
            'ending': 'അവസാനിക്കുന്നു'
        }
        
        for en, ml in translations.items():
            text = text.replace(en, ml)
        
        return text
    
    def _translate_en_to_hi(self, text: str) -> str:
        """English to Hindi"""
        translations = {
            'Welcome': 'स्वागत',
            'Watch': 'देखें',
            'Learn': 'सीखें',
            'Video': 'वीडियो',
            'More': 'अधिक',
            'continues': 'जारी है',
            'ending': 'समाप्त हो रहा है'
        }
        
        for en, hi in translations.items():
            text = text.replace(en, hi)
        
        return text
    
    def _translate_ml_to_en(self, text: str) -> str:
        """Malayalam to English"""
        translations = {
            'സ്വാഗതം': 'Welcome',
            'കാണുക': 'Watch',
            'പഠിക്കുക': 'Learn',
            'വീഡിയോ': 'Video',
            'കൂടുതൽ': 'More',
            'തുടരുന്നു': 'continues',
            'അവസാനിക്കുന്നു': 'ending'
        }
        
        for ml, en in translations.items():
            text = text.replace(ml, en)
        
        return text


class SimpleThumbnailService:
    """
    Simple thumbnail text suggestion service
    """
    
    def suggest_thumbnail_text(self, video_title: str, frame_analysis: Dict = None) -> str:
        """
        Suggest catchy text for thumbnail
        """
        # Take first 5 words or make it catchy
        words = video_title.split()[:5]
        
        if len(words) <= 2:
            return video_title.upper()
        
        # Make it catchy
        catchy_phrases = [
            f"{' '.join(words[:3])}!",
            f"Amazing {' '.join(words[:2])}",
            f"Learn {' '.join(words[:3])}",
            f"{' '.join(words[:4])} Now!"
        ]
        
        import random
        return random.choice(catchy_phrases)


# Convenience functions
def generate_captions_simple(text: str, duration: float, language: str = 'en') -> List[Dict]:
    """Generate captions without external API"""
    service = SimpleCaptionService()
    return service.generate_captions_from_text(text, duration, language)


def translate_captions_simple(captions: List[Dict], source_lang: str, target_lang: str) -> List[Dict]:
    """Translate captions without external API"""
    service = SimpleTranslationService()
    return service.translate_captions(captions, source_lang, target_lang)


def suggest_thumbnail_text_simple(video_title: str) -> str:
    """Suggest thumbnail text without external API"""
    service = SimpleThumbnailService()
    return service.suggest_thumbnail_text(video_title)
