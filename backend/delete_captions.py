# Delete old fake captions
from videos.models import Caption
from videos.services.local_whisper_service import WHISPER_AVAILABLE

print("=" * 60)
print("Whisper Available:", WHISPER_AVAILABLE)
print("=" * 60)

old_count = Caption.objects.count()
if old_count > 0:
    Caption.objects.all().delete()
    print(f"✓ Deleted {old_count} old fake captions")
else:
    print("✓ No old captions")

if WHISPER_AVAILABLE:
    print("\n✓ Whisper is READY! Generate new captions now!")
else:
    print("\n✗ Whisper NOT loaded! Restart Django server!")

print("=" * 60)
