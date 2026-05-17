# AtherLearn

AtherLearn is an AI-powered accessible learning platform for classrooms.

Teachers can upload or create lesson material, generate learner-friendly versions with AI, and publish assignments. Students can log in, open their personalized dashboard, read accessible notes, use audio explanations, generate structured study notes, and export notes/source material as PDFs.

## What We Built

- Mobile-first Expo frontend for teachers and students.
- FastAPI microservice backend with API gateway, auth, school, lesson, assignment, AI, storage, sync, review, notification, and commons services.
- MongoDB-backed auth with signup/login, hashed passwords, JWT sessions, and refresh tokens.
- Student accessibility preferences: standard, low vision, dyslexia friendly, multilingual, slow learner, text size, and audio support.
- AI notes generation through backend `/api/student/lessons/{id}/ask`, with structured fallback notes for demo/local lessons.
- Text-to-speech audio lessons using `expo-speech`.
- Generated notes and uploaded source material open/download as PDF.
- Demo teacher/student flows for competition/demo use.

## Local Setup

### 1. Backend

```powershell
cd AetherLearnBackend
copy .env.example .env
docker compose -f infra/docker-compose.yml up -d --build
```

Check backend:

```powershell
Invoke-RestMethod http://localhost:8000/api/status
```

MongoDB runs in Docker and is exposed at:

```text
mongodb://localhost:27017
```

Main auth collection:

```text
aetherlearn_auth.users
```

### 2. Frontend

```powershell
cd AtherLearnFrontend
npm install
```

Set API URL in `AtherLearnFrontend/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_DEMO_MODE=true
```

If testing on a phone through Expo Go, replace `localhost` with your computer LAN IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:8000
```

Run frontend:

```powershell
npx expo start -c
```

For web:

```powershell
npx expo start --web
```

**Android native build** (`npm run android:dev` / `expo run:android`) requires the **Android SDK** and `adb`. If you see errors about `ANDROID_HOME` or `spawn adb ENOENT`, follow **`AtherLearnFrontend/README.md`** (install Android Studio, set `ANDROID_HOME`, install Platform Tools). For a quick device test without the SDK, use **Expo Go** and `npx expo start -c` instead.

## Useful Commands

Rebuild backend after backend code changes:

```powershell
cd AetherLearnBackend
docker compose -f infra/docker-compose.yml up -d --build
```

Rebuild only AI/API gateway after AI route changes:

```powershell
docker compose -f infra/docker-compose.yml up -d --build ai-service api-gateway
```

Frontend checks:

```powershell
cd AtherLearnFrontend
npm run typecheck
npx expo export --platform web
```

View Mongo users:

```powershell
docker exec -it infra-mongodb-1 mongosh
```

Then:

```js
use aetherlearn_auth
db.users.find({}, { _id: 0, name: 1, email: 1, role: 1, passwordHash: 1 }).pretty()
```

## Notes

- Passwords are never stored as plain text; Mongo stores `passwordHash`.
- Demo accounts are temporary and should be removed before public launch.
- For production mobile builds, move frontend auth storage to secure native storage.
