# AtherLearn Deployment Guide

This guide documents the hackathon deployment path for AtherLearn.

The first submission target is intentionally backend-free: judges should be able
to open the web demo or install the Android APK without needing the FastAPI
backend to be running. The app will use seeded demo data, local browser storage,
and local Gemma where available. After that works publicly, connect both builds
to the hosted backend.

## Phase 1: Backend-Free Demo

Phase 1 produces two public submission links:

- **Web live demo URL:** Cloudflare Pages deployment of the Expo web export.
- **Android APK URL:** GitHub Release containing the EAS `preview` APK.

For Phase 1, do not set `EXPO_PUBLIC_API_BASE_URL` in the deployed frontend or
APK build. The app defaults to `http://localhost:8000`; public judges will not
have that backend, so API calls fail safely into seeded/local demo behavior.

Keep this env value enabled for clarity:

```env
EXPO_PUBLIC_DEMO_MODE=true
```

Before deploying either artifact:

```bash
cd AtherLearnFrontend
npm ci
npm run typecheck
npx expo export -p web
```

The export command should create `AtherLearnFrontend/dist`.

## Deploy Web Demo To Cloudflare Pages

Cloudflare Pages is the primary free host for the hackathon web demo.

1. Push the repo to a public GitHub repository.
2. In Cloudflare Pages, create a new project from that repository.
3. Configure the build:

```text
Framework preset: None
Root directory: AtherLearnFrontend
Build command: npx expo export -p web
Output directory: dist
```

4. Add the Phase 1 environment variable:

```env
EXPO_PUBLIC_DEMO_MODE=true
```

5. Leave this variable unset in Phase 1:

```env
EXPO_PUBLIC_API_BASE_URL
```

6. Deploy and save the Pages URL for Kaggle:

```text
Cloudflare Pages live demo URL: https://<your-project>.pages.dev
```

### Web Demo Behavior

The web demo should open instantly with seeded/local classroom data. Judges can
then optionally test local Gemma in the browser:

1. Open the web demo in a current Chrome or Edge browser.
2. Go to **Settings**.
3. Confirm the app shows **WebGPU ready**.
4. Initialize **Gemma 4 E2B** first. It is the recommended judge path.
5. Optionally initialize **Gemma 4 E4B** on stronger machines.
6. Run the browser-local test prompt or use the normal teacher/student flows.

Browser-local Gemma uses MediaPipe LLM Inference Web and WebGPU. The first run
downloads the web model file from Hugging Face:

- Gemma 4 E2B web task: about 2 GB.
- Gemma 4 E4B web task: about 2.96 GB.

After initialization, inference runs locally in the browser tab, not on the
backend. If WebGPU is unavailable, the app should still be usable through
seeded demo data.

## Build And Share Android APK

The Android APK is the mobile proof of work. It should be shared as a GitHub
Release asset so Kaggle judges have a durable public download link.

1. Install and log in to EAS CLI if needed:

```bash
npm install --global eas-cli
eas login
```

2. Build the preview APK from the frontend directory:

```bash
cd AtherLearnFrontend
eas build -p android --profile preview
```

The existing `AtherLearnFrontend/eas.json` preview profile is already configured
for internal Android APK distribution:

```json
{
  "preview": {
    "distribution": "internal",
    "android": {
      "buildType": "apk"
    }
  }
}
```

3. Download the APK from the EAS build page.
4. Create a GitHub Release, for example `v1-hackathon-demo`.
5. Attach the APK to the release.
6. Save the release asset URL for Kaggle:

```text
GitHub Release APK URL: https://github.com/<owner>/<repo>/releases/tag/v1-hackathon-demo
```

### APK Demo Behavior

For Phase 1, the APK should work without the backend:

- Demo login and seeded/local classroom data remain available.
- Offline/local storage keeps generated local artifacts on device.
- Remote backend calls may fail, then fall back to demo/local behavior.

Android local Gemma requires the real APK or development client, not Expo Go.
The native Gemma bridge can run only after the model is available on the device:

- Download Gemma 4 E2B or E4B from Settings, or
- Seed Gemma 4 E2B with `adb push` and import it from Settings.

Seeded E2B path:

```text
/sdcard/Android/data/com.kakshavaani.atherlearn/files/aether-gemma-seeds/gemma-4-E2B-it.litertlm
```

Example:

```bash
adb push /absolute/path/to/gemma-4-E2B-it.litertlm /sdcard/Android/data/com.kakshavaani.atherlearn/files/aether-gemma-seeds/gemma-4-E2B-it.litertlm
```

Device requirements:

- Android 12 or newer.
- Gemma 4 E2B: about 8 GB RAM and 3.3 GB free storage.
- Gemma 4 E4B: about 12 GB RAM and 4.7 GB free storage.

## Local Gemma 4 Behavior

AtherLearn has two local Gemma paths:

| Target | Runtime | Model files | First-run requirement |
| --- | --- | --- | --- |
| Web demo | MediaPipe LLM Inference Web / WebGPU | `gemma-4-E2B-it-web.task`, `gemma-4-E4B-it-web.task` | Chrome or Edge with WebGPU, then model download |
| Android APK | Native LiteRT-LM bridge | `gemma-4-E2B-it.litertlm`, `gemma-4-E4B-it.litertlm` | Android APK/dev client, then model download or seed import |

Use this wording in the Kaggle writeup:

> The web demo provides a no-install walkthrough with optional browser-local
> Gemma 4 via WebGPU. The Android APK demonstrates the mobile on-device Gemma
> path through the native LiteRT-LM bridge.

## Judge Testing Checklist

Prepare these before submitting the Kaggle writeup:

- Public code repository URL.
- Cloudflare Pages live demo URL.
- GitHub Release APK URL.
- YouTube video URL.
- Cover image and media gallery assets.

Recommended judge flow:

1. Open the Cloudflare Pages URL.
2. Use demo teacher login.
3. Review seeded classroom and lesson data.
4. Go to Settings and check WebGPU status.
5. Initialize Gemma 4 E2B if the browser supports WebGPU.
6. Generate or test local notes.
7. Download/install the APK if they want the full mobile/on-device path.

## Phase 2: Connect Hosted Backend

After Phase 1 works publicly, deploy the backend and point both frontend builds
at the hosted API Gateway.

Backend requirements:

- Expose only the API Gateway publicly.
- Keep internal services, MongoDB, Redis, NATS, and object storage private.
- Configure production secrets:
  - `INTERNAL_SERVICE_SECRET`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `GEMINI_API_KEY`, only if hosted Gemini is enabled
- Add the Cloudflare Pages URL to backend `CORS_ORIGINS`.

Frontend env for Phase 2:

```env
EXPO_PUBLIC_DEMO_MODE=true
EXPO_PUBLIC_API_BASE_URL=https://<api-gateway-domain>
```

Redeploy web:

```bash
cd AtherLearnFrontend
npm ci
npm run typecheck
npx expo export -p web
```

Then trigger a new Cloudflare Pages deployment with
`EXPO_PUBLIC_API_BASE_URL` set.

Rebuild APK:

```bash
cd AtherLearnFrontend
eas build -p android --profile preview
```

Create a new GitHub Release and attach the new APK. Update the Kaggle project
links if the release URL changed.

## Troubleshooting

### Web build cannot resolve `.wasm`

The frontend includes `metro.config.js` so Expo web can bundle WASM assets such
as `expo-sqlite` and MediaPipe. If this error returns, verify the file exists
and includes `wasm` in `config.resolver.assetExts`.

### Web demo says WebGPU unavailable

Use a current Chrome or Edge browser with hardware acceleration enabled. Safari,
Firefox, older browsers, managed school laptops, or disabled GPU acceleration may
not expose WebGPU.

### Browser Gemma initialization is slow

This is expected on first run because the browser downloads a multi-GB model
from Hugging Face. E2B is the recommended default for judges.

### APK opens but local Gemma is unavailable

Check that:

- The APK was built with EAS or `expo run:android`, not opened in Expo Go.
- The device runs Android 12 or newer.
- The model is downloaded or imported from the seeded path.
- The device has enough RAM and storage.

### App cannot reach backend in Phase 1

That is expected. Phase 1 is designed to work without the backend through
seeded/local behavior. Backend connection happens in Phase 2.

## References

- Expo web export: https://docs.expo.dev/distribution/publishing-websites/
- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Expo internal APK distribution: https://docs.expo.dev/build/internal-distribution/
- Cloudflare Pages: https://developers.cloudflare.com/pages/
- MediaPipe LLM Inference Web: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/web_js
