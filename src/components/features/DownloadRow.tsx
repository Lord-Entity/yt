import { useState } from "react";
import { cancelJob, removeJob, retryJob } from "../../state/downloads";
import { formatBytes, formatClock, formatSpeed } from "../../state/format";
import type { Job } from "../../state/models";
import { copyText, openFile, revealFile } from "../../state/native";
import { IconButton } from "../ui/Button";
import type { IconName } from "../ui/Icon";
import { Progress, type ProgressTone } from "../ui/Progress";
import { ActionSheet, type SheetAction } from "../ui/Sheet";
import { Thumb } from "./PreviewCard";

function statusText(j: Job): string {
  switch (j.status) {
    case "queued":
      return "Queued";
    case "downloading":
      return `Downloading · ${j.formatLabel}`;
    case "merging":
      return "Merging";
    case "converting":
      return "Converting";
    case "done":
      if (j.summary) return `Completed · ${j.summary}`;
      return `Completed · ${j.ext.toUpperCase()}${j.totalBytes ? ` · ${formatBytes(j.totalBytes)}` : ""}`;
    case "failed":
      return `Failed: ${j.error?.message ?? "Unknown error"}`;
    case "cancelled":
      return "Cancelled";
  }
}

function tone(j: Job): ProgressTone {
  if (j.status === "done") return "success";
  if (j.status === "failed") return "danger";
  if (j.status === "cancelled" || j.status === "queued") return "muted";
  return "accent";
}

interface Action {
  icon: IconName;
  label: string;
  run: () => void;
  disabled?: boolean;
}

function actionsFor(j: Job, canReveal: boolean): Action[] {
  switch (j.status) {
    case "queued":
    case "downloading":
    case "merging":
    case "converting":
      return [{ icon: "x", label: "Cancel", run: () => cancelJob(j.id) }];
    case "done": {
      const list: Action[] = [
        { icon: "open", label: "Open", run: () => j.filePath && void openFile(j.filePath), disabled: !j.filePath },
      ];
      if (canReveal) {
        list.push({
          icon: "folder",
          label: "Show in folder",
          run: () => j.filePath && void revealFile(j.filePath),
          disabled: !j.filePath,
        });
      }
      list.push({ icon: "trash", label: "Remove from list", run: () => removeJob(j.id) });
      return list;
    }
    case "failed":
      return [
        { icon: "retry", label: "Retry", run: () => retryJob(j.id) },
        {
          icon: "copy",
          label: "Copy error",
          run: () => void copyText(j.error?.detail ?? j.error?.message ?? ""),
        },
        { icon: "trash", label: "Remove from list", run: () => removeJob(j.id) },
      ];
    case "cancelled":
      return [
        { icon: "retry", label: "Retry", run: () => retryJob(j.id) },
        { icon: "trash", label: "Remove from list", run: () => removeJob(j.id) },
      ];
  }
}

export function DownloadRow({
  job,
  compact,
  phone,
  canReveal = true,
}: {
  job: Job;
  compact?: boolean;
  phone?: boolean;
  canReveal?: boolean;
}) {
  const [sheet, setSheet] = useState(false);
  const indeterminate =
    job.status === "merging" || job.status === "converting" || (job.status === "downloading" && job.pct === null);
  const pct = indeterminate ? null : (job.pct ?? 0);
  const actions = actionsFor(job, canReveal);
  const active = job.status === "downloading" || job.status === "merging" || job.status === "converting";

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Delete" && (active || job.status === "queued")) {
          e.preventDefault();
          cancelJob(job.id);
        }
      }}
      className={`group flex items-center gap-3 rounded-md outline-offset-[-2px] ${compact ? "h-14" : "h-[72px]"}`}
    >
      <Thumb
        src={job.thumbnailUrl}
        icon={job.mode === "audio" ? "audio" : job.mode === "thumbnail" ? "image" : "video"}
        className={`shrink-0 rounded-[10px] ${compact ? "size-10" : "size-12"}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13px] font-medium" title={job.title}>
            {job.title}
          </span>
          {!compact && job.channel && !phone && (
            <span className="truncate text-[11px] text-fg-2">{job.channel}</span>
          )}
        </div>
        <Progress pct={pct} tone={tone(job)} label={job.title} />
        <span
          className={`truncate text-[11px] leading-[14px] ${job.status === "failed" ? "text-danger" : "text-fg-2"}`}
          title={job.status === "failed" ? (job.error?.detail ?? job.error?.message) : undefined}
        >
          {statusText(job)}
        </span>
      </div>
      {!phone && !compact && (
        <div className="tabular flex w-40 shrink-0 flex-col items-end text-[11px] leading-[14px] text-fg-2">
          <span className="text-[13px] font-medium text-fg">
            {job.pct !== null ? `${Math.round(job.pct)}%` : "-"}
          </span>
          <span>
            {active ? `${formatSpeed(job.speedBps)} · ETA ${formatClock(job.etaSec)}` : ""}
          </span>
          <span>{formatBytes(job.totalBytes)}</span>
        </div>
      )}
      {compact && !phone && (
        <span className="tabular w-12 shrink-0 text-right text-[12px] font-medium">
          {job.pct !== null ? `${Math.round(job.pct)}%` : ""}
        </span>
      )}
      {phone ? (
        <>
          <IconButton icon="more" label="Actions" size={48} onClick={() => setSheet(true)} />
          <ActionSheet
            open={sheet}
            onClose={() => setSheet(false)}
            title={job.title}
            actions={actions.map<SheetAction>((a) => ({
              label: a.label,
              icon: a.icon,
              onSelect: a.run,
              disabled: a.disabled,
              danger: a.icon === "trash",
            }))}
          />
        </>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          {(compact ? actions.slice(0, 1) : actions).map((a) => (
            <IconButton
              key={a.label}
              icon={a.icon}
              label={a.label === "Cancel" ? "Cancel (Delete)" : a.label}
              size={32}
              disabled={a.disabled}
              onClick={a.run}
            />
          ))}
        </div>
      )}
    </div>
  );
}
