# Fetchly for Android (APK)

This guide is for people who do **not** want to install the Android toolchain on their own machine. Path 1 builds the APK on GitHub's servers. Path 2 is the local build, in case you change your mind.

## Read this first: what the Android app can do

- **YouTube only, single-file formats only.** The APK can download:
  - a video that YouTube serves as one file with audio inside (progressive MP4, usually 360p), or
  - audio only (M4A, OPUS, or MP3 after an in-app conversion).
  
  Higher resolutions need separate video and audio streams merged with ffmpeg. That only happens in the desktop app. Links from other sites are rejected on Android.
- **Playlists are not supported on Android.** A playlist link shows an error. Use the Windows or Linux app for playlists.
- **Saved files go to the app's private folder** (`/storage/emulated/0/Android/data/com.fetchly.app/files/Download`).
  - Android **deletes these files when you uninstall Fetchly**. Copy anything you want to keep somewhere else first.
  - Many file managers hide this folder. Open files from Fetchly's Library, or use a file manager that shows `Android/data`.
- **A custom save folder must be picked again after every restart.** Folder access from the picker lasts for one session only.

## Path 1: build the APK with GitHub Actions (nothing to install)

The workflow `.github/workflows/build.yml` has an `android` job. It runs on GitHub's Ubuntu machines and does all of this for you:

1. Installs JDK 17, the Android SDK (`android-actions/setup-android`), NDK 27.2.12479018 and the four Rust Android targets (`aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`).
2. Runs `bun install` and `bun run android:init --ci` (`tauri android init`).
3. Runs `bun run build:android --debug --ci`, which is `tauri android build --apk --debug`: a universal debug APK for all four ABIs.
4. Uploads it as a workflow artifact named **`fetchly-android-apk`**.

It does not download yt-dlp or ffmpeg: `tauri.android.conf.json` sets `"externalBin": []`, so the Android app ships no sidecars. The same workflow's `windows` and `linux` jobs build the desktop installers (see README.md).

What you need: a GitHub account and Git. You push the code yourself, because the build only runs on GitHub.

### Steps

1. Create an empty repository on GitHub (private is fine), for example `fetchly`.
2. Push the project. The workflow assumes the `fetchly` folder is the repository root:
   ```bash
   cd "C:/Users/Bazil Suhail/Documents/YT-VideoDowloader/fetchly"
   git add .
   git commit -m "Fetchly"
   git branch -M main
   git remote add origin https://github.com/<your-user>/fetchly.git
   git push -u origin main
   ```
   If your repository root is the parent folder instead, move `fetchly/.github` to the repository root and set `FETCHLY_DIR: fetchly` near the top of `build.yml`.
3. On GitHub, open the **Actions** tab. A push to `main` starts the `build` workflow. To start it by hand, choose **build**, then **Run workflow**.
4. When the `android` job finishes (about 15-25 minutes on the first run), open the run, scroll to **Artifacts**, and download **`fetchly-android-apk`**. It is a zip with the APK files inside.
5. Unzip it and copy the `.apk` to your phone. The CI build is one universal APK with code for all four ABIs (arm64 and 32-bit ARM phones, x86 and x86_64 emulators). Open it on the phone, and allow "Install unknown apps" for your file manager or browser when Android asks.

Notes:

- The APK is signed with a **debug key**. It installs directly, but you cannot publish it on Google Play. Each CI run may use a new debug key, so installing a newer build over an older one can fail with "App not installed". Uninstall the old one first, and remember that uninstalling deletes downloaded files.
- The same workflow also builds the Windows and Linux installers. The Android job does not depend on them. If you only want the APK, it is fine to ignore the other jobs or let them fail.
- The workflow has not run yet; its YAML was only parse-checked. The first real run is the one your push starts.
- Known limits of the desktop jobs (not the APK): the ffmpeg hashes in `scripts/binaries.lock.json` are not pinned yet. See README.md, "Push to GitHub and get the builds", step 5.
- Artifacts are kept for 90 days by default on GitHub.

## Path 2: build locally

You need about 10 GB of disk space for Android Studio, the SDK and the NDK.

### Install

1. **Android Studio**: https://developer.android.com/studio
2. In Android Studio, open **Settings > Languages & Frameworks > Android SDK**:
   - On **SDK Platforms**, install Android 14 (API 34).
   - On **SDK Tools**, install Android SDK Build-Tools, **NDK (Side by side)**, Android SDK Command-line Tools and Android SDK Platform-Tools.
3. **JDK 17.** Android Studio ships one in its `jbr` folder. Any JDK 17 works.
4. **Rust** 1.90 or newer (https://rustup.rs), plus the Android targets:
   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```
5. **Bun** 1.4 or newer: https://bun.sh

On Windows you also need the MSVC Rust toolchain and Visual Studio Build Tools, because Tauri's CLI and build scripts compile for the host. See README.md.

### Set environment variables

Windows (cmd). Open a new terminal afterwards:

```cmd
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
dir /b "%LOCALAPPDATA%\Android\Sdk\ndk"
setx NDK_HOME "%LOCALAPPDATA%\Android\Sdk\ndk\<version printed above>"
```

Linux:

```bash
export JAVA_HOME=/opt/android-studio/jbr
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)"
```

### Build

From the `fetchly` folder:

```bash
bun install
bun run typecheck
bun run android:init          # once; generates src-tauri/gen/android
bunx tauri android build --apk --debug --target aarch64
```

- The debug APK lands under `src-tauri/gen/android/app/build/outputs/apk/`.
- To install it on a phone connected over USB with USB debugging on, run `adb install -r <path to .apk>`.
- To run the app live on a phone or emulator while developing, use `bun run android:dev`.
- Other scripts:
  - `bun run build:android` builds a universal release APK for all four ABIs.
  - `bun run build:android:split` builds one release APK per ABI.
  - `bun run build:android:arm64` builds a release APK for 64-bit ARM only.

  Release APKs must be signed before Android will install them. See "Release signing" in BUILD.md.

## Troubleshooting

- **"Only YouTube links can be downloaded on this device"**: expected. Other sites need the desktop app.
- **"Playlists can be downloaded in the desktop app only"**: expected on Android.
- **"Can't save to ..."**: a custom folder from a previous session is out of scope. Pick it again in Settings, or clear it to use the default folder.
- **The first MP3 conversion is slow.** On first use the app downloads ffmpeg.wasm (about 30 MB) from jsDelivr, then converts on the phone's CPU.
