import type { ModelUsageEntry } from "@agentic-insights/shared";
import { formatNumber, formatUsdCost } from "../lib/format";

interface ModelUsageListProps {
  items: ModelUsageEntry[];
  showRank?: boolean;
}

const rankDisplay = [
  {
    label: "First place",
    number: "1",
    className: "border-slate-200 bg-slate-50 text-slate-600"
  },
  {
    label: "Second place",
    number: "2",
    className: "border-slate-200 bg-slate-50 text-slate-600"
  },
  {
    label: "Third place",
    number: "3",
    className: "border-slate-200 bg-slate-50 text-slate-600"
  }
] as const;

function getAccentClass(item: ModelUsageEntry): string {
  if (item.status === "allowed") {
    return "bg-emerald-500";
  }

  if (item.status === "local") {
    return "bg-amber-400";
  }

  return "bg-accent";
}

function formatBreakdown(item: ModelUsageEntry): string {
  const parts = [`${formatNumber(item.totalTokens)} tokens`];

  if (item.apiCostUsd > 0) {
    parts.push(`${formatUsdCost(item.apiCostUsd)} raw API cost`);
  }

  if (item.statusNote) {
    parts.push(item.statusNote);
  }

  return parts.join(" · ");
}

function MedalRank({ rank }: { rank: 1 | 2 | 3 }) {
  const item = rankDisplay[rank - 1] ?? rankDisplay[0];

  return (
    <span
      className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border shadow-sm ${item.className}`}
      aria-label={item.label}
      title={item.label}
    >
      <span className="text-xs font-semibold">{item.number}</span>
    </span>
  );
}

export function ModelUsageList({ items, showRank = false }: ModelUsageListProps) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.provider}:${item.model}`} className="flex items-center gap-3 rounded-lg bg-surface-muted px-4 py-3">
          {showRank && index < 3 ? <MedalRank rank={(index + 1) as 1 | 2 | 3} /> : null}
          <div className={`h-8 w-1 flex-shrink-0 rounded-full ${getAccentClass(item)}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">
              {item.provider} / {item.model}
            </p>
            <p className="mt-0.5 text-sm text-ink-secondary">{formatBreakdown(item)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
