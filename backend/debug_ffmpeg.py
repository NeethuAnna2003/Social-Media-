
import os
import sys
import subprocess
from pathlib import Path

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    import django
    django.setup()
    from videos.models import Video
    from django.conf import settings
except Exception as e:
    print(f"Django setup failed: {e}")
    sys.exit(1)

print("="*60)
print("DEBUG: AUDIO EXTRACTION TEST")
print("="*60)

# 1. Get Last Video
try:
    video = Video.objects.last()
    if not video:
        print("No videos found in database.")
        sys.exit(1)
    
    video_path = video.video_file.path
    print(f"Video ID: {video.id}")
    print(f"Title: {video.title}")
    print(f"Path: {video_path}")
    
    if not os.path.exists(video_path):
        print("ERROR: Video file does not exist at path!")
        sys.exit(1)
    print("SUCCESS: Video file exists.")
    
except Exception as e:
    print(f"Error fetching video: {e}")
    sys.exit(1)

# 2. Prepare Temp Path
temp_dir = Path(settings.TEMP_AUDIO_DIR)
temp_dir.mkdir(parents=True, exist_ok=True)
audio_path = temp_dir / f"debug_audio_{video.id}.mp3"
print(f"Target Audio Path: {audio_path}")

# 3. Run FFmpeg
cmd = [
    'ffmpeg',
    '-i', video_path,
    '-vn',          # No video
    '-acodec', 'libmp3lame', # MP3
    '-ar', '16000', # 16kHz
    '-ac', '1',     # Mono
    '-b:a', '64k',  # 64k bitrate
    '-y',           # Overwrite
    str(audio_path)
]

print(f"Running command: {' '.join(cmd)}")

try:
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=300
    )
    
    if result.returncode == 0:
        print("SUCCESS: FFmpeg executed successfully.")
        if os.path.exists(audio_path):
            size = os.path.getsize(audio_path)
            print(f"SUCCESS: Output file created. Size: {size} bytes")
            # Clean up
            # os.remove(audio_path) 
        else:
            print("ERROR: FFmpeg succeeded but output file missing!")
    else:
        print("ERROR: FFmpeg failed!")
        print(f"Stderr: {result.stderr}")

except Exception as e:
    print(f"Exception running FFmpeg: {e}")

print("="*60)
