# JD Technology

**Business technology, built around you.**

JD Technology is a mobile-first, modular business workspace. Its first module, **Lumo — Your meeting assistant**, captures spoken meeting actions, maintains a timestamped transcript, and turns a conversation into an editable, shareable action list.

## What is implemented

- Configuration-driven workspace with Lumo and five disabled future tools.
- Three-step first-run onboarding, animated orb states, touch-friendly meeting controls.
- Microphone permission handling and replaceable browser transcription service.
- Wake phrase detection, deterministic owner/task parsing and action review.
- Manual actions, due dates, editing, completion and deletion.
- Local meeting recovery, history, rename, transcript review and deletion.
- Action and meeting-summary clipboard exports, including native Android clipboard.
- Dark/light/system themes, reduced motion, animation intensity and privacy controls.
- Installable PWA with an offline shell; Capacitor Android project; GitHub Pages workflow.
- Automated tests for speech capture boundaries, detection, parsing, formatting and storage.

## Run locally

Install **Node.js 22 LTS** (including npm). In this folder:

```sh
npm install
npm run dev
```

Open the address Vite prints. `localhost` supports microphone APIs. An ordinary HTTP LAN address usually does not; use HTTPS or the deployed GitHub Pages site to test microphone access on a phone.

```sh
npm test
npm run build
npm run preview
```

`npm run build` type-checks TypeScript and creates `dist/`. Developer speech simulation controls appear only under `npm run dev` and are removed from production builds.

## Use Lumo

1. Open Lumo and complete onboarding.
2. Start a meeting. Choose whether to enable browser voice or work manually.
3. When enabling voice, review the privacy notice and grant microphone permission.
4. Say **“Lumo take this action, James needs to check the furnace loading.”**
5. Leave a short pause after your instruction. Lumo captures the action after about two seconds without a final speech event. Review and confirm the result.
6. Capture more actions or use **Add action**. View Transcript keeps the conversation out of the main interface.
7. End the meeting, review the summary, edit actions and copy them to another application.

Supported phrases: “Lumo take this action”, “Lumo take an action”, “Lumo action”, “Lumo note this action”, “Lumo take a note”. Punctuation and case are ignored. A standalone “Lumo” can open an instruction window. Common “Luma”/“Loomo” transcription variants are supported for phrases. Unknown owners are marked **Unassigned** for review. Dates are set manually; natural-language due-date interpretation is not implemented.

## Speech recognition and privacy

The default provider uses the browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with `en-GB`, continuous recognition and interim feedback. **This API is not an offline or guaranteed private transcription engine.** Chrome and other browsers may send microphone audio to their vendor's servers and require a network connection. Lumo explains this before enabling voice. There are no app-owned AI API calls or keys.

- Lumo stores meetings, actions, settings and optional transcripts in device-local storage. It never records or permanently stores raw audio.
- Data is scoped to the installed app or browser origin; the Android app and website do not share history.
- Clearing browser/site data or uninstalling the app removes local data. Copy important actions first. Local storage is not an encrypted database or backup system.
- Android automatic backup is disabled. Only internet and microphone permissions are declared. Microphone access is initiated when voice is enabled.
- Browser recognition can terminate unexpectedly; the provider attempts to reconnect and provides a manual fallback. Network and permission errors appear as readable messages.
- Recognition accuracy depends on browser support, accents, noise, connectivity and vendor limits. There is no speaker diarization, guaranteed full transcript, background listening or foreground service. Voice pauses when the page becomes hidden; tap **Enable voice** to resume after returning.
- **Android WebView frequently lacks Web Speech recognition.** The Capacitor app supports the full manual flow, but native voice is not guaranteed. For the initial voice milestone, use the HTTPS PWA in Chrome on your Android phone. A native transcription provider is the recommended next development step.
- Raw audio capture and transcript persistence are separate. No frontend secrets are needed. `.env.example` documents public build configuration; never put secrets in `VITE_` variables.
- Typography uses Google Fonts when online and local system fallbacks offline. No meeting data is sent to the font service.

Microphone denial: allow access in the browser site's microphone settings or Android Settings → Apps → JD Technology → Permissions, then use **Enable voice** again. Unsupported browsers retain manual capture. Permission is never requested at application startup.

## Recovery and storage

Every finalized transcript entry and action mutation saves immediately. An unfinished meeting reappears as **Resume meeting**. Resume preserves its original start time; elapsed time includes time spent away. Microphone access is restarted explicitly by opening the meeting and consenting to voice. Unfinalized speech can be lost if the process is killed. Storage failures show a banner and retain the current in-memory meeting so actions can still be copied.

`MeetingStorage` is the storage contract. `LocalMeetingStorage` implements versioned local-storage keys with validation. Replace it with IndexedDB or a native SQLite adapter for larger transcripts or managed-device deployment. The first release has no cloud sync, import/export archive or automatic retention policy. Keep transcripts appropriately short and delete old data when needed.

## GitHub Pages

The project is configured for [Jonnyd99-max/JDTECHNOLOGIES](https://github.com/Jonnyd99-max/JDTECHNOLOGIES).

1. Commit and push the project to the repository's `main` or `master` branch.
2. In GitHub, choose **Settings → Pages → Source → GitHub Actions**.
3. The workflow installs with `npm ci`, runs tests, builds and deploys `dist/`.
4. Once successful, open `https://jonnyd99-max.github.io/JDTECHNOLOGIES/` on your phone.
5. In Chrome, use **Add to Home screen / Install app** when offered.

The workflow derives `VITE_BASE_PATH` from the repository name. No edit is required if the repo is renamed. For a manual Pages build:

```powershell
$env:VITE_BASE_PATH = '/JDTECHNOLOGIES/'
npm run build
Remove-Item Env:VITE_BASE_PATH
```

Hash routing avoids Pages refresh/404 problems. The default relative base (`./`) is appropriate for Capacitor. Do not carry a Pages base-path override into an Android build.

The PWA precaches the application shell, JavaScript, styles and icons. Visit once online before expecting offline operation. Speech transcription itself is not cached. Updates are applied on a later app load after the service worker has installed; no mid-meeting forced reload is performed.

## Android Studio and APK/AAB

The native `android/` project is already generated. Install Android Studio and its Android SDK, and use its bundled **JDK 21** for Capacitor 7. The generated project compiles/targets SDK 35 and supports Android API 23+.

```sh
npm install
npm run android:sync
npm run android:open
```

`android:sync` builds the web application and copies assets/plugins into the native project. Run it after each web change. `android:add` is only for recreating a missing Android project; do not run it on the existing one.

In Android Studio:

1. Allow Gradle sync and install the SDK versions requested by the project.
2. Select an emulator or connect your Galaxy phone with developer options and USB debugging enabled.
3. Press **Run** to install a debug build.
4. To create an APK use **Build → Build Bundle(s) / APK(s) → Build APK(s)** (menu wording can vary).
5. For distribution use **Build → Generate Signed Bundle / APK**. Create your own signing key; keep it outside version control. Choose APK for direct installation or AAB for Play distribution.

Optional command line after configuring the SDK/JDK:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. APK compilation requires a local Android SDK/JDK and was not performed in the build environment. Signing, Play Store submission and device voice validation remain user/device steps.

## Architecture

```text
src/
  config/apps.config.ts       Tool metadata and workspace card registry
  components/                Shared orb, dialogs, action editor and action list
  features/jd-technology/     Platform landing page
  features/lumo/             Home, meeting, summary, history and settings screens
  hooks/useMeetingSession.ts Meeting orchestration and speech/action lifecycle
  models/                    Typed meeting, action, transcript and settings models
  services/audio/            Permissions, microphone and transcription interfaces
  services/lumo/             Wake detector, parser, capture buffer, suggestion contract
  services/clipboard.ts      Browser and native clipboard adapter
  storage/                   Persistent store context and replaceable storage contract
  theme/                     Responsive design tokens, orb animations and themes
  utils/                     Duration, date and share-text formatting
android/                     Generated native project and microphone manifest
.github/workflows/pages.yml Verified-build Pages deployment
```

To add a future module: create a feature folder, register its metadata in `apps.config.ts`, mark it active, and register its routes in `App.tsx`. Keep module-specific services and models independent of the shell. The workspace cards are automatically generated from the registry; inactive cards are not navigable.

To add a transcription engine: implement `TranscriptionProvider` and inject it where `BrowserTranscriptionProvider` is selected in `useMeetingSession`. The native interface can expose its network requirement. A native Capacitor speech plugin should request permission only on `startListening`, stream partial/final events through the same callbacks and stop all recording on teardown. For a cloud engine, use a server-side credential boundary and explicit consent; never embed API keys in the web bundle.

To improve extraction: implement `ActionParser`. `SuggestedActionProvider` is an intentionally disabled future interface for opt-in action suggestions from transcripts. No background AI analysis runs in version 1.

## Validation and next step

Automated tests cover wake phrases, real instruction examples, multi-event speech boundaries, durations, clipboard text, storage recovery and storage errors. The mobile flow is checked in the browser with simulated speech and manual actions. Real microphone accuracy and APK operation require tests on the actual phone.

Recommended next step: add an on-device/native Android speech recognition provider and test permission denial, pause/resume, screen locking and network interruption on the Galaxy S24 Ultra before relying on Lumo in business meetings.
