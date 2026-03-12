import type { OverviewResponse } from "@agentic-insights/shared";
import { formatNumber } from "../lib/format";

interface CoverageSummaryProps {
  overview: OverviewResponse;
  onOpenMethodology: () => void;
}

export function CoverageSummary({ overview, onOpenMethodology }: CoverageSummaryProps) {
  const hasExceptions = overview.exclusions.length > 0 || overview.tokenTotals.unestimatedTokens > 0;

  return (
    <section className="panel-shell px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="section-kicker">Coverage</p>
          <h2 className="mt-3 section-heading">What counts toward this estimate</h2>
          <p className="mt-3 section-copy">
            Supported priced events are converted into litres. Unsupported providers, unsupported models, and fallback-only
            token totals stay visible but remain outside the estimate.
          </p>
        </div>
        <button
          type="button"
          className="micro-pill justify-center text-left text-[#6B6560] transition-colors hover:bg-[#5B8C7E]/10 hover:text-[#4A7A6C]"
          onClick={onOpenMethodology}
        >
          View exclusions and pricing
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Supported</p>
          <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.05em] text-zinc-900">
            {formatNumber(overview.coverage.supportedEvents)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">events with pricing coverage</p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Excluded</p>
          <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.05em] text-zinc-900">
            {formatNumber(overview.coverage.excludedEvents)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">events outside the current estimate</p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Token only</p>
          <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.05em] text-zinc-900">
            {formatNumber(overview.coverage.tokenOnlyEvents)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">sessions without split token data</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-700">
        {hasExceptions
          ? `${formatNumber(overview.tokenTotals.excludedTokens + overview.tokenTotals.unestimatedTokens)} tokens remain visible outside the litres estimate.`
          : "Everything parsed so far has pricing coverage and split-token data."}
      </div>
    </section>
  );
}
