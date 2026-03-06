# Connectify AI Free Deployment Guide

This guide deploys your full stack with free tiers:
- Frontend: Vercel (free)
- Backend (Django ASGI + websockets): Koyeb (free)
- Database: MySQL (your existing MySQL or a free-tier MySQL provider)
- Redis (channels/celery): Upstash Redis (free)
- Optional media storage: Cloudinary free tier

## 1) Prepare Backend

Run locally once to ensure dependencies are in sync:

```powershell
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
```

## 2) Create Free Managed Services

### MySQL
1. Prepare a remotely reachable MySQL database.
2. Collect host/user/password/database/port.
3. If your provider requires SSL, enable SSL at provider level and use the provider-recommended connection settings.

### Upstash Redis
1. Create a free Redis database.
2. Copy TLS Redis URL (`rediss://...`).
3. Use this for `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`.

## 3) Deploy Backend on Koyeb

1. Push repo to GitHub.
2. In Koyeb, create a new Web Service from GitHub repo.
3. Service settings:
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Run command: `daphne -b 0.0.0.0 -p $PORT config.asgi:application`

4. Add environment variables from `backend/.env.example`:
- `DEBUG=False`
- `SECRET_KEY=<strong-random-value>`
- `DB_ENGINE=django.db.backends.mysql`
- `DB_NAME=<your-db-name>`
- `DB_USER=<your-db-user>`
- `DB_PASSWORD=<your-db-password>`
- `DB_HOST=<your-db-host>`
- `DB_PORT=3306`
- `REDIS_URL=<Upstash TLS URL>`
- `CELERY_BROKER_URL=<Upstash TLS URL>`
- `CELERY_RESULT_BACKEND=<Upstash TLS URL>`
- `ALLOWED_HOSTS=<your-koyeb-domain>,localhost,127.0.0.1`
- `CSRF_TRUSTED_ORIGINS=https://<your-koyeb-domain>,https://<your-vercel-domain>`
- `CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>,http://localhost:5173`
- `FRONTEND_URL=https://<your-vercel-domain>`

5. Deploy. Then open shell/logs and run:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

6. Verify health endpoint:
- `https://<your-koyeb-domain>/api/health/`

## 4) Deploy Frontend on Vercel

1. Import repo in Vercel.
2. Set Root Directory to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables:
- `VITE_API_BASE_URL=https://<your-koyeb-domain>`
- `VITE_WS_BASE_URL=wss://<your-koyeb-domain>`
- `VITE_NEWS_API_KEY=<optional>`
- `VITE_WEATHER_API_KEY=<optional>`

6. Deploy.

## 5) Post-Deploy Checks

1. Login and signup flow works.
2. Password reset emails use frontend domain.
3. API calls go to Koyeb backend.
4. Notifications/chat websockets connect on `wss://...`.
5. Uploads and media paths resolve.
6. Data persists in your MySQL database after service restarts.

## 6) Important Free-Tier Notes

1. Free services may sleep on inactivity.
2. Heavy local AI workloads (Whisper/Torch) may be too resource-heavy for free web instances.
3. Prefer external APIs (AssemblyAI/Gemini/HuggingFace/Replicate) in production for AI tasks.
4. If Celery workers are required separately, deploy a second free worker service on Koyeb with run command:

```bash
celery -A config worker --loglevel=info
```

5. Optional beat scheduler service command:

```bash
celery -A config beat --loglevel=info
```

## 7) Local Dev Compatibility

- Keep frontend `VITE_API_BASE_URL` empty for local proxy mode.
- Keep backend `.env` with `DEBUG=True` and local DB/Redis values for development.
