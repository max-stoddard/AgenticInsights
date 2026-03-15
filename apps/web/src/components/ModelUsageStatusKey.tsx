export function ModelUsageStatusKey() {
  return (
    <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-secondary">
      <div className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>Included in estimate</span>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
        <span>Ran on local hardware</span>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
        <span>Pricing not available</span>
      </div>
    </div>
  );
}
