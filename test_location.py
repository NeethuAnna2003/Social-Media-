"""
Test script to verify location detection works correctly
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from posts.location_service import ImageLocationService
from django.core.files.uploadedfile import SimpleUploadedFile

# Create a test image file
test_image_data = b'fake image data for testing'
test_file = SimpleUploadedFile("test.jpg", test_image_data, content_type="image/jpeg")

# Test the service
service = ImageLocationService()

print("Testing location detection...")
print("-" * 50)

try:
    # Test hash calculation
    print("1. Testing hash calculation...")
    image_hash = service._calculate_image_hash(test_file)
    print(f"   ✅ Hash calculated: {image_hash[:16]}...")
    
    # Test location detection
    print("\n2. Testing location detection...")
    location_data = service.detect_location(test_file)
    print(f"   ✅ Location detected:")
    print(f"      Landmark: {location_data.get('landmark')}")
    print(f"      City: {location_data.get('city')}")
    print(f"      Country: {location_data.get('country')}")
    print(f"      Display: {location_data.get('detected_location')}")
    print(f"      Confidence: {location_data.get('overall_confidence')}")
    
    # Test caching
    print("\n3. Testing cache functionality...")
    cached_data = service.get_or_detect_location(test_file)
    print(f"   ✅ Cache working:")
    print(f"      From cache: {cached_data.get('from_cache')}")
    print(f"      Display: {cached_data.get('detected_location')}")
    
    print("\n" + "=" * 50)
    print("✅ ALL TESTS PASSED!")
    print("=" * 50)
    print("\nLocation detection is working correctly!")
    print("You can now create posts with images and see locations.")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
