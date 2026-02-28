
import os
import sys
import time
import requests
from urllib.request import urlopen

# Simple manual environment loading
def load_env(env_path):
    env_vars = {}
    try:
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    except FileNotFoundError:
        return {}
    return env_vars

# Try loading from backend/.env
env = load_env('.env')
API_KEY = env.get('ASSEMBLYAI_API_KEY')

if not API_KEY:
    # Try loading from parent/.env
    env = load_env('../.env')
    API_KEY = env.get('ASSEMBLYAI_API_KEY')

# If still not found, try Django settings (last resort)
if not API_KEY:
    try:
        sys.path.append(os.getcwd())
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        import django
        django.setup()
        from django.conf import settings
        API_KEY = getattr(settings, 'ASSEMBLYAI_API_KEY', None)
    except Exception as e:
        print(f"Warning: Django setup failed: {e}")

print(f"API Key: {API_KEY[:5]}...{API_KEY[-4:] if API_KEY else ''}")

if not API_KEY or API_KEY == 'your_assemblyai_api_key_here':
    print("Error: Invalid or missing API Key. Check .env file.")
    sys.exit(1)

HEADERS = {"authorization": API_KEY}
BASE_URL = "https://api.assemblyai.com/v2"

# 1. Download/Create Sample Audio
dummy_audio = "test_audio.mp3"
if not os.path.exists(dummy_audio):
    print("Downloading sample audio file...")
    url = "https://github.com/AssemblyAI-Examples/audio-examples/raw/main/20230607_me_canadian_wildfires.mp3"
    try:
        with open(dummy_audio, "wb") as f:
            f.write(urlopen(url).read())
        print("Sample audio downloaded.")
    except Exception as e:
        print(f"Failed to download sample audio: {e}")
        # Create a tiny silent mp3 if download fails (not ideal but works for upload test)
        with open(dummy_audio, "wb") as f:
            f.write(b'\x00' * 1024) 
        print("Created dummy silent audio file.")

# 2. Upload
print(f"Uploading {dummy_audio} to AssemblyAI...")
try:
    with open(dummy_audio, "rb") as f:
        res = requests.post(f"{BASE_URL}/upload", headers=HEADERS, data=f)
    
    if res.status_code != 200:
        print(f"Upload Failed: {res.status_code} {res.text}")
        sys.exit(1)
        
    upload_url = res.json()["upload_url"]
    print(f"Upload Successful: {upload_url}")
except Exception as e:
    print(f"Upload Exception: {e}")
    sys.exit(1)

# 3. Transcribe
print("Requesting transcription (Auto-detect)...")
json_data = {
    "audio_url": upload_url,
    "language_detection": True, # Mimic Auto-detect
    # "language_code": "en", # DISABLED
    "punctuate": True,
    "format_text": True,
    # "webhook_url": None, # DISABLED
}

try:
    res = requests.post(f"{BASE_URL}/transcript", json=json_data, headers=HEADERS)
    if res.status_code != 200:
        print(f"Transcription Request Failed: {res.status_code} {res.text}")
        sys.exit(1)

    job_id = res.json()["id"]
    print(f"Job ID: {job_id}")

    # 4. Poll
    print("Polling for results...")
    max_retries = 30
    for i in range(max_retries):
        status_res = requests.get(f"{BASE_URL}/transcript/{job_id}", headers=HEADERS)
        if status_res.status_code != 200:
             print(f"Poll Request Failed: {status_res.text}")
             break
             
        status_data = status_res.json()
        status = status_data["status"]
        
        if status == "completed":
            print("\nTranscription COMPLETED Successfully!")
            print(f"Language Detected: {status_data.get('language_code')}")
            print(f"Confidence: {status_data.get('confidence')}")
            print(f"Text Preview: {status_data.get('text')[:100]}...")
            break
        elif status == "error":
            print(f"\nTranscription FAILED: {status_data.get('error')}")
            break
        else:
            print(f"Status: {status}...", end="\r")
            time.sleep(3)
    else:
        print("\nTimed out polling for results.")

except Exception as e:
    print(f"Transcription Exception: {e}")

print("\nTest Finished.")
