"""
Image Location Detection Service

Uses Google Gemini Vision API to detect landmarks and locations from images.
Provides accurate, AI-powered location detection.
"""
import hashlib
import json
from typing import Dict
from django.core.files.uploadedfile import UploadedFile
from django.db.models.fields.files import FieldFile
from django.conf import settings
import google.generativeai as genai


class ImageLocationService:
    """
    Service for detecting locations from images using AI vision.
    Uses Google Gemini Vision API for accurate landmark and location detection.
    """
    
    def __init__(self):
        """Initialize the service with API credentials."""
        self.api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            print("Warning: GEMINI_API_KEY not found. Location detection will not work.")
    
    def _calculate_image_hash(self, image_file) -> str:
        """
        Calculate SHA-256 hash of image file for caching.
        
        Args:
            image_file: Django FieldFile, UploadedFile, or file path
            
        Returns:
            Hex string of SHA-256 hash
        """
        sha256_hash = hashlib.sha256()
        
        try:
            if isinstance(image_file, (FieldFile, UploadedFile)):
                # It's a Django file object
                image_file.seek(0)
                for chunk in image_file.chunks():
                    sha256_hash.update(chunk)
                image_file.seek(0)
            elif hasattr(image_file, 'read'):
                # It's a file-like object
                image_file.seek(0)
                for chunk in iter(lambda: image_file.read(4096), b""):
                    sha256_hash.update(chunk)
                image_file.seek(0)
            else:
                # It's a file path
                with open(str(image_file), 'rb') as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        sha256_hash.update(chunk)
            
            return sha256_hash.hexdigest()
        except Exception as e:
            print(f"Error calculating hash: {e}")
            return hashlib.sha256(str(image_file).encode()).hexdigest()
    
    def _read_image_bytes(self, image_file) -> bytes:
        """
        Read image file as bytes.
        
        Args:
            image_file: Django FieldFile, UploadedFile, or file path
            
        Returns:
            Image bytes
        """
        try:
            if isinstance(image_file, (FieldFile, UploadedFile)):
                image_file.seek(0)
                return image_file.read()
            elif hasattr(image_file, 'read'):
                image_file.seek(0)
                return image_file.read()
            else:
                with open(str(image_file), 'rb') as f:
                    return f.read()
        except Exception as e:
            print(f"Error reading image: {e}")
            return b""
    
    def detect_location(self, image_file) -> Dict:
        """
        Detect location from image using AI vision.
        
        Args:
            image_file: Image file to analyze
            
        Returns:
            Dictionary with location data
        """
        if not self.model:
            return self._empty_result("Gemini API key not configured")
        
        try:
            # Read image bytes
            image_bytes = self._read_image_bytes(image_file)
            if not image_bytes:
                return self._empty_result("Failed to read image")
            
            # Create the prompt for location detection
            prompt = """You are an expert at identifying landmarks and locations from images. Analyze this image VERY CAREFULLY and identify the location with HIGH ACCURACY.

CRITICAL INSTRUCTIONS:
1. Look at the ACTUAL structure in the image - its shape, design, materials
2. The Eiffel Tower has a distinctive iron lattice structure and is in Paris, France
3. The Taj Mahal is a white marble mausoleum with domes and is in Agra, India
4. Big Ben is a clock tower in London, UK
5. Statue of Liberty is a green copper statue in New York, USA
6. DO NOT confuse these landmarks - they look completely different!

Please provide the following information in JSON format:
{
    "landmark": "Exact name of the landmark if you can clearly identify it (null if you cannot identify with high confidence)",
    "city": "City name (null if cannot determine with confidence)",
    "country": "Country name (null if cannot determine with confidence)",
    "landmark_confidence": 0.0-1.0 (how confident you are about the landmark - be VERY conservative),
    "city_confidence": 0.0-1.0 (how confident you are about the city),
    "country_confidence": 0.0-1.0 (how confident you are about the country),
    "reasoning": "Detailed explanation of what you see and how you identified it - describe the actual visual features"
}

IMPORTANT RULES:
- Only provide a landmark name if you are ABSOLUTELY CERTAIN (>90% confidence)
- If you're not sure, set landmark to null and confidence to 0.0
- Describe what you actually SEE in the image in your reasoning
- Do NOT guess or make assumptions
- The Eiffel Tower is an iron lattice tower - if you see that, it's in Paris, France
- The Taj Mahal is white marble with domes - if you see that, it's in Agra, India

Return ONLY the JSON object, no additional text."""

            # Upload image and generate content
            from PIL import Image
            import io
            
            # Convert bytes to PIL Image
            pil_image = Image.open(io.BytesIO(image_bytes))
            
            # Generate content with image
            response = self.model.generate_content([prompt, pil_image])
            
            # Parse the response
            response_text = response.text.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            
            # Parse JSON
            location_data = json.loads(response_text)
            
            # Format and return
            return self._format_location_data(location_data)
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response text: {response_text}")
            return self._empty_result(f"Failed to parse AI response: {e}")
        except Exception as e:
            print(f"Location detection error: {e}")
            import traceback
            traceback.print_exc()
            return self._empty_result(str(e))
    
    def _format_location_data(self, data: Dict) -> Dict:
        """
        Format location data for storage.
        
        Args:
            data: Raw location data from AI
            
        Returns:
            Formatted location data
        """
        landmark = data.get('landmark')
        city = data.get('city')
        country = data.get('country')
        
        landmark_conf = float(data.get('landmark_confidence', 0.0))
        city_conf = float(data.get('city_confidence', 0.0))
        country_conf = float(data.get('country_confidence', 0.0))
        
        # Determine best location to display (70% confidence threshold)
        if landmark and landmark_conf >= 0.70:
            display_location = f"📍 {landmark}, {country}" if country else f"📍 {landmark}"
            overall_confidence = landmark_conf
        elif city and city_conf >= 0.70:
            display_location = f"📍 {city}, {country}" if country else f"📍 {city}"
            overall_confidence = city_conf
        elif country and country_conf >= 0.70:
            display_location = f"📍 {country}"
            overall_confidence = country_conf
        else:
            display_location = None
            overall_confidence = 0.0
        
        return {
            'landmark': landmark,
            'city': city,
            'country': country,
            'landmark_confidence': landmark_conf,
            'city_confidence': city_conf,
            'country_confidence': country_conf,
            'detected_location': display_location,
            'overall_confidence': overall_confidence,
            'reasoning': data.get('reasoning', '')
        }
    
    def _empty_result(self, error: str = None) -> Dict:
        """
        Return empty result structure.
        
        Args:
            error: Error message
            
        Returns:
            Empty location data
        """
        return {
            'landmark': None,
            'city': None,
            'country': None,
            'landmark_confidence': 0.0,
            'city_confidence': 0.0,
            'country_confidence': 0.0,
            'detected_location': None,
            'overall_confidence': 0.0,
            'error': error
        }
    
    def get_or_detect_location(self, image_file) -> Dict:
        """
        Get cached location or detect new one.
        
        Args:
            image_file: Image file to analyze
            
        Returns:
            Location data dictionary
        """
        from .location_models import ImageLocationCache
        
        # Calculate hash
        image_hash = self._calculate_image_hash(image_file)
        
        # Check cache
        try:
            cached = ImageLocationCache.objects.get(image_hash=image_hash)
            return {
                'landmark': cached.landmark,
                'city': cached.city,
                'country': cached.country,
                'landmark_confidence': cached.landmark_confidence,
                'city_confidence': cached.city_confidence,
                'country_confidence': cached.country_confidence,
                'detected_location': cached.detected_location,
                'overall_confidence': cached.overall_confidence,
                'from_cache': True
            }
        except ImageLocationCache.DoesNotExist:
            pass
        
        # Detect new location
        location_data = self.detect_location(image_file)
        
        # Cache the result (even if detection failed)
        try:
            ImageLocationCache.objects.create(
                image_hash=image_hash,
                landmark=location_data.get('landmark'),
                city=location_data.get('city'),
                country=location_data.get('country'),
                landmark_confidence=location_data.get('landmark_confidence', 0.0),
                city_confidence=location_data.get('city_confidence', 0.0),
                country_confidence=location_data.get('country_confidence', 0.0),
                detected_location=location_data.get('detected_location'),
                overall_confidence=location_data.get('overall_confidence', 0.0)
            )
        except Exception as e:
            print(f"Error caching location: {e}")
        
        location_data['from_cache'] = False
        return location_data
