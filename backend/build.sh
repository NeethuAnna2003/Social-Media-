#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit  # Exit on error

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running database migrations..."
python manage.py migrate

echo "Creating superuser if not exists..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='Admin').exists():
    User.objects.create_superuser('Admin', 'admin@gmail.com', 'admin')
    print('Superuser created: Admin / admin')
else:
    print('Superuser already exists.')
"

echo "Build complete!"
