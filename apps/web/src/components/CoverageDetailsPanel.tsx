import type { OverviewResponse } from "@agentic-insights/shared";
import { formatNumber } from "../lib/format";

interface CoverageDetailsPanelProps {
  overview: OverviewResponse;
}

export function CoverageDetailsPanel({ overview }: CoverageDetailsPanelProps) {
  const hasExceptions = overview.exclusions.length > 0 || overview.tokenTotals.unestimatedTokens > 0;

  return (
    <section className="panel-shell px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">Coverage details</p>
          <h2 className="mt-3 section-heading">Included, excluded, and unestimated usage</h2>
        </div>
        <div className="micro-pill">{formatNumber(overview.coverage.supportedEvents)} supported</div>
      </div>

      <p className="mt-4 section-copy">
        Water totals only include supported priced events with split token data. The counts below keep unsupported providers,
        unsupported models, and fallback-only sessions explicit.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Supported events</p>
          <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-zinc-900">
            {formatNumber(overview.coverage.supportedEvents)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">priced and estimated</p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Excluded events</p>
          <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-zinc-900">
            {formatNumber(overview.coverage.excludedEvents)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">outside supported pricing coverage</p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Token-only events</p>
          <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-zinc-900">
            {formatNumber(overview.coverage.tokenOnlyEvents)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">recovered without split-token data</p>
        </div>
      </div>

      {hasExceptions ? (
        <div className="mt-6 space-y-3">
          {overview.exclusions.map((item) => (
            <div key={`${item.provider}:${item.model}`} className="panel-muted px-4 py-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 h-10 w-1 rounded-full bg-[#5B8C7E]" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.provider} / {item.model}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {formatNumber(item.tokens)} tokens excluded because {item.reason.toLowerCase()}.
                  </p>
                </div>
              </div>
            </div>
          ))}
          {overview.tokenTotals.unestimatedTokens > 0 ? (
            <div className="panel-muted px-4 py-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 h-10 w-1 rounded-full bg-zinc-300" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Fallback-only sessions</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {formatNumber(overview.tokenTotals.unestimatedTokens)} tokens were recovered from TUI totals without split
                    token data, so they remain unestimated.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-[#5B8C7E]/20 bg-[#5B8C7E]/5 px-4 py-4 text-sm leading-6 text-zinc-700">
          Everything parsed so far has pricing coverage and split-token data.
        </div>
      )}
    </section>
  );
}
