import requests

try:
    url = 'http://localhost:8000/media/avatars/3d/avatar_poll_2_1768305743.png'
    r = requests.get(url)
    print(f'Status: {r.status_code}')
    print(f'Content-Type: {r.headers.get("Content-Type")}')
    print(f'Size: {len(r.content)} bytes')
    if r.status_code == 200:
        print('✓ Image is accessible')
    else:
        print('✗ Image failed to load')
except Exception as e:
    print(f'Error: {e}')
