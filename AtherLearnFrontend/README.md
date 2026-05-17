# AtherLearn frontend (Expo)

## Prereqs

- Node.js and npm
- For **web**: nothing else
- For **Expo Go** on a device: [Expo Go](https://expo.dev/go) app; run `npx expo start` and scan the QR code
- For **`npm run android:dev`** (`expo run:android`): **Android SDK** + **JDK 17** (see below)

## Install

```bash
npm install
```

Copy env and set `EXPO_PUBLIC_API_BASE_URL` (see repo root `README.md`).

## Android native build (`expo run:android`)

`expo run:android` needs the **Android SDK**, **`adb`**, and **JDK 17+** for Gradle (not Java 11). If you see:

- `Failed to resolve the Android SDK path` … `Use ANDROID_HOME`
- `Error: spawn adb ENOENT`
- **`Android Gradle plugin requires Java 17`** / `You are currently using Java 11`

then fix SDK/`PATH` or point Gradle at a **Java 17** JDK (see below).

### 0. JDK 17 for Gradle (required)

The Android build uses whatever **`java`** Gradle sees (`JAVA_HOME` / `PATH`). **SDKMAN** often defaults to Java 11—switch for this project.

**Option A — SDKMAN (recommended if you use sdkman)**

```bash
sdk list java          # pick a 17.x distribution (e.g. temurin)
sdk install java 17.0.13-tem   # use the exact id from sdk list java
sdk use java 17.0.13-tem
java -version          # must show 17
cd AtherLearnFrontend
npm run android:dev
```

To auto-select when you `cd` into this app, add a **`.sdkmanrc`** in `AtherLearnFrontend` with the same identifier (see [sdkman env](https://sdkman.io/usage#env)).

**Option B — Android Studio’s bundled JBR (macOS, default install)**

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
java -version
cd AtherLearnFrontend
npm run android:dev
```

Add `export JAVA_HOME=...` to `~/.zshrc` if you want it permanent.

**Option C — One command without changing your default JDK**

```bash
JAVA_HOME="$HOME/.sdkman/candidates/java/17.0.13-tem" PATH="$JAVA_HOME/bin:$PATH" npm run android:dev
```

(Replace `17.0.13-tem` with the folder name under `~/.sdkman/candidates/java/` after `sdk install java 17…`.)

You can also set **`org.gradle.java.home`** in `android/gradle.properties` to a fixed JDK 17 path; prefer **`JAVA_HOME`** so the repo stays machine-agnostic.

### 1. Install Android Studio

Download from [developer.android.com/studio](https://developer.android.com/studio) and complete the setup wizard.

### 2. Install SDK components

In Android Studio: **Settings → Languages & Frameworks → Android SDK** (macOS: **Android Studio → Settings**).

- Note **Android SDK Location** (default on Mac: `~/Library/Android/sdk`).
- Under **SDK Platforms**, install at least one recent API (e.g. **API 35** or **34**).
- Under **SDK Tools**, ensure **Android SDK Build-Tools**, **Android SDK Platform-Tools**, and **Android Emulator** are installed.

### 3. Point your shell at the SDK (zsh)

Add to `~/.zshrc` (adjust the path if your SDK location differs):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

Then run:

```bash
source ~/.zshrc
adb version
```

You should see `Android Debug Bridge version …`.

**Gradle “SDK location not found”:** if the build still says `Define a valid SDK location` / `local.properties`, either export **`ANDROID_HOME`** in the same terminal (see above) or create **`android/local.properties`** with one line (use your real SDK path from Android Studio):

```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

See **`android/local.properties.example`**. Create **`android/local.properties`** locally (it is gitignored); set `sdk.dir` to match **Android Studio → Android SDK location** if it is not the default `~/Library/Android/sdk`.

### 4. Run the app again

**Physical phone (USB):** plug in the phone, unlock it, then:

```bash
cd AtherLearnFrontend
adb devices
```

You should see a line like `XXXXXXXX    device`. If it says `unauthorized`, accept **“Allow USB debugging?”** on the phone. If the list is empty, try another USB cable (data-capable), another port, or **Revoke USB debugging authorizations** (Developer options) and reconnect.

Then:

```bash
npm run android:dev -- --device
```

**Emulator:** open **Android Studio → Device Manager**, create/start a virtual device, wait until it is fully booted, then run:

```bash
npm run android:dev
```

(`--device` is only for choosing among **already visible** `adb` targets; it does not create an emulator.)

If you see **`No Android connected device found, and no emulators could be started automatically`**, `adb devices` showed nothing usable—fix USB debugging or start an emulator first.

Use **`http://10.0.2.2:8000`** in `.env` for the API when using an **emulator**; use your **Mac LAN IP** for a **physical phone** (see root `README.md`).

### Alternative: Expo Go (no Android SDK)

If you only need to try the app on a phone without a native build:

```bash
npx expo start -c
```

Open in **Expo Go** via QR code. Set `EXPO_PUBLIC_API_BASE_URL` to your computer’s LAN IP so the phone can reach the backend.

## Seeded Gemma E2B for team testing

The Android native Gemma bridge can import a predownloaded `gemma-4-e2b-it` model from a fixed seed path so testers do not need to redownload it from Hugging Face on every device.

### Expected file

Use this exact filename:

```text
gemma-4-E2B-it.litertlm
```

### Fixed seed location on device

Place the file in the app-specific external files directory under:

```text
/sdcard/Android/data/com.kakshavaani.atherlearn/files/aether-gemma-seeds/gemma-4-E2B-it.litertlm
```

The Settings screen also shows the resolved seed path reported by the native bridge.

### Recommended tester flow

1. Build and install the Android development client.
2. Push the predownloaded model file to the fixed seed path.
3. Open **Settings → On-device Models**.
4. In the **Gemma 4 E2B** row, tap **Import seeded model**.
5. Wait for the model to show as **Installed**.

### `adb push` example

Run this from your machine, replacing the local source path with wherever you stored the downloaded model:

```bash
adb push /absolute/path/to/gemma-4-E2B-it.litertlm /sdcard/Android/data/com.kakshavaani.atherlearn/files/aether-gemma-seeds/gemma-4-E2B-it.litertlm
```

After import, the app copies the model into its internal `filesDir/aether-gemma-models` location and local generation can use it without any network download.
