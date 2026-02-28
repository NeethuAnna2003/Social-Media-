import requests

url = 'http://localhost:8000/media/avatars/3d/avatar_poll_14_1768306378.png'
try:
    r = requests.get(url)
    print(f'Status: {r.status_code}')
    if r.status_code == 200:
        print(f'Content-Type: {r.headers.get("Content-Type")}')
        print(f'Size: {len(r.content)} bytes')
        print('SUCCESS: Image is accessible from backend')
    else:
        print(f'ERROR: {r.status_code}')
        print(f'Response: {r.text[:500]}')
except Exception as e:
    print(f'ERROR: {e}')
