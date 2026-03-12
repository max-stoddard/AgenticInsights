import type { OverviewResponse } from "@agentic-insights/shared";

interface DataStatusPanelProps {
  diagnostics: OverviewResponse["diagnostics"];
}

function getSanitizedMessage(message: string | null): string | null {
  if (!message) {
    return null;
  }

  return message
    .replaceAll("Configured Codex home", "Configured data path")
    .replaceAll("No Codex usage files were found in this directory yet.", "No usage files were found in this directory yet.")
    .replaceAll("Codex data was found, but no token history could be parsed yet.", "Usage data was found, but no token history could be parsed yet.")
    .replaceAll("No local Codex history was found yet.", "No local usage history was found yet.")
    .replaceAll("Codex", "usage");
}

export function DataStatusPanel({ diagnostics }: DataStatusPanelProps) {
  const isNoData = diagnostics.state === "no_data";
  const title = isNoData ? "No local usage history detected" : "Could not read local usage data";
  const copy = isNoData
    ? "No readable local usage history was found at the current path yet. Run a supported coding agent locally, then refresh this dashboard."
    : "The dashboard could not read the current local usage path. Check the path, then refresh to load new activity.";
  const message = getSanitizedMessage(diagnostics.message);

  return (
    <section className="card px-6 py-6 sm:px-8 sm:py-8">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isNoData ? "bg-amber-400" : "bg-rose-500"}`} />
          <span className="text-sm font-medium text-ink-secondary">
            {isNoData ? "Waiting for data" : "Read error"}
          </span>
        </div>
        <h2 className="mt-3 text-base font-semibold text-ink">{title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">{copy}</p>
      </div>

      <div className="mt-5 rounded-lg bg-surface-muted p-4">
        <p className="text-xs font-medium text-ink-tertiary">Current data path</p>
        <code className="mt-2 block overflow-x-auto text-sm text-ink">{diagnostics.codexHome}</code>
      </div>

      {message ? (
        <div className="mt-3 rounded-lg border border-slate-200/60 bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-secondary">
          {message}
        </div>
      ) : null}
    </section>
  );
}
