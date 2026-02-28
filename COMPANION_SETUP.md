# Persistent Animated AI Avatar Companion Setup

## Overview
This feature adds a floating 3D avatar assistant to your Connectify AI platform. It proactively engages users based on their activity and allows them to generate a stylized 3D avatar from their profile picture.

## Prerequisites
- **HuggingFace API Key**: Required for Image Generation. Add `HUGGINGFACE_API_KEY` to your `.env` file.
- **Redis**: Required for caching (already configured in settings).

## Backend Setup
1. **Migrations**:
   The `accounts` app has been updated with a new `avatar_3d` field.
   ```bash
   python manage.py makemigrations accounts
   python manage.py migrate accounts
   ```
   *(These have been run automatically)*

2. **API Endpoints**:
   - `GET /api/avatar/insights/`: Returns current mood, message, and avatar URL.
   - `POST /api/avatar/generate/`: Triggers AI generation of the avatar.

## Frontend Setup
1. **Components**:
   - `AvatarWidget.jsx`: Main controller.
   - `AvatarAnimator.jsx`: Visual representation.
   - `AvatarBubble.jsx`: Speech bubble.

2. **Integration**:
   - Integrated into `AppRouter.jsx` inside `PrivateRoute` to persist across pages.
   - Added "Generate Avatar" button to `Profile.jsx`.

## How to Test
1. **Login** to the application.
2. Go to your **Profile** page.
3. Click the **"✨ Generate Avatar"** button.
   - *Note: If no API key is present, it will fallback to a fun default avatar service.*
   - If configured, it will take ~20-30s to generate a Pixar-style 3D avatar.
4. Once generated, the avatar will appear in the bottom-right corner of the screen.
5. **Interactions**:
   - **Click** the avatar to toggle the speech bubble.
   - **Click** the volume icon to mute/unmute voice.
   - The avatar will automatically change moods (Happy, Warning, Sleeping) based on your activity (Likes, Posts, etc.).

## Troubleshooting
- **No Avatar Image?**: Ensure you have uploaded a profile picture before clicking Generate.
- **Voice not working?**: Check if your browser supports `SpeechSynthesis` and that the volume is unmuted.
