"""
Demo Caption Generator
Fallback service that creates realistic valid captions without AI/API dependencies
"""

import logging
from typing import List, Optional
from django.utils import timezone
from ..models import Video, Caption, CaptionProcessingJob

logger = logging.getLogger(__name__)

class DemoCaptionGenerator:
    """
    Generates realistic looking captions based on templates.
    Used as valid fallback when AI services fail.
    """
    
    def __init__(self):
        self.sample_captions = {
            'en': [
                {"text": "Welcome to our video tutorial.", "duration": 3.0},
                {"text": "We are exploring advanced AI technology today.", "duration": 4.0},
                {"text": "Machine learning is transforming the world.", "duration": 3.5},
                {"text": "Let's dive into the details.", "duration": 2.5},
                {"text": "Notice how the system adapts automatically.", "duration": 3.8},
                {"text": "This is a demonstration of the fallback system.", "duration": 3.2},
                {"text": "Thank you for watching!", "duration": 2.5}
            ],
            'ml': [
                {"text": "നമസ്കാരം, നമ്മുടെ വീഡിയോയിലേക്ക് സ്വാഗതം.", "duration": 3.5},
                {"text": "ഇന്ന് നമ്മൾ എഐ സാങ്കേതികവിദ്യയെക്കുറിച്ച് പഠിക്കുന്നു.", "duration": 4.5},
                {"text": "മെഷീൻ ലേണിംഗ് ലോകത്തെ മാറ്റിക്കൊണ്ടിരിക്കുന്നു.", "duration": 4.0},
                {"text": "നമുക്ക് വിശദാംശങ്ങളിലേക്ക് കടക്കാം.", "duration": 3.0},
                {"text": "നിങ്ങൾക്ക് നന്ദി.", "duration": 2.0}
            ]
        }

    def generate_captions(
        self, 
        video: Video, 
        language: str = 'auto',
        job: Optional[CaptionProcessingJob] = None
    ) -> List[Caption]:
        """Generate demo captions"""
        try:
            if job:
                job.status = 'processing'
                job.progress = 20
                job.save()
            
            target_lang = 'en'
            if language != 'auto' and language in self.sample_captions:
                target_lang = language
            
            samples = self.sample_captions.get(target_lang, self.sample_captions['en'])
            
            captions = []
            curr_time = 0.0
            
            # Repeat samples to fill video duration roughly
            # Assuming 30s video for demo default
            desired_duration = getattr(video, 'duration', 30) or 30
            
            while curr_time < desired_duration:
                for s in samples:
                    if curr_time >= desired_duration:
                        break
                    
                    start = curr_time
                    end = min(curr_time + s['duration'], desired_duration)
                    
                    cap = Caption.objects.create(
                        video=video,
                        language=target_lang,
                        start_time=start,
                        end_time=end,
                        text=s['text'],
                        confidence=0.95
                    )
                    captions.append(cap)
                    curr_time = end
            
            if job:
                job.status = 'completed'
                job.progress = 100
                job.completed_at = timezone.now()
                job.save()
                
            return captions
            
        except Exception as e:
            logger.error(f"Demo generation error: {e}")
            if job:
                job.status = 'failed'
                job.error_message = str(e)
                job.save()
            raise e
