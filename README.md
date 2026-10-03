# JD Technology

**Business technology, built around you.**

JD Technology is a mobile-first, modular business workspace. Its first module, **Lumo — Your meeting assistant**, captures spoken meeting actions, maintains a timestamped transcript, and turns a conversation into an editable, shareable action list.

## What is implemented

- Configuration-driven workspace with Lumo and five disabled future tools.
- Three-step first-run onboarding, animated orb states, touch-friendly meeting controls.
- Microphone permission handling and replaceable browser/native Android transcription services.
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
2. Start a meeting. Choose whether to enable voice or work manually.
3. When enabling voice, review the privacy notice and grant microphone permission.
4. Say **“Take this action, James needs to check the furnace loading.”**
5. Leave a short pause after your instruction. Lumo captures the action after about two seconds without a final speech event. Review and confirm the result.
6. Capture more actions or use **Add action**. View Transcript keeps the conversation out of the main interface.
7. End the meeting, review the summary, edit actions and copy them to another application.

The trigger is **“take this action”**, followed by the owner and task. Case, extra spaces and commas are ignored. The phrase also works when recognition splits it across consecutive final transcript events. Saying “Lumo” alone no longer starts capture. Unknown owners are marked **Unassigned** for review. Dates are set manually; natural-language due-date interpretation is not implemented.

## Speech recognition and privacy

The website uses the browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with `en-GB`, continuous recognition and interim feedback. **This API is not an offline or guaranteed private transcription engine.** Chrome and other browsers may send microphone audio to their vendor's servers and require a network connection. Lumo explains this before enabling voice. There are no app-owned AI API calls or keys.

The meeting screen shows **Heard** text as recognition results arrive. A device microphone indicator alone does not confirm transcription. Browser voice waits for recognition's start event, releases its separate microphone permission probe, and reports startup/network failures with a retry option. If no words appear, keep the app visible, check connectivity and Chrome microphone permission, then pause and enable voice again. Say “Take this action, Olivia needs to get ready for bed” and pause. Saying only “take this action” opens capture and waits for the instruction. Installed web apps may retain an older version: close the app and all site tabs, then reopen. Future updates show an **Update app** button outside active meetings.

The Android APK uses the app's `LumoSpeech` Capacitor plugin backed by Android `SpeechRecognizer`, independently of WebView speech support. It selects Android's on-device recognizer on Android 12+ when available; otherwise it uses the installed system speech service with an offline preference. The fallback service can ignore that preference and process audio remotely, so consent explains both cases. Recognition uses English (UK); an installed language model may be required. On-device service availability does not guarantee that its English model is installed. Lumo does not silently switch from an on-device recognition error to a cloud provider.

- Lumo stores meetings, actions, settings and optional transcripts in device-local storage. It never records or permanently stores raw audio.
- Data is scoped to the installed app or browser origin; the Android app and website do not share history.
- Clearing browser/site data or uninstalling the app removes local data. Copy important actions first. Local storage is not an encrypted database or backup system.
- Android automatic backup is disabled. Only internet and microphone permissions are declared. Microphone access is initiated when voice is enabled.
- Browser recognition can terminate unexpectedly; the provider attempts to reconnect and provides a manual fallback. Network and permission errors appear as readable messages.
- Recognition accuracy depends on browser support, accents, noise, connectivity and vendor limits. There is no speaker diarization, guaranteed full transcript, background listening or foreground service. Voice pauses when the page becomes hidden; tap **Enable voice** to resume after returning.
- Android voice is handled natively, bypassing WebView speech limitations. The plugin requests permission only when starting, forwards partial/final results, restarts between utterances, limits repeated error retries, and releases the microphone on stop/background/destroy. Android speech engines can introduce small gaps and audible cues between utterances; this is a foreground meeting assistant, not a guaranteed continuous audio recorder. Voice accuracy and lifecycle still require testing on the phone.
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

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Signing, Play Store submission and device voice validation remain user/device steps.

### Download a test APK without Android Studio

GitHub Actions includes **Build Android APK**. It runs for application changes pushed to `main`, and can also be started using **Actions → Build Android APK → Run workflow**. A successful run contains a **jd-technology-debug-apk** artifact, retained for 14 days. Download and unzip it to obtain `app-debug.apk`, then transfer it to your phone and install it. Android may ask you to allow installation from your browser/file manager.

This is a debug build for personal testing, not a signed production release. Hosted runners generate a debug signing key per build; a later APK may require uninstalling the older debug app, which deletes its local meetings. Copy actions before uninstalling. A stable release signing key is needed before distributing updateable production APKs.

## Architecture

```text
src/
  config/apps.config.ts       Tool metadata and workspace card registry
  components/                Shared orb, dialogs, action editor and action list
  features/jd-technology/     Platform landing page
  features/lumo/             Home, meeting, summary, history and settings screens
  hooks/useMeetingSession.ts Meeting orchestration and speech/action lifecycle
  models/                    Typed meeting, action, transcript and settings models
  services/audio/            Permissions, browser/native providers and transcription interfaces
  services/lumo/             Wake detector, parser, capture buffer, suggestion contract
  services/clipboard.ts      Browser and native clipboard adapter
  storage/                   Persistent store context and replaceable storage contract
  theme/                     Responsive design tokens, orb animations and themes
  utils/                     Duration, date and share-text formatting
android/                     Native project, LumoSpeech plugin and microphone manifest
.github/workflows/pages.yml Verified-build Pages deployment
.github/workflows/android.yml Android compile and downloadable debug APK
```

To add a future module: create a feature folder, register its metadata in `apps.config.ts`, mark it active, and register its routes in `App.tsx`. Keep module-specific services and models independent of the shell. The workspace cards are automatically generated from the registry; inactive cards are not navigable.

To add a transcription engine: implement `TranscriptionProvider` and select it in `createTranscriptionProvider.ts`. Native providers set `managesMicrophone` so the meeting hook does not start simultaneous web capture. `AndroidTranscriptionProvider` bridges `LumoSpeechPlugin.java`, registered before bridge initialization in `MainActivity.java`. Its listener/session guards prevent late results from modifying a stopped meeting. For a cloud engine, use a server-side credential boundary and explicit consent; never embed API keys in the web bundle.

To improve extraction: implement `ActionParser`. `SuggestedActionProvider` is an intentionally disabled future interface for opt-in action suggestions from transcripts. No background AI analysis runs in version 1.

## Validation and next step

Automated tests cover wake phrases, real instruction examples, multi-event speech boundaries, durations, clipboard text, storage recovery, storage errors and native provider cancellation/listener cleanup. The mobile flow is checked in the browser with simulated speech and manual actions. GitHub Actions compiles the Android project; real microphone accuracy and APK operation require tests on the actual phone.

Recommended next step: install the APK on the Galaxy S24 Ultra and test permission denial, multiple spoken actions, pause/resume, screen locking and offline language support before relying on Lumo in business meetings. Then add persistent release signing and a device-tested release build workflow.
