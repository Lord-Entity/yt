# Keepsake

Keepsake is a video and audio downloader for Windows, Linux and Android, built from one codebase with Tauri v2, React, TypeScript and Tailwind CSS v4.

Paste a link, preview it, pick a format (video quality, audio format and bitrate, or thumbnail), and download it. Finished downloads appear in a Library, and Settings holds the save folder, parallel downloads, cookies and other options.

How it works:

- All extraction, download and conversion logic is TypeScript in `src/engine`. The Rust code in `src-tauri` only registers plugins, shows the window and launches yt-dlp.
- **Windows and Linux:** YouTube info comes from youtubei.js, with yt-dlp `-J` as a fallback. Other sites go through yt-dlp. Every download runs through the bundled yt-dlp, with ffmpeg for merging and conversion.
- **Android:** YouTube only, through youtubei.js. Downloads are single files, with no merging. See [README-ANDROID.md](README-ANDROID.md).

Full build details, capability rules and design decisions are in [BUILD.md](BUILD.md).

## What to install first

### Windows

1. **Visual Studio Build Tools** with the "Desktop development with C++" workload. This provides the MSVC linker and the Windows SDK. Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. **Rust** 1.90 or newer (https://rustup.rs). Tauri wants the sidecars in `src-tauri/binaries` named for the triple `rustc --print host-tuple` prints.
3. **Sidecar binaries.** They are not in the repo (ffmpeg is about 136 MB, over GitHub's 100 MB limit). Download them once:
   ```cmd
   powershell -ExecutionPolicy Bypass -File scripts\fetch-binaries.ps1
   ```
   This writes `yt-dlp`, `ffmpeg` and `ffprobe` as `*-x86_64-pc-windows-msvc.exe`, the names CI uses.
4. **Local-only fix for the GNU toolchain.** If `bun run dev` fails with "resource path `binaries\yt-dlp-x86_64-pc-windows-gnu.exe` doesn't exist", your default toolchain is `stable-x86_64-pc-windows-gnu`. Leave the rustup default as it is and copy the binaries to the gnu names (cmd, from the `fetchly` folder):
   ```cmd
   copy /Y "src-tauri\binaries\yt-dlp-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\yt-dlp-x86_64-pc-windows-gnu.exe"
   copy /Y "src-tauri\binaries\ffmpeg-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\ffmpeg-x86_64-pc-windows-gnu.exe"
   copy /Y "src-tauri\binaries\ffprobe-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\ffprobe-x86_64-pc-windows-gnu.exe"
   ```
   This step is for your machine only. The copies are git-ignored, and CI uses the MSVC toolchain with the `-msvc` names.
5. **WebView2.** Windows 10 and 11 already include it.
6. **Bun** 1.4 or newer: https://bun.sh
7. **Node.js 22 or later** on `PATH`. yt-dlp is started with `--js-runtimes node` and uses Node to solve YouTube's JavaScript challenges, so users of the installed app need Node too. Deno is not used.

### Linux (Debian/Ubuntu)

1. **Rust** 1.90 or newer (https://rustup.rs).
2. **WebKitGTK 4.1** and the other Tauri build packages:
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```
3. **Bun** 1.4 or newer: https://bun.sh
4. **Node.js 22 or later** on `PATH`, for yt-dlp's JavaScript challenges, the same as on Windows.
5. **Linux sidecars.** No binaries are in the repo. Fetch them once (CI runs the same script); it needs curl, tar with xz, sha256sum and python3:
   ```bash
   bash scripts/fetch-binaries.sh
   ```

Linux packages must be built on Linux. They cannot be built from Windows.

## Build

### Windows (cmd)

```cmd
cd "C:\Users\Bazil Suhail\Documents\YT-VideoDowloader\fetchly"
bun install
bun run typecheck
bun run lint
cd src-tauri && cargo test && cd ..
bun run dev
bun run build:windows
```

`bun run dev` starts the app in development mode. `bun run build:windows` builds the installers:

- `src-tauri\target\release\bundle\nsis\*.exe`
- `src-tauri\target\release\bundle\msi\*.msi`

The NSIS installer installs for the current user, so it needs no admin rights.

### Linux

```bash
bun install
bun run typecheck && bun run lint
(cd src-tauri && cargo test)
bun run dev
bun run build:linux
```

Output goes to `src-tauri/target/release/bundle/{deb,rpm,appimage}/`.

### Android

See [README-ANDROID.md](README-ANDROID.md). You can build the APK in GitHub Actions without installing the Android toolchain.

### CI

`.github/workflows/build.yml` runs on every push to `main`, on pull requests, on `v*` tags, and when started by hand. It has three jobs:

| Job | Runner | Builds | Artifact names |
|---|---|---|---|
| `windows` | `windows-latest` (MSVC Rust) | `bun run build:windows` | `keepsake-windows-nsis` (`.exe`), `keepsake-windows-msi` (`.msi`) |
| `linux` | `ubuntu-22.04` | `bun run build:linux` | `keepsake-linux-deb`, `keepsake-linux-rpm`, `keepsake-linux-appimage` |
| `android` | `ubuntu-latest` (JDK 17, SDK, NDK) | `bun run android:init`, then `bun run build:android --debug` | `keepsake-android-apk` |

The desktop jobs first run `scripts/fetch-binaries.ps1` / `scripts/fetch-binaries.sh`, which download yt-dlp 2026.08.19 and the BtbN ffmpeg/ffprobe (LGPL build) into `src-tauri/binaries` and check SHA-256 against `scripts/binaries.lock.json`. The Android job skips this, because Android ships no sidecars.

### Push to GitHub and get the builds

1. Create an empty repository on GitHub (private is fine).
2. Push the `fetchly` folder as the repository root (the binaries stay out; `.gitignore` excludes `src-tauri/binaries/*`):
   ```bash
   cd "C:/Users/Bazil Suhail/Documents/YT-VideoDowloader/fetchly"
   git add .
   git status            # check that nothing under src-tauri/binaries is listed except .gitkeep
   git commit -m "Keepsake"
   git branch -M main
   git remote add origin https://github.com/<your-user>/fetchly.git
   git push -u origin main
   ```
   If the repository root is the parent folder instead, move `.github` there and set `KEEPSAKE_DIR: fetchly` at the top of `build.yml`.
3. Open the **Actions** tab. The push starts the `build` workflow (or choose **build** > **Run workflow**).
4. When the jobs finish, open the run and download the artifacts listed above from **Artifacts**.
5. **Pin the ffmpeg hash.** Open the log of the `Fetch sidecars` step in the `windows` and `linux` jobs. Each prints `WARNING: ffmpeg has no pinned sha256 ... Computed sha256: <hash>`. Paste those into `ffmpeg.windows.sha256` and `ffmpeg.linux.sha256` in `scripts/binaries.lock.json`, and change the two `latest` URLs to the dated BtbN `autobuild-...` tag of that build. Otherwise the next BtbN daily build no longer matches the pinned hash.

## Known limits

- **Node.js is required on desktop at runtime.** Without Node on `PATH`, yt-dlp cannot solve YouTube's challenges, and some YouTube downloads fail.
- **Android is YouTube-only and single-file.** It offers progressive MP4 (video with audio in one file, which YouTube usually offers only at 360p) or audio only. There is no merging and no playlist download. See [README-ANDROID.md](README-ANDROID.md).
- **A custom save folder must be picked again after a restart on Android.** Folder access granted by the picker lasts for one session. On desktop, yt-dlp writes the files, so this does not apply.
- **The web build (`bun run dev:web`) is for UI work only.** Browser CORS blocks YouTube requests outside Tauri.
- **`.deb` and `.rpm` put the sidecars in `/usr/bin`**, which can clash with a system `yt-dlp` package. The AppImage is self-contained.
- **Windows cancel uses `taskkill /T`.** If Keepsake itself crashes, a running yt-dlp may keep running.
- **Bitrate** applies to MP3 only. M4A and OPUS keep the source quality, and WAV and FLAC are lossless.
- **Release signing for Android** is not set up. CI builds a debug-signed APK. See "Release signing" in BUILD.md.
- **ffmpeg downloads are not pinned yet.** `scripts/binaries.lock.json` has the yt-dlp hashes (from the release's `SHA2-256SUMS`), but the ffmpeg hashes are empty, because the BtbN `latest` URLs change with every daily build. Until they are pinned, the scripts print the hash and continue. See step 5 above.
- **The CI workflow has not run yet.** Its YAML was parse-checked only. The first real run happens after you push.
- **Not yet built on this machine.** The MSVC linker (Visual Studio Build Tools), the Windows SDK and the Android SDK were not installed when this code was written. `tsc`, `oxlint` and `vite build` pass, and the native builds still have to be run.
