import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { DownloadRow } from "../components/features/DownloadRow";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Segmented } from "../components/ui/Segmented";
import { listItem } from "../components/ui/motion";
import { useDownloads } from "../state/downloads";
import { getPlatform } from "../state/engine";
import { isActive } from "../state/models";
import { navigate } from "../state/nav";

type Filter = "all" | "active" | "done" | "failed";

/** Only the first N rows animate; long lists render plainly to stay cheap. */
const ANIMATE_LIMIT = 200;

export function DownloadsPage({ phone }: { phone: boolean }) {
  const jobs = useDownloads();
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const canReveal = getPlatform() !== "android";

  const shown = useMemo(() => {
    switch (filter) {
      case "active":
        return jobs.filter((j) => isActive(j.status));
      case "done":
        return jobs.filter((j) => j.status === "done");
      case "failed":
        return jobs.filter((j) => j.status === "failed" || j.status === "cancelled");
      default:
        return jobs;
    }
  }, [jobs, filter]);

  if (jobs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex w-[280px] flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="download" size={22} />
          </span>
          <div className="text-[15px] font-semibold">No downloads yet</div>
          <p className="text-fg-2">Fetch a link, pick a format and press Download. Progress shows up here.</p>
          <Button variant="primary" icon="home" onClick={() => navigate("home")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={phone ? "no-scrollbar -mx-4 overflow-x-auto px-4" : ""}>
        <Segmented<Filter>
          label="Filter downloads"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "done", label: "Done" },
            { value: "failed", label: "Failed" },
          ]}
        />
      </div>
      <section className="card flex flex-col px-4 py-1">
        {shown.length === 0 ? (
          <p className="py-8 text-center text-fg-2">Nothing here</p>
        ) : shown.length > ANIMATE_LIMIT ? (
          shown.map((j) => (
            <div key={j.id} className="border-b border-line last:border-b-0">
              <DownloadRow job={j} phone={phone} canReveal={canReveal} />
            </div>
          ))
        ) : (
          <AnimatePresence initial={false}>
            {shown.map((j, i) => (
              <motion.div
                key={j.id}
                layout={!reduced}
                {...listItem(reduced, i)}
                className="border-b border-line last:border-b-0"
              >
                <DownloadRow job={j} phone={phone} canReveal={canReveal} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </section>
    </div>
  );
}
