import type { OverviewResponse } from "@ai-water-usage/shared";
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
          <h2 className="mt-3 section-heading">What counts toward your water estimate</h2>
          <p className="mt-3 section-copy">
            Supported OpenAI events are priced and converted into litres. Unsupported providers, models, and fallback-only
            token totals stay visible but remain outside the estimate.
          </p>
        </div>
        <button
          type="button"
          className="micro-pill justify-center text-left text-stone-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
          onClick={onOpenMethodology}
        >
          View exclusions and pricing
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Supported</p>
          <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.05em] text-stone-950">
            {formatNumber(overview.coverage.supportedEvents)}
          </p>
          <p className="mt-1 text-sm text-stone-600">events with pricing coverage</p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Excluded</p>
          <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.05em] text-stone-950">
            {formatNumber(overview.coverage.excludedEvents)}
          </p>
          <p className="mt-1 text-sm text-stone-600">events omitted from litres</p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Token only</p>
          <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.05em] text-stone-950">
            {formatNumber(overview.coverage.tokenOnlyEvents)}
          </p>
          <p className="mt-1 text-sm text-stone-600">sessions without split token data</p>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-700">
        {hasExceptions
          ? `${formatNumber(overview.tokenTotals.excludedTokens + overview.tokenTotals.unestimatedTokens)} tokens remain visible outside the litres estimate.`
          : "Everything parsed so far has pricing coverage and split-token data."}
      </div>
    </section>
  );
}
