# Start AtherLearn

## Backend

This starts MongoDB and all backend services through Docker.

```bash
cd AetherLearnBackend
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d --build
```

Seed demo data only when you intentionally want to reset the demo database:

```bash
uv run python scripts/seed.py
```

Check backend:

```bash
curl http://localhost:8000/api/status
```

## Frontend

This starts the Expo app against the local backend.

Create `AtherLearnFrontend/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_DEMO_MODE=true
```

Run:

```bash
cd AtherLearnFrontend
npm install
npx expo start -c
```

For web:

```bash
npx expo start --web
```

## Android Simulator

This builds and runs the native Android app on an Android emulator.

Requirements:

- Android Studio with Android SDK, Platform Tools, and Android Emulator installed.
- JDK 17+. Android Studio's bundled Java works on macOS.
- A booted emulator from Android Studio Device Manager.

Use this API URL for Android emulator networking:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
EXPO_PUBLIC_DEMO_MODE=true
```

If needed on macOS, use Android Studio's Java:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

Run Android:

```bash
cd AtherLearnFrontend
npm run android:dev
```

## Test

These commands type-check the frontend and run backend lint/contract tests.

```bash
cd AtherLearnFrontend
npm run typecheck
```

```bash
cd AetherLearnBackend
uv run ruff check .
uv run pytest tests/unit/test_contracts.py
```
