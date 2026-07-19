# BPMN Android

An Android app for **viewing, editing, and simulating BPMN 2.0 diagrams** on
your phone, built on the [bpmn-js](https://github.com/bpmn-io/bpmn-js) engine
inside a native WebView shell via [Capacitor](https://capacitorjs.com/).

It grew out of the
[Obsidian BPMN plugin](https://github.com/kimchaily/obsidian-bpmn-plugin) and
reuses the same modeler configuration — properties panel, color picker,
create/append-anything, token simulation, minimap, and grid.

## Features

- **View** `.bpmn` files with pinch-to-zoom, drag-to-pan, and a fit button.
- **Edit** diagrams with the full bpmn-js modeler palette and context pad.
- **Simulate** process flow with the token-simulation module.
- **Pan / Edit modes** (🖐 toggle): in pan mode a one-finger drag always moves
  the view, so you never nudge an element by accident while navigating; switch
  to edit mode to drag elements around. Tapping selects in either mode.
- **Light / dark / system theme** (🖥 toggle), remembered between launches —
  including a genuinely dark diagram canvas (default element colors switch to a
  light-on-dark palette; any custom element colors are preserved).
- **Properties panel** to edit element properties (⚙︎ toggle).
- **Open** `.bpmn`/`.xml` files via the native document picker.
- **Save / share** the diagram back out (`.bpmn`) via the Android share sheet.
- **Export** the diagram as **SVG**.
- **Autosave**: the working diagram is restored on next launch.

Touch: tap to select / open the context pad / use the palette, one-finger drag
to pan (or move elements in edit mode), two-finger pinch to zoom, and the
floating **＋ / −** / **⤢ Fit** buttons for precise control.

## Architecture

```
.
├── .github/workflows/
│   ├── build-android.yml   # CI: builds the debug APK, uploads it as an artifact
│   └── release.yml         # CI: builds a signed release APK, publishes a Release
├── assets/                 # App icon + splash source images (@capacitor/assets)
├── index.html              # App shell + toolbar
├── src/
│   ├── main.js             # Boot, toolbar wiring, pinch-zoom, theme, mode, autosave
│   ├── modeler.js          # bpmn-js Modeler + feature modules
│   ├── touch.js            # Touch → pan / move bridge
│   ├── theme.js            # Light / dark / system theme
│   ├── files.js            # Native / web file open + save + share
│   ├── diagram.js          # Default empty diagram
│   └── style.css           # Mobile UI
├── capacitor.config.json
└── vite.config.js
```

The web app is built with Vite into `dist/`, which Capacitor copies into the
native Android WebView assets.

The native `android/` project is **generated** (not committed) from
`capacitor.config.json` with `npx cap add android`. There are no hand-edited
native files, so it is reproducible on every build — regenerate it locally or
let CI do it. Once you customize native code (app icon, permissions, signing),
commit the `android/` folder and drop it from `.gitignore`.

## Continuous integration

`.github/workflows/build-android.yml` builds a debug APK on every push/PR to
`main` (and on manual dispatch): it installs deps, builds the web bundle,
regenerates the Android project, applies the app icon, and runs
`./gradlew assembleDebug` on a GitHub-hosted runner (Android SDK preinstalled).
The APK is published as the **`bpmn-android-debug`** workflow artifact — download
it from the run's summary page and install it on your phone.

For a **signed release** APK published as a GitHub Release, see
[RELEASING.md](RELEASING.md): add the signing secrets once, then push a `v*`
tag and `.github/workflows/release.yml` does the rest.

## App icon

The launcher icon and splash are generated from the source images in `assets/`
by [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) during
CI. To regenerate locally after `npx cap add android`:

```bash
npx @capacitor/assets@3 generate --android
```

## Develop in the browser

Fast iteration without a device — and the quickest way to try it on a phone,
since it's a WebView app:

```bash
npm install
npm run dev        # open the printed Local URL, or the Network URL on your phone
```

In the browser, file open uses a normal file dialog and save triggers a
download (the native picker/share only exist on device).

## Build & run on Android locally

Requires the **Android SDK** (via [Android Studio](https://developer.android.com/studio),
with `ANDROID_HOME` set) and **JDK 17**. SDK levels: `minSdk 22`,
`compileSdk 34`, `targetSdk 34`.

```bash
npm install
npm run build            # bundle the web app into dist/
npx cap add android      # generate the native project (first time)
npx cap sync android     # copy dist/ + plugins into it (subsequent runs)
npx cap open android     # open in Android Studio → Run ▶ on a device/emulator
```

### Build an APK from the command line

```bash
npm run apk:debug        # build web + (add|sync) android + assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk

adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

For a release build, configure signing (Android Studio's *Generate Signed
Bundle / APK*, or `android/app/build.gradle`) and run `./gradlew assembleRelease`.

## Notes

- **App id:** `io.github.kimchaily.bpmnmobile` (change in
  `capacitor.config.json`, then re-run `npx cap sync android`).
- Native plugins: `@capacitor/filesystem`, `@capacitor/share`,
  `@capawesome/capacitor-file-picker`.
