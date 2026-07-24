# Building Fetchly

Fetchly is a Tauri v2 app. All extraction, download and conversion logic is TypeScript in `src/engine`. The Rust code in `src-tauri` only registers plugins, shows the window, and launches the bundled yt-dlp on desktop.

| Target  | Output                    | Download path                                       |
|---------|---------------------------|-----------------------------------------------------|
| Windows | NSIS `.exe`, `.msi`       | youtubei.js in the webview, plus yt-dlp sidecar     |
| Linux   | `.deb`, `.rpm`, AppImage  | youtubei.js in the webview, plus yt-dlp sidecar     |
| Android | `.apk`                    | youtubei.js only. Single-file formats, no merging   |

## 1. Prerequisites

Tauri v2 prerequisites: https://v2.tauri.app/start/prerequisites/

- Rust 1.90 or newer. `tauri-plugin-http` 2.8 and `tauri-plugin-fs` 2.7 declare `rust-version = 1.90` (crates.io).
- Bun 1.4.x (`bun install`).
- Node.js on `PATH` at runtime, desktop only. yt-dlp is started with `--no-js-runtimes --js-runtimes node` and uses Node to solve YouTube's JS challenges. Deno is not used.

### Windows

- Microsoft C++ Build Tools ("Desktop development with C++") and WebView2. WebView2 ships with Windows 10 and 11.
- Tauri looks for sidecars named for the host triple that `rustc --print host-tuple` prints. CI uses the MSVC toolchain, so `scripts/fetch-binaries.ps1` writes `-x86_64-pc-windows-msvc` names by default.
- **Local fix for "resource path `binaries\yt-dlp-x86_64-pc-windows-gnu.exe` doesn't exist".** On this machine the default toolchain is `stable-x86_64-pc-windows-gnu`, so Tauri wants `-gnu` names. Do not change the rustup default. Copy the three binaries to the gnu names instead (cmd, from the `fetchly` folder):

```cmd
copy /Y "src-tauri\binaries\yt-dlp-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\yt-dlp-x86_64-pc-windows-gnu.exe"
copy /Y "src-tauri\binaries\ffmpeg-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\ffmpeg-x86_64-pc-windows-gnu.exe"
copy /Y "src-tauri\binaries\ffprobe-x86_64-pc-windows-msvc.exe" "src-tauri\binaries\ffprobe-x86_64-pc-windows-gnu.exe"
```

  This is a **local-only** step. The copies are git-ignored like everything else in `src-tauri/binaries`. CI does not need them: it runs on the MSVC toolchain and uses the `-msvc` names. If the `-msvc` files are missing, get them first with `powershell -ExecutionPolicy Bypass -File scripts\fetch-binaries.ps1`, or fetch the gnu names directly with `-Triple x86_64-pc-windows-gnu`.

### Linux (Debian/Ubuntu)

Package list from the Tauri prerequisites page:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Android

1. Install Android Studio. In SDK Manager, install Android SDK Platform, Platform-Tools, **NDK (Side by side)**, Build-Tools and Command-line Tools.
2. Set `JAVA_HOME` to Android Studio's bundled JDK (`jbr`), and set `ANDROID_HOME` and `NDK_HOME`.
3. Add the Rust Android targets.

Windows (cmd). Open a new terminal afterwards:

```cmd
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
dir /b "%LOCALAPPDATA%\Android\Sdk\ndk"
setx NDK_HOME "%LOCALAPPDATA%\Android\Sdk\ndk\<version printed above>"
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

Linux:

```bash
export JAVA_HOME=/opt/android-studio/jbr
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)"
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

## 2. Sidecar binaries (desktop)

`tauri.conf.json` lists `"externalBin": ["binaries/yt-dlp", "binaries/ffmpeg", "binaries/ffprobe"]`. Tauri expects each file at `src-tauri/binaries/<name>-<target triple>[.exe]`. Get the triple with `rustc --print host-tuple`. Source: https://v2.tauri.app/develop/sidecar/

**The binaries are not committed.** ffmpeg is about 136 MB, over GitHub's 100 MB file limit. `.gitignore` excludes `src-tauri/binaries/*` and keeps only `.gitkeep`. The fetch scripts download them (the CI runs the same scripts):

```cmd
:: Windows (writes *-x86_64-pc-windows-msvc.exe; add -Triple x86_64-pc-windows-gnu for the gnu names)
powershell -ExecutionPolicy Bypass -File scripts\fetch-binaries.ps1
```

```bash
# Linux (writes *-x86_64-unknown-linux-gnu); needs curl, tar/xz, sha256sum, python3
bash scripts/fetch-binaries.sh
```

| Source | Windows | Linux | Hash in `scripts/binaries.lock.json` |
|---|---|---|---|
| yt-dlp 2026.08.19 | `yt-dlp.exe` | `yt-dlp_linux` | pinned (from the release's `SHA2-256SUMS`) |
| BtbN FFmpeg-Builds, `latest` tag | `ffmpeg-master-latest-win64-lgpl.zip` | `ffmpeg-master-latest-linux64-lgpl.tar.xz` | **not pinned** (empty) |

A non-empty `sha256` that does not match the download fails the script. An empty one prints the computed hash and continues. The BtbN `latest` URLs are rebuilt daily, so the ffmpeg hash cannot stay pinned against them: switch the URL to a dated `autobuild-YYYY-MM-DD-HH-MM` tag, then paste the hash the first CI run prints.

`tauri.android.conf.json` sets `"externalBin": []`. Android ships no sidecars.

## 3. Commands

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

Output goes to `src-tauri\target\release\bundle\nsis\*.exe` and `src-tauri\target\release\bundle\msi\*.msi`.

### Linux

```bash
bun install
bun run typecheck && bun run lint
(cd src-tauri && cargo test)
bun run dev
bun run build:linux
```

Output goes to `src-tauri/target/release/bundle/{deb,rpm,appimage}/`.

### Android (APK)

Run once. This generates `src-tauri/gen/android`, which is git-ignored:

```cmd
bun run android:init
```

Then, from cmd or bash:

```cmd
bun run android:dev
bun run build:android
bun run build:android:split
bun run build:android:arm64
```

- `android:dev` runs on a connected device or emulator. Vite listens on `TAURI_DEV_HOST`; see `vite.config.ts`.
- `build:android` builds a universal APK for all four ABIs.
- `build:android:split` builds one APK per ABI.
- `build:android:arm64` builds an APK for 64-bit ARM phones only.

The scripts map to `tauri android init`, `tauri android dev` and `tauri android build --apk [--split-per-abi] [--target aarch64]`. Flags are from https://v2.tauri.app/distribute/google-play/. Use `--aab` for Google Play and `--debug` for an APK signed with the debug key that installs directly. Output is under `src-tauri/gen/android/app/build/outputs/apk/`.

**After `android init`:**

- **Where files go on Android.** Tauri's `PathPlugin.kt` resolves `$DOWNLOAD`, `$VIDEO` and `$AUDIO` with `getExternalFilesDir(...)`. That gives `/storage/emulated/0/Android/data/com.fetchly.app/files/Download`, which is app-specific.
  - The app can write there with no storage permission.
  - Android deletes the files when the app is uninstalled.
  - Many file managers hide that folder.

  The file-system docs list `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` in `AndroidManifest.xml` for public folders. On Android 10 and later, scoped storage limits what these grant, and a MediaStore save would be needed for the public Downloads folder. That is a follow-up and not built yet. `INTERNET` is already in the Tauri template.

- **Release signing** follows https://v2.tauri.app/distribute/sign/android/:
  1. Create a keystore with `keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`.
  2. Write `src-tauri/gen/android/keystore.properties` with `password`, `keyAlias` and `storeFile`.
  3. Add a `release` signingConfig in `src-tauri/gen/android/app/build.gradle.kts`.

  Because `gen/` is git-ignored and regenerated in CI, either commit `src-tauri/gen/android` after the edits, or script them in CI. Until then, CI builds a `--debug` APK.

**`bundle.android`** (https://v2.tauri.app/reference/config/): `tauri.android.conf.json` sets `minSdkVersion: 24`, which is the documented default (Android 7.0). Other documented keys:

- `versionCode`: defaults to `major*1000000 + minor*1000 + patch`.
- `autoIncrementVersionCode`
- `debugApplicationIdSuffix`

## 4. How yt-dlp is launched (desktop)

**Decision:** a small Rust command (`src-tauri/src/ytdlp.rs`) uses `std::process::Command` on the sidecar file next to the app executable. It does not use `tauri-plugin-shell`, so the webview gets no `shell:*` permission and no shell plugin is compiled in.

Tauri copies `externalBin` files next to the main executable, without the triple suffix, in both dev (`target/<profile>/`) and installed builds. The shell plugin's `sidecar()` resolves the same folder.

JS contract, which matches `src/engine/ytdlp.ts`:

```ts
invoke<number>("run_ytdlp", { jobId, args, tempDir, onEvent })   // resolves with exit code; -1 = killed by signal
// onEvent: Channel<{ event: "stdout" | "stderr"; line: string }>
invoke<void>("cancel_ytdlp", { jobId })
invoke<{ ytdlp: string|null; ffmpeg: string|null; node: string|null }>("binary_status")  // version strings
invoke<string>("app_version")
```

Rules enforced in Rust:

- **Job id.** `jobId` is 1 to 80 characters from `[A-Za-z0-9_-]`. Only one run per id at a time.
- **Allowed flags.** Every option must be in a fixed allow-list: `FLAGS_NO_VALUE` and `FLAGS_WITH_VALUE` in `ytdlp.rs`. Flags that run programs or load code are rejected, including `--exec`, `--downloader`, `--postprocessor-args`, `--plugin-dirs`, `--config-location`, `--batch-file` and `--ffmpeg-location`. `--js-runtimes` is accepted only with the value `node`.
- **URL.** `--` may appear once and must be followed by exactly one `http://` or `https://` URL with a host.
- **Fixed prefix.** Rust always adds `--ignore-config --no-plugin-dirs --no-js-runtimes --js-runtimes node --ffmpeg-location <app folder>` before the engine's arguments. It sets `PYTHONIOENCODING=utf-8` and `PYTHONUNBUFFERED=1`. On Windows the process starts with `CREATE_NO_WINDOW`; on Unix it starts in its own process group.
- **Cancel.** Cancel kills the whole tree, so ffmpeg children are killed too: `taskkill /T /F` on Windows, `kill -KILL -<pgid>` on Unix. Every running tree is also killed on app exit.
- **Temp folder.** `tempDir`, if given, must be an absolute path ending in `.fetchly-tmp/<jobId>` with no `..` in it. Rust creates the folder and writes a `.fetchly-job` marker file before spawning. It deletes the folder, with retries, only after the process has exited. Nothing else in the output folder is touched.
- **Differences from `src/engine/CONTRACT.md`.**
  - `binary_status` also returns `node`.
  - Unix cancel sends SIGKILL straight away, not SIGTERM and then SIGKILL after 2 s.
  - Windows uses `taskkill /T` instead of a Job Object. A hard crash of Fetchly itself can therefore leave yt-dlp running.
- **Android.** On Android `run_ytdlp` returns an error, and `binary_status` returns all `null`.

App commands are allowed for the `main` window by default. There is no `AppManifest` restriction in `build.rs`.

## 5. Capabilities (`src-tauri/capabilities/desktop.json`, `mobile.json`)

There are two files, both for the `main` window. Neither grants any `shell:*` permission.

- `desktop.json` (`"platforms": ["windows", "linux"]`): everything below, including the window-control permissions for the custom titlebar.
- `mobile.json` (`"platforms": ["android"]`): the same HTTP, fs, dialog and opener grants, without the minimize/maximize/close/drag permissions. Android has no window controls. Its `$schema` points to `gen/schemas/mobile-schema.json`, which Tauri writes after `tauri android init`.

**HTTP (`http:default`, scoped).** `@tauri-apps/plugin-http` sends requests from Rust, so CORS does not apply. A request is allowed only if its URL matches an `allow` entry. Permission names are from https://v2.tauri.app/plugin/http-client/. Pattern rules come from the plugin's `scope.rs`: entries are URLPatterns, an empty or `/` path means any path, query and fragment are wildcards, deny wins over allow, and `*.host` does **not** match the bare `host`.

| Pattern                            | Why                                                          |
|------------------------------------|--------------------------------------------------------------|
| `https://youtube.com`              | bare domain links                                            |
| `https://*.youtube.com`            | www, m and music subdomains; InnerTube `/youtubei/v1/*`; player JS `/s/player/*` |
| `https://youtu.be`                 | short links                                                  |
| `https://*.googlevideo.com`        | media streams (`rrN---sn-*.googlevideo.com`)                 |
| `https://youtubei.googleapis.com`  | InnerTube host used by some youtubei.js clients              |
| `https://*.ytimg.com`              | thumbnails (`i.ytimg.com`, `i9.ytimg.com`)                   |
| `https://*.ggpht.com`              | channel avatars (`yt3.ggpht.com`)                            |
| `https://*.googleusercontent.com`  | channel avatars and banners (`yt3.googleusercontent.com`)    |
| `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/*` | ffmpeg.wasm core, loaded on first use (`src/engine/ffmpeg.ts`) |

**Origin header.** Without the `unsafe-headers` feature, the plugin drops forbidden headers such as `Origin`, `Referer`, `Cookie` and `Sec-*`. It then always sends the webview origin as `Origin`: `tauri://localhost`, or `http://tauri.localhost` on Windows (source: plugin `commands.rs`). `Cargo.toml` enables `unsafe-headers`, so the engine can send `Origin: https://www.youtube.com` and a matching `Referer`. The webview origin is still sent when the engine sets no `Origin`. Redirects are not checked against the scope, because `scope_redirects` is off by default. googlevideo redirects are expected.

`https://*/*` is not granted. The engine asked for it so it could fetch thumbnails from other sites on desktop. Instead, thumbnails from any site are shown with `<img src>`, which the CSP allows (`img-src https:`). Only the hosts above can be fetched with `plugin-http`.

**Filesystem (`fs:*`).** The scope covers `$DOWNLOAD`, `$VIDEO`, `$AUDIO`, `$APPDATA` and `$APPCACHE`, with `/**` for each. Commands granted: open, write, write-file, read-file, mkdir, exists, stat, rename and remove.

A folder picked with `dialog.open()` is added to the fs scope for the current session only. A custom output folder saved in Settings is not in scope after a restart until it is picked again. `tauri-plugin-persisted-scope` would fix this and is deliberately not added.

**Android: re-pick a custom folder after every restart.** On Android all writes go through `plugin-fs` (on desktop yt-dlp writes the file, so the fs scope does not matter there). After the app restarts, a custom folder saved in Settings is out of scope, and downloads to it fail with "Can't save to ...". Open Settings and pick the folder again, or clear it to use the default (`$DOWNLOAD`, which is always in scope).

**Window.** `core:window:allow-show`, `-set-focus`, `-start-dragging`, `-minimize`, `-maximize`, `-unmaximize`, `-toggle-maximize`, `-is-maximized`, `-close` and `-theme`. https://v2.tauri.app/learn/window-customization/ lists `allow-close`, `allow-minimize`, `allow-toggle-maximize` and `allow-start-dragging` as the ones a custom titlebar needs.

**Dialog and opener.** `dialog:allow-open` and `opener:default`. The latter covers open-url for http, https and mailto, plus reveal-item-in-dir. `opener:allow-open-path` is scoped to the bare `$DOWNLOAD` folder itself plus `$DOWNLOAD/**`, `$VIDEO/**` and `$AUDIO/**`. The bare `$DOWNLOAD` entry lets "Open folder" open the default download folder, not only files inside it.

The home folder (`$HOME`, `$HOME/**`) is deliberately **not** in the open-path scope. `open-path` hands a path to the operating system's default handler. On the home folder that would let the webview launch any script, shortcut or executable in the user's profile (for example `.desktop` files on Linux or `.lnk`/`.bat` on Windows). The download folders hold only files Fetchly wrote. Files saved to a custom folder outside these roots can still be shown with reveal-item-in-dir.

## 6. Window, splash and titlebar (`tauri.conf.json`)

| Setting                  | Value       | Docs (https://v2.tauri.app/reference/config/, WindowConfig) |
|--------------------------|-------------|------------------------------------------------------|
| `visible`                | `false`     | "Whether the window is visible or not." The frontend calls `getCurrentWindow().show()` after first paint. On desktop only (`#[cfg(desktop)]`), Rust shows the window after 4 s if the frontend never does (`lib.rs`). |
| `decorations`            | `false` (Windows), `true` (Linux) | "Whether the window should have borders and bars." On Windows this gives the custom titlebar (https://v2.tauri.app/learn/window-customization/). Drag areas use `data-tauri-drag-region`, which works only on the element that carries it. Buttons call `minimize()`, `toggleMaximize()` and `close()`. `tauri.linux.conf.json` sets `true`, because undecorated GTK windows have no resize handles. The frontend checks `isDecorated()` and hides its own min/max/close buttons when native ones exist. |
| `backgroundColor`        | `#0B0908`   | "Set the window and webview background color." Prevents a white flash before first paint. |
| `center`                 | `true`      | "Whether or not the window starts centered or not." |
| `minWidth` / `minHeight` | 960 / 640   | Window size limits. |

**CSP.**

- `script-src` allows `'unsafe-eval'`. youtubei.js evaluates YouTube's player decipher code through `Platform.shim.eval`, and its guide's example uses the `Function` constructor (https://www.ytjs.dev/guide/getting-started).
- `script-src` also allows `'wasm-unsafe-eval'` and `blob:`, and `worker-src` allows `blob:`. ffmpeg.wasm needs these.
- `img-src` allows `https:`, `blob:` and `data:`, so thumbnails from any site load in `<img>`.
- `connect-src` allows the IPC origin.
- `devCsp` adds `ws:` and `http://localhost:1420` for Vite HMR.
- The `assetProtocol` and `protocol-asset` feature were removed because nothing uses them now.

## 7. Bundling

- `tauri.windows.conf.json`:
  - targets `nsis` and `msi`
  - `webviewInstallMode` set to `downloadBootstrapper`, silent (the documented default)
  - NSIS `installMode: currentUser`, so no admin rights are needed
- `tauri.linux.conf.json`: targets `deb`, `rpm` and `appimage`, with `appimage.bundleMediaFramework: false`. Fetchly plays no media, and `true` adds about 15-35 MB. It also repeats the full `main` window entry with `decorations: true`. Platform config files are merged as a JSON Merge Patch (RFC 7396), which replaces arrays whole, so the window entry must be complete.
- **Known (INFERRED):** `.deb` and `.rpm` install sidecars next to the main binary in `/usr/bin`. A system `yt-dlp` package would clash with that. The AppImage is self-contained.

## 8. CI (`.github/workflows/build.yml`)

Runs on push to `main`, on `v*` tags, on pull requests and by hand (`workflow_dispatch`).

| Job | Runner | Steps | Artifacts |
|---|---|---|---|
| `windows` | `windows-latest` | Rust stable (MSVC, checked with `rustc -vV`), Bun 1.4.4, `scripts/fetch-binaries.ps1`, `bun install`, `bun run build:windows` | `fetchly-windows-nsis`, `fetchly-windows-msi` |
| `linux` | `ubuntu-22.04` | apt: `libwebkit2gtk-4.1-dev libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf` (+ build-essential, file), Rust stable, Bun, `scripts/fetch-binaries.sh`, `bun install`, `bun run build:linux` | `fetchly-linux-deb`, `fetchly-linux-rpm`, `fetchly-linux-appimage` |
| `android` | `ubuntu-latest` | Temurin JDK 17, `android-actions/setup-android` + NDK 27.2.12479018, the four Rust Android targets, Bun, `bun install`, `bun run android:init --ci`, `bun run build:android --debug --ci` | `fetchly-android-apk` |

The Android job does not run the fetch scripts: `tauri.android.conf.json` sets `"externalBin": []`. `tsc --noEmit` still runs in CI, as part of `beforeBuildCommand` (`bun run build`). `oxlint` and `cargo test` are not run in CI; run them locally.

The workflow assumes `fetchly/` is the repo root. Otherwise move it to `<repo>/.github/workflows/` and set `FETCHLY_DIR: fetchly`.

## 9. Verification status

| Check | Result |
|---|---|
| `bunx tsc --noEmit` | **Passed** (no output) with the current `src/` and `lib: ES2023`. |
| `bunx oxlint src` | **Passed**: 0 errors, 12 warnings (mostly `no-array-sort`; `sort()` on fresh arrays is kept, because `toSorted()` needs Android System WebView 110+ and `minSdkVersion` is 24). |
| `bunx vite build` | **Passed**. Frontend bundle written to `dist/`. Main chunk is about 1.1 MB (youtubei.js), with a size warning only. |
| `cargo check` (once, in `src-tauri`) | **Failed in the build script.** Error: `resource path binaries\yt-dlp-x86_64-pc-windows-gnu.exe doesn't exist`. The default toolchain here is `stable-x86_64-pc-windows-gnu`, and the sidecars are named for `-msvc`. Crates resolved and `tauri-plugin-http v2.8.3` compiled before the failure. Local fix without changing the toolchain: copy the three binaries to `-gnu` names (section 1). CI uses MSVC and the `-msvc` names. |
| `.github/workflows/build.yml` | Parsed with `Bun.YAML.parse` (PyYAML is not installed). Not run; it runs on GitHub after a push. |
| `scripts/fetch-binaries.sh` / `.ps1` | `bash -n` and the PowerShell parser report no syntax errors. Not run here (no downloads on this machine). |
| `rustfmt --check` on `lib.rs` and `ytdlp.rs` | Parses. Files are formatted. |
| `cargo test`, `tauri build`, `tauri android build` | Not run. These are for the user or CI to run. |
