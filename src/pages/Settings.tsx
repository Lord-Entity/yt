import { useRef, useState } from "react";
import { Badge, Dot } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, type Span } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/Dialog";
import { FieldRow, Select, Skeleton, Stepper } from "../components/ui/Fields";
import { Segmented } from "../components/ui/Segmented";
import { Switch } from "../components/ui/Switch";
import { getPlatform, healthOf, refreshBinaries, useBinaries, versionsLine } from "../state/engine";
import { useWidth } from "../state/hooks";
import { openFile, pickFolder } from "../state/native";
import {
  clampParallel,
  COOKIE_BROWSERS,
  resetSettings,
  updateSettings,
  useSettings,
  type ThemePref,
} from "../state/settings";

const SPANS: Record<string, Span> = {
  downloads: { wide: [6, 4], narrow: [12, 4] },
  appearance: { wide: [6, 2], narrow: [12, 2] },
  tools: { wide: [6, 2], narrow: [12, 2] },
  reset: { wide: [12, 1], narrow: [12, 1] },
};

export function SettingsPage({ phone, onSupportedSites }: { phone: boolean; onSupportedSites: () => void }) {
  const s = useSettings((x) => x);
  const bins = useBinaries();
  const health = healthOf(bins);
  const platform = getPlatform();
  const desktop = platform === "windows" || platform === "linux";
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const narrow = phone || (width > 0 && width < 760);

  const downloads = (
    <>
      <FieldRow label="Save folder" hint={platform === "android" ? "Files are saved to the app's files folder." : undefined}>
        <span className="selectable max-w-[220px] truncate font-mono text-[11px] text-fg-2" title={s.saveDir || "System Downloads folder"}>
          {s.saveDir || "System Downloads"}
        </span>
        <Button
          size="sm"
          onClick={async () => {
            const dir = await pickFolder(s.saveDir);
            if (dir) updateSettings({ saveDir: dir });
          }}
        >
          Change...
        </Button>
        {desktop && s.saveDir && (
          <Button size="sm" variant="ghost" onClick={() => void openFile(s.saveDir)}>
            Open
          </Button>
        )}
      </FieldRow>
      <FieldRow label="Parallel downloads" hint="Choose a number from 1 to 10.">
        <Stepper
          label="Parallel downloads"
          value={s.parallelDownloads}
          min={1}
          max={10}
          onChange={(v) => updateSettings({ parallelDownloads: clampParallel(v) })}
        />
      </FieldRow>
      {desktop && (
        <FieldRow label="Cookies from browser" hint="Firefox works best on Windows. Close Chromium browsers before fetching.">
          <Select
            label="Cookies from browser"
            title="Use your browser's sign-in for private or members-only content"
            className="w-[200px]"
            value={s.cookiesBrowser}
            onChange={(v) => updateSettings({ cookiesBrowser: v })}
            options={COOKIE_BROWSERS}
          />
        </FieldRow>
      )}
      <FieldRow label="Embed thumbnail as cover art">
        <Switch
          label="Embed thumbnail as cover art"
          title="Adds cover art to the file"
          checked={s.embedThumbnail}
          onChange={(v) => updateSettings({ embedThumbnail: v })}
        />
      </FieldRow>
      <FieldRow label="Prefer H.264">
        <Switch
          label="Prefer H.264"
          title="Best compatibility. YouTube offers H.264 up to 1080p only"
          checked={s.preferH264}
          onChange={(v) => updateSettings({ preferH264: v })}
        />
      </FieldRow>
      <FieldRow label="Detect links in clipboard">
        <Switch
          label="Detect links in clipboard"
          checked={s.clipboardDetect}
          onChange={(v) => updateSettings({ clipboardDetect: v })}
        />
      </FieldRow>
    </>
  );

  const tone = health === "ready" || health === "unsupported" ? "success" : health === "ffmpeg" ? "warning" : health === "ytdlp" ? "danger" : "neutral";
  const healthText =
    health === "ready"
      ? "Ready"
      : health === "unsupported"
        ? "Built-in engine"
        : health === "ffmpeg"
          ? "ffmpeg missing"
          : health === "ytdlp"
            ? "yt-dlp missing"
            : "Checking";

  return (
    <div ref={ref} className={phone ? "flex flex-col gap-3" : "bento"} style={phone ? undefined : { gridAutoRows: "minmax(88px, auto)" }}>
      <Card span={phone ? undefined : SPANS.downloads} narrow={narrow} title="Downloads">
        {downloads}
      </Card>
      <Card span={phone ? undefined : SPANS.appearance} narrow={narrow} title="Appearance">
        <FieldRow label="Theme">
          <Segmented<ThemePref>
            label="Theme"
            value={s.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: "system", label: "System" },
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
        </FieldRow>
      </Card>
      <Card
        span={phone ? undefined : SPANS.tools}
        narrow={narrow}
        title="Components"
        action={
          <Button size="sm" variant="ghost" icon="retry" onClick={() => void refreshBinaries()}>
            Check
          </Button>
        }
      >
        <div className="flex items-center gap-2">
          <Dot tone={tone} />
          {bins.state === "loading" ? (
            <Skeleton className="h-3 w-48" />
          ) : bins.state === "error" ? (
            <span className="text-danger">{bins.error.message}</span>
          ) : (
            <span className="font-mono text-[12px] text-fg-2">{versionsLine(bins.status)}</span>
          )}
          <Badge tone={tone} className="ml-auto">
            {healthText}
          </Badge>
        </div>
        <button type="button" onClick={onSupportedSites} className="mt-3 self-start text-[12px] font-medium text-accent hover:underline">
          Supported sites
        </button>
      </Card>
      <Card span={phone ? undefined : SPANS.reset} narrow={narrow} bodyClassName="justify-center" className="justify-center">
        <div className="flex items-center justify-between gap-3">
          <span className="text-fg-2">Restore every setting to its default. Your library is kept.</span>
          <Button variant="danger-outline" onClick={() => setConfirmReset(true)}>
            Reset settings
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetSettings}
        title="Reset settings?"
        description="Reset all settings to defaults? Your library is kept."
        confirmLabel="Reset"
        danger
      />
    </div>
  );
}
