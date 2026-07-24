import { useCallback, useMemo, useRef, useState } from "react";
import { LibraryList } from "../components/features/LibraryList";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Fields";
import { Icon } from "../components/ui/Icon";
import { Segmented } from "../components/ui/Segmented";
import type { DownloadMode } from "../lib/types";
import { getPlatform } from "../state/engine";
import { MOD } from "../state/format";
import { useMediaQuery, useWidth } from "../state/hooks";
import { useLibrary } from "../state/library";
import type { LibraryItem } from "../state/models";
import { navigate, useCommand, type Command } from "../state/nav";
import { loadUiPref, saveUiPref } from "../state/persist";

type Kind = "all" | DownloadMode;
type Status = "all" | LibraryItem["status"];
type Sort = "newest" | "oldest" | "title";
type View = "list" | "grid";

const PAGE = 60;

export function LibraryPage({ phone }: { phone: boolean }) {
  const items = useLibrary();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setViewState] = useState<View>(() => loadUiPref<View>("libraryView", "grid"));
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useWidth(wrapRef);
  const tiny = useMediaQuery("(max-width: 359.98px)");

  const setView = (v: View) => {
    setViewState(v);
    saveUiPref("libraryView", v);
  };

  const onCommand = useCallback((c: Command) => {
    if (c === "focus-library-search") searchRef.current?.focus();
  }, []);
  useCommand(onCommand, "library");

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (kind === "all" || i.mode === kind) &&
        (status === "all" || i.status === status) &&
        (!n ||
          i.title.toLowerCase().includes(n) ||
          (i.channel ?? "").toLowerCase().includes(n) ||
          i.site.toLowerCase().includes(n)),
    );
    if (sort === "oldest") list.sort((a, b) => a.date - b.date);
    else if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    else list.sort((a, b) => b.date - a.date);
    return list;
  }, [items, q, kind, status, sort]);

  const columns = phone ? (tiny ? 1 : 2) : width > 0 && width < 760 ? 3 : 4;
  const clear = () => {
    setQ("");
    setKind("all");
    setStatus("all");
  };

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex w-[280px] flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="library" size={22} />
          </span>
          <div className="text-[15px] font-semibold">Your library is empty</div>
          <p className="text-fg-2">Finished downloads appear here with their snapshots.</p>
          <Button variant="primary" icon="home" onClick={() => navigate("home")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const kindOptions = [
    { value: "all" as Kind, label: "All kinds" },
    { value: "video" as Kind, label: "Video" },
    { value: "audio" as Kind, label: "Audio" },
    { value: "thumbnail" as Kind, label: "Thumbnail" },
  ];
  const statusOptions = [
    { value: "all" as Status, label: "All statuses" },
    { value: "done" as Status, label: "Completed" },
    { value: "failed" as Status, label: "Failed" },
    { value: "cancelled" as Status, label: "Cancelled" },
  ];
  const sortOptions = [
    { value: "newest" as Sort, label: "Newest" },
    { value: "oldest" as Sort, label: "Oldest" },
    { value: "title" as Sort, label: "Title" },
  ];

  return (
    <div ref={wrapRef} className="flex flex-col gap-4">
      <div className={`flex gap-2 ${phone ? "flex-col" : "h-11 items-center"}`}>
        <label className="relative min-w-0 flex-1">
          <Icon name="search" size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-3" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search title, channel or site"
            aria-label={`Search library (${MOD}+F)`}
            className={`w-full rounded-md border border-line bg-inset pr-3 pl-9 text-[13px] text-fg placeholder:text-fg-3 hover:border-line-strong ${phone ? "h-12" : "h-9"}`}
          />
        </label>
        <div className={`flex items-center gap-2 ${phone ? "no-scrollbar -mx-4 overflow-x-auto px-4" : ""}`}>
          <Select label="Kind" value={kind} onChange={setKind} options={kindOptions} className="w-[140px] shrink-0" />
          <Select label="Status" value={status} onChange={setStatus} options={statusOptions} className="w-[140px] shrink-0" />
          <Select label="Sort" value={sort} onChange={setSort} options={sortOptions} className="w-[110px] shrink-0" />
          <Segmented<View>
            label="View"
            value={view}
            onChange={setView}
            className="shrink-0"
            options={[
              { value: "list", label: "List" },
              { value: "grid", label: "Grid" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-[15px] font-semibold">No matches for "{q}"</div>
          <Button onClick={clear}>Clear filters</Button>
        </div>
      ) : (
        <>
          <LibraryList
            items={filtered.slice(0, limit)}
            view={view}
            phone={phone}
            columns={columns}
            canReveal={getPlatform() !== "android"}
          />
          {filtered.length > limit && (
            <Button className="self-center" onClick={() => setLimit((l) => l + PAGE)}>
              Show more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
