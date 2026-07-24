import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DownloadRow } from "../components/features/DownloadRow";
import { FormatPicker, type PickerChoice } from "../components/features/FormatPicker";
import { PreviewCard, Thumb } from "../components/features/PreviewCard";
import { Button, IconButton } from "../components/ui/Button";
import { Card, type Span } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { Sheet } from "../components/ui/Sheet";
import { listItem, t } from "../components/ui/motion";
import type { AppError, FormatOption, VideoInfo } from "../lib/types";
import { enqueue, useDownloads } from "../state/downloads";
import { asAppError, fetchInfo, getPlatform, listFormats } from "../state/engine";
import { formatBytes, hostOf, isHttpUrl, MOD, relativeTime } from "../state/format";
import { useWidth } from "../state/hooks";
import { computeStats, useLibrary } from "../state/library";
import { isActive } from "../state/models";
import { pickFolder, readClipboard } from "../state/native";
import { navigate, useCommand, type Command } from "../state/nav";
import { settingsStore, updateSettings, useSettings } from "../state/settings";
import { createStore, useStore } from "../state/store";

interface HomeState {
  input: string;
  info: VideoInfo | null;
  formats: FormatOption[];
  loading: boolean;
  error: AppError | null;
  added: string | null;
}

/** Module-level so the preview survives page switches. */
const home = createStore<HomeState>({
  input: "",
  info: null,
  formats: [],
  loading: false,
  error: null,
  added: null,
});
const setHome = (p: Partial<HomeState>) => home.set((s) => ({ ...s, ...p }));
let fetchToken = 0;
let fetchAbort: AbortController | null = null;

async function runFetch(raw: string) {
  const url = raw.trim();
  if (!url) {
    setHome({ error: { code: "empty_url", message: "Paste a link first.", cookiesHint: false } });
    return;
  }
  const token = ++fetchToken;
  fetchAbort?.abort();
  const ctrl = new AbortController();
  fetchAbort = ctrl;
  setHome({ loading: true, error: null, added: null });
  try {
    const info = await fetchInfo(url, {
      signal: ctrl.signal,
      cookiesBrowser: settingsStore.get().cookiesBrowser,
    });
    if (token !== fetchToken) return;
    let formats: FormatOption[] = [];
    try {
      formats = listFormats(info);
    } catch (e) {
      setHome({ loading: false, error: asAppError(e) });
      return;
    }
    setHome({ info, formats, loading: false });
  } catch (e) {
    if (token !== fetchToken) return;
    setHome({ loading: false, error: asAppError(e) });
  }
}

/** Esc while fetching: ignore the pending result. */
function cancelFetch() {
  fetchToken++;
  fetchAbort?.abort();
  fetchAbort = null;
  setHome({ loading: false });
}

function splitDetails(message: string): { body: string; details: string | null } {
  const m = message.match(/^(.*?)\s*\(Details: ([\s\S]*)\)\s*$/);
  return m ? { body: m[1], details: m[2] } : { body: message, details: null };
}

const SPANS: Record<string, Span> = {
  preview: { wide: [7, 4], narrow: [12, 3] },
  picker: { wide: [5, 4], narrow: [12, 4] },
  empty: { wide: [12, 4], narrow: [12, 4] },
  active: { wide: [8, 3], narrow: [12, 3] },
  stat: { wide: [2, 2], narrow: [3, 2] },
  recent: { wide: [8, 3], narrow: [12, 3] },
  folder: { wide: [4, 2], narrow: [12, 1] },
};

export function HomePage({ phone }: { phone: boolean }) {
  const state = useStore(home, (s) => s);
  const { info, formats, loading, error, input, added } = state;
  const jobs = useDownloads();
  const library = useLibrary();
  const saveDir = useSettings((s) => s.saveDir);
  const clipboardDetect = useSettings((s) => s.clipboardDetect);
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const width = useWidth(gridRef);
  const narrow = phone || (width > 0 && width < 760);
  const [sheet, setSheet] = useState(false);
  const [clipLink, setClipLink] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const platform = getPlatform();

  const activeJobs = useMemo(() => jobs.filter((j) => isActive(j.status)).slice(0, 3), [jobs]);
  const stats = useMemo(() => computeStats(library), [library]);
  const recent = library.slice(0, 5);

  const fetchNow = useCallback((url?: string) => {
    const u = url ?? home.get().input;
    if (url !== undefined) setHome({ input: url });
    setShowDetails(false);
    void runFetch(u);
  }, []);

  const onCommand = useCallback(
    (c: Command) => {
      if (c === "focus-paste") {
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (c === "paste-and-fetch") {
        void readClipboard().then((text) => {
          const v = text.trim();
          if (v) fetchNow(v);
          inputRef.current?.focus();
        });
      }
    },
    [fetchNow],
  );
  useCommand(onCommand, "home");

  // Clipboard detect (Settings, default off): on window focus, offer a new link. Never auto-fetches.
  useEffect(() => {
    if (!clipboardDetect) return;
    let last = "";
    const onFocus = () => {
      void readClipboard().then((text) => {
        const v = text.trim();
        if (v && v !== last && isHttpUrl(v) && v !== home.get().input) {
          last = v;
          setClipLink(v);
        }
      });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [clipboardDetect]);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setHome({ added: null }), 4000);
    return () => clearTimeout(id);
  }, [added]);

  const onDownload = (choice: PickerChoice) => {
    if (!info) return;
    enqueue(info, choice);
    setHome({ input: "", added: info.title });
    setSheet(false);
    inputRef.current?.focus();
  };

  const err = error ? splitDetails(error.message) : null;
  const showEmpty = !info && !loading;

  const pasteBar = (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          fetchNow();
        }}
      >
        <label className="relative flex-1">
          <Icon name="link" size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-3" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setHome({ input: e.target.value, error: null })}
            onKeyDown={(e) => {
              if (e.key === "Escape" && home.get().loading) {
                e.preventDefault();
                cancelFetch();
              }
            }}
            placeholder="Paste a video, playlist or audio link"
            aria-label="Link"
            spellCheck={false}
            autoComplete="off"
            className={`w-full rounded-md border border-line bg-inset pr-10 pl-10 text-[13px] text-fg placeholder:text-fg-3 hover:border-line-strong ${phone ? "h-12" : "h-10"}`}
          />
          {input && (
            <IconButton
              icon="x"
              label="Clear"
              size={phone ? 40 : 28}
              className="absolute top-1/2 right-1.5 -translate-y-1/2"
              onClick={() => {
                setHome({ input: "", error: null });
                inputRef.current?.focus();
              }}
            />
          )}
        </label>
        <IconButton
          icon="clipboard"
          label={`Paste from clipboard (${MOD}+V)`}
          size={phone ? 48 : 40}
          onClick={() => onCommand("paste-and-fetch")}
        />
        <Button
          type="submit"
          variant="primary"
          size={phone ? "lg" : "md"}
          className={phone ? "" : "h-10"}
          loading={loading}
          disabled={!input.trim() && !loading}
          title="Fetch (Enter)"
        >
          {loading ? "Fetching" : "Fetch"}
        </Button>
      </form>
  );

  const notices = (
      <AnimatePresence initial={false}>
        {clipLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
            className="flex items-center gap-2 text-[12px]"
          >
            <span className="rounded-full bg-accent-soft px-3 py-1 text-accent">Link found: {hostOf(clipLink)}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const v = clipLink;
                setClipLink(null);
                fetchNow(v);
              }}
            >
              Use link
            </Button>
            <IconButton icon="x" label="Dismiss" size={28} onClick={() => setClipLink(null)} />
          </motion.div>
        )}
        {added && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.fast}
            className="flex items-center gap-2 text-[12px] text-success"
            role="status"
          >
            <Icon name="check" size={16} />
            Added to downloads
            <button type="button" className="font-medium text-accent hover:underline" onClick={() => navigate("downloads")}>
              View
            </button>
          </motion.div>
        )}
      </AnimatePresence>
  );

  const errorBlock = err && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={t.fast}
      role="alert"
      className="rounded-md border border-danger/40 bg-danger/10 p-3"
    >
      <div className="flex items-start gap-2">
        <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {error?.code === "empty_url" ? "Paste a link first." : "Couldn't read this link"}
          </div>
          {error?.code !== "empty_url" && <p className="selectable text-fg-2">{err.body}</p>}
          {(err.details || error?.detail) && (
            <button
              type="button"
              className="mt-1 text-[11px] text-fg-2 underline-offset-2 hover:underline"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
          )}
          {showDetails && (
            <pre className="selectable mt-1 font-mono text-[11px] whitespace-pre-wrap text-fg-2">
              {err.details ?? error?.detail}
            </pre>
          )}
          {error?.code !== "empty_url" && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" icon="retry" onClick={() => fetchNow()}>
                Try again
              </Button>
              {error?.cookiesHint && (
                <Button size="sm" variant="ghost" onClick={() => navigate("settings")}>
                  Open Settings
                </Button>
              )}
            </div>
          )}
        </div>
        <IconButton icon="x" label="Dismiss" size={28} onClick={() => setHome({ error: null })} />
      </div>
    </motion.div>
  );

  const statTiles = [
    { label: "Downloads today", value: String(stats.today), tint: true },
    { label: "Total size", value: formatBytes(stats.totalBytes) },
    { label: "Success rate", value: stats.successRate === null ? "-" : `${stats.successRate}%` },
    { label: "Library items", value: String(stats.items) },
  ];

  const enter = (i: number) => listItem(reduced, i);

  // ---- Phone: single column, sticky paste bar, format picker in a bottom sheet ----
  if (phone) {
    return (
      <div className="flex flex-col gap-3 pb-4">
        <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-app px-4 pt-1 pb-2">
          {pasteBar}
          {notices}
        </div>
        {errorBlock}
        <Card>
          <PreviewCard info={info} loading={loading} phone onOpenFormats={() => setSheet(true)} />
        </Card>
        <Card title="Active downloads" action={<Link onClick={() => navigate("downloads")}>View all</Link>}>
          {activeJobs.length === 0 ? (
            <p className="py-4 text-center text-fg-2">Nothing downloading</p>
          ) : (
            activeJobs.map((j) => <DownloadRow key={j.id} job={j} compact phone />)
          )}
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {statTiles.map((s) => (
            <StatTile key={s.label} {...s} />
          ))}
        </div>
        <RecentCard recent={recent} reduced={reduced} />
        <SaveFolderCard saveDir={saveDir} platform={platform} />
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Format">
          <div className="flex min-h-[320px] flex-col">
            <FormatPicker info={info} formats={formats} disabled={loading} onDownload={onDownload} fill />
          </div>
        </Sheet>
      </div>
    );
  }

  // ---- Desktop bento ----
  return (
    <div className="flex flex-col gap-4">
      <Card className="h-[88px] justify-center !py-0" bodyClassName="justify-center">
        {pasteBar}
      </Card>
      {notices}
      {errorBlock}
      <div ref={gridRef} className="bento">

        {showEmpty ? (
          <Card span={SPANS.empty} narrow={narrow}>
            <PreviewCard info={null} loading={false} />
            <p className="text-center text-[11px] text-fg-3">Press {MOD}+V anywhere on this page to paste and fetch</p>
          </Card>
        ) : (
          <>
            <Card span={SPANS.preview} narrow={narrow}>
              <PreviewCard info={info} loading={loading} />
            </Card>
            <Card span={SPANS.picker} narrow={narrow} title="Format">
              <FormatPicker info={info} formats={formats} disabled={loading} onDownload={onDownload} />
            </Card>
          </>
        )}

        <Card
          span={SPANS.active}
          narrow={narrow}
          title="Active downloads"
          action={<Link onClick={() => navigate("downloads")}>View all</Link>}
        >
          {activeJobs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-fg-2">Nothing downloading</div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {activeJobs.map((j, i) => (
                  <motion.div key={j.id} layout={!reduced} {...enter(i)}>
                    <DownloadRow job={j} compact canReveal={platform !== "android"} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>

        {narrow ? (
          statTiles.map((s) => <StatTile key={s.label} {...s} span={SPANS.stat} narrow />)
        ) : (
          <div
            className="grid grid-cols-2 gap-4"
            style={{ gridColumn: "span 4 / span 4", gridRow: "span 4 / span 4", gridAutoRows: "1fr" }}
          >
            {statTiles.map((s) => (
              <StatTile key={s.label} {...s} />
            ))}
          </div>
        )}

        <RecentCard recent={recent} reduced={reduced} span={SPANS.recent} narrow={narrow} />
        <SaveFolderCard saveDir={saveDir} platform={platform} span={SPANS.folder} narrow={narrow} />
      </div>
    </div>
  );
}

function Link({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="text-[12px] font-medium text-accent hover:underline">
      {children}
    </button>
  );
}

function StatTile({
  label,
  value,
  tint,
  span,
  narrow,
}: {
  label: string;
  value: string;
  tint?: boolean;
  span?: Span;
  narrow?: boolean;
}) {
  return (
    <Card span={span} narrow={narrow} tint={tint} className="justify-between !p-4">
      <div className={`text-[12px] font-medium ${tint ? "text-on-accent/85" : "text-fg-2"}`}>{label}</div>
      <div className="tabular mt-auto text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{value}</div>
    </Card>
  );
}

function RecentCard({
  recent,
  reduced,
  span,
  narrow,
}: {
  recent: ReturnType<typeof useLibrary>;
  reduced: boolean | null;
  span?: Span;
  narrow?: boolean;
}) {
  return (
    <Card
      span={span}
      narrow={narrow}
      title="Recent activity"
      action={<Link onClick={() => navigate("library")}>View all</Link>}
    >
      {recent.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-4 text-fg-2">Your downloads appear here</div>
      ) : (
        <div className="scroll-y flex min-h-0 flex-col">
          <AnimatePresence initial={false}>
            {recent.map((r, i) => (
              <motion.div
                key={r.id}
                layout={!reduced}
                {...listItem(reduced, i)}
                className="flex h-11 shrink-0 items-center gap-3"
              >
                <Thumb src={r.thumbnailUrl} className="h-8 w-12 shrink-0 rounded-sm" icon={r.mode === "audio" ? "audio" : "video"} />
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.title}</span>
                <span
                  className={`text-[11px] ${r.status === "done" ? "text-fg-2" : r.status === "failed" ? "text-danger" : "text-fg-3"}`}
                >
                  {r.status === "done" ? r.format : r.status}
                </span>
                <span className="tabular w-20 text-right text-[11px] text-fg-2">{relativeTime(r.date)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}

function SaveFolderCard({
  saveDir,
  platform,
  span,
  narrow,
}: {
  saveDir: string;
  platform: string;
  span?: Span;
  narrow?: boolean;
}) {
  const oneRow = narrow && !!span;
  return (
    <Card span={span} narrow={narrow} title={oneRow ? undefined : "Save folder"} bodyClassName="justify-center">
      <div className="flex items-center gap-3">
        <Icon name="folder" size={20} className="shrink-0 text-accent" />
        <span className="selectable min-w-0 flex-1 truncate font-mono text-[12px] text-fg-2" title={saveDir || "System Downloads folder"}>
          {saveDir || (platform === "android" ? "App files folder" : "System Downloads folder")}
        </span>
        <Button
          size="sm"
          onClick={async () => {
            const dir = await pickFolder(saveDir);
            if (dir) updateSettings({ saveDir: dir });
          }}
        >
          Change...
        </Button>
      </div>
    </Card>
  );
}

