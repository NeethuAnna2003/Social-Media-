"""
Test Script for Unified Caption Service
Run this to verify the refactoring was successful
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from videos.services import UnifiedCaptionService, WHISPER_AVAILABLE
from videos.models import Video

def test_imports():
    """Test that all imports work correctly"""
    print("=" * 60)
    print("TEST 1: Import Verification")
    print("=" * 60)
    
    try:
        from videos.services import (
            UnifiedCaptionService,
            LocalWhisperService,
            AssemblyAICaptionService,
            DemoCaptionGenerator,
            WHISPER_AVAILABLE
        )
        print("✅ All imports successful")
        print(f"   - UnifiedCaptionService: {UnifiedCaptionService}")
        print(f"   - LocalWhisperService: {LocalWhisperService}")
        print(f"   - AssemblyAICaptionService: {AssemblyAICaptionService}")
        print(f"   - DemoCaptionGenerator: {DemoCaptionGenerator}")
        print(f"   - WHISPER_AVAILABLE: {WHISPER_AVAILABLE}")
        return True
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False

def test_whisper_availability():
    """Test Whisper installation status"""
    print("\n" + "=" * 60)
    print("TEST 2: Whisper Availability")
    print("=" * 60)
    
    if WHISPER_AVAILABLE:
        print("✅ Whisper is installed and available")
        print("   Strategy 1 (LocalWhisperService) will be used")
    else:
        print("⚠️  Whisper is NOT installed")
        print("   Will fallback to Strategy 2 (AssemblyAI) or Strategy 3 (Demo)")
        print("   To install: pip install openai-whisper")
    
    return True

def test_service_instantiation():
    """Test that services can be instantiated"""
    print("\n" + "=" * 60)
    print("TEST 3: Service Instantiation")
    print("=" * 60)
    
    try:
        service = UnifiedCaptionService()
        print("✅ UnifiedCaptionService instantiated successfully")
        print(f"   - Whisper Service: {service.whisper_service}")
        print(f"   - Assembly Service: {service.assembly_service}")
        print(f"   - Demo Service: {service.demo_service}")
        return True
    except Exception as e:
        print(f"❌ Service instantiation failed: {e}")
        return False

def test_demo_generation():
    """Test demo caption generation (no dependencies)"""
    print("\n" + "=" * 60)
    print("TEST 4: Demo Caption Generation")
    print("=" * 60)
    
    try:
        from videos.services import DemoCaptionGenerator
        from videos.models import Video
        
        # Get or create a test video
        video = Video.objects.first()
        if not video:
            print("⚠️  No videos in database, skipping test")
            return True
        
        demo_service = DemoCaptionGenerator()
        captions = demo_service.generate_captions(video, 'en')
        
        print(f"✅ Demo generation successful")
        print(f"   - Generated {len(captions)} captions")
        print(f"   - First caption: '{captions[0].text[:50]}...'")
        
        # Cleanup test captions
        for cap in captions:
            cap.delete()
        
        return True
    except Exception as e:
        print(f"❌ Demo generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_unified_service():
    """Test the unified service end-to-end"""
    print("\n" + "=" * 60)
    print("TEST 5: Unified Service End-to-End")
    print("=" * 60)
    
    try:
        video = Video.objects.first()
        if not video:
            print("⚠️  No videos in database, skipping test")
            return True
        
        service = UnifiedCaptionService()
        print(f"   Testing with video: {video.title}")
        
        # This should automatically try all strategies and succeed with at least Demo
        captions = service.generate_captions(video, 'en')
        
        print(f"✅ Unified service successful")
        print(f"   - Generated {len(captions)} captions")
        print(f"   - Language: {captions[0].language if captions else 'N/A'}")
        print(f"   - First caption: '{captions[0].text[:50]}...' if captions else 'N/A'")
        
        # Cleanup
        for cap in captions:
            cap.delete()
        
        return True
    except Exception as e:
        print(f"❌ Unified service failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_old_imports_removed():
    """Verify old imports are no longer available"""
    print("\n" + "=" * 60)
    print("TEST 6: Old Imports Removed")
    print("=" * 60)
    
    old_imports = [
        'videos.whisper_caption_generator',
        'videos.working_caption_generator',
        'videos.free_caption_generator',
    ]
    
    all_removed = True
    for module_name in old_imports:
        try:
            __import__(module_name)
            print(f"⚠️  {module_name} still exists (should be removed)")
            all_removed = False
        except ImportError:
            print(f"✅ {module_name} successfully removed")
    
    return all_removed

def run_all_tests():
    """Run all tests and report results"""
    print("\n" + "=" * 60)
    print("UNIFIED CAPTION SERVICE - TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Import Verification", test_imports),
        ("Whisper Availability", test_whisper_availability),
        ("Service Instantiation", test_service_instantiation),
        ("Demo Generation", test_demo_generation),
        ("Unified Service E2E", test_unified_service),
        ("Old Imports Removed", test_old_imports_removed),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Refactoring successful!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review.")
    
    return passed == total

if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
