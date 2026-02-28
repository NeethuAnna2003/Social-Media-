import os
import requests
import time
import io
import base64
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image

class AvatarGenerationService:
    def __init__(self):
        # Pollinations.ai is free and needs no key!
        # Use image.pollinations.ai which returns actual image bytes, not HTML
        self.base_url = "https://image.pollinations.ai/prompt/"
        
    def analyze_profile_photo(self, image_path):
        """
        Analyze profile photo to extract features for personalized avatar generation.
        Returns a dict with detected features.
        """
        try:
            from PIL import Image
            import io
            
            # Open and analyze the image
            img = Image.open(image_path)
            
            # Basic analysis - we'll extract dominant colors and make educated guesses
            # For a production system, you'd use face detection APIs, but this works for free
            
            # Get image dimensions and dominant colors
            img_small = img.resize((50, 50))
            pixels = list(img_small.getdata())
            
            # Calculate average RGB to determine skin tone
            avg_r = sum(p[0] for p in pixels if len(p) >= 3) / len(pixels)
            avg_g = sum(p[1] for p in pixels if len(p) >= 3) / len(pixels)
            avg_b = sum(p[2] for p in pixels if len(p) >= 3) / len(pixels)
            
            # Determine skin tone category
            if avg_r > 200 and avg_g > 180:
                skin_tone = "fair skin"
            elif avg_r > 160 and avg_g > 120:
                skin_tone = "light skin"
            elif avg_r > 120 and avg_g > 90:
                skin_tone = "medium skin"
            elif avg_r > 90 and avg_g > 70:
                skin_tone = "tan skin"
            else:
                skin_tone = "dark skin"
            
            # Determine hair color from darker pixels
            dark_pixels = [p for p in pixels if sum(p[:3]) < 300]
            if dark_pixels:
                avg_dark_r = sum(p[0] for p in dark_pixels) / len(dark_pixels)
                avg_dark_b = sum(p[2] for p in dark_pixels) / len(dark_pixels)
                
                if avg_dark_r < 50 and avg_dark_b < 50:
                    hair_color = "black hair"
                elif avg_dark_r < 80:
                    hair_color = "dark brown hair"
                elif avg_dark_r < 120:
                    hair_color = "brown hair"
                elif avg_dark_r > 150:
                    hair_color = "blonde hair"
                else:
                    hair_color = "brown hair"
            else:
                hair_color = "brown hair"
            
            return {
                "skin_tone": skin_tone,
                "hair_color": hair_color
            }
            
        except Exception as e:
            print(f"Photo analysis failed: {e}, using defaults")
            return {
                "skin_tone": "medium skin",
                "hair_color": "brown hair"
            }
    
    def generate_avatar(self, user_profile):
        """
        Generates a personalized 3D avatar URL based on user's profile photo.
        Returns the Pollinations.ai URL directly (no file download needed).
        """
        try:
            print(f"Generating personalized avatar URL for {user_profile.user.username}...")
            
            # Analyze profile photo if available
            features = {"skin_tone": "medium skin", "hair_color": "brown hair"}
            
            if user_profile.profile_pic:
                try:
                    photo_path = user_profile.profile_pic.path
                    features = self.analyze_profile_photo(photo_path)
                    print(f"Detected features: {features}")
                except Exception as e:
                    print(f"Could not analyze photo: {e}")
            
            # Get gender if available
            gender_term = "person"
            if hasattr(user_profile, 'gender') and user_profile.gender:
                if user_profile.gender.lower() in ['male', 'man', 'm']:
                    gender_term = "young man"
                elif user_profile.gender.lower() in ['female', 'woman', 'f']:
                    gender_term = "young woman"
            
            # Create personalized prompt based on detected features
            prompt = (
                f"Full body 3D Disney Pixar character, {gender_term}, "
                f"{features['skin_tone']}, {features['hair_color']}, "
                "friendly smiling face, standing pose, trendy casual clothes, "
                "soft studio lighting, transparent background, no background, high detail, 8k render, unreal engine 5"
            )
            
            print(f"Generated prompt: {prompt}")
            
            # Use user ID as seed for consistency - same user always gets same style
            seed = user_profile.user.id * 12345  # Deterministic seed
            
            encoded_prompt = requests.utils.quote(prompt)
            # Return the Pollinations URL directly - no download needed!
            avatar_url = f"{self.base_url}{encoded_prompt}?width=512&height=768&seed={seed}&model=flux&nologo=true"
            
            print(f"SUCCESS: Avatar URL generated: {avatar_url}")
            
            # Return the external URL directly
            return {
                "success": True, 
                "url": avatar_url,
                "is_external": True  # Flag to indicate this is an external URL
            }

        except Exception as e:
            error_msg = f"Generation Service Error: {e}"
            print(error_msg)
            return {"error": str(e)}
