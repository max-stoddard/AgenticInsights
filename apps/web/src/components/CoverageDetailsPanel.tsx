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
        Water totals only include supported OpenAI events with pricing coverage and split token data. The counts below keep
        unsupported providers and fallback-only sessions explicit.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Supported events</p>
          <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-stone-950">
            {formatNumber(overview.coverage.supportedEvents)}
          </p>
          <p className="mt-1 text-sm text-stone-600">priced and estimated</p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Excluded events</p>
          <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-stone-950">
            {formatNumber(overview.coverage.excludedEvents)}
          </p>
          <p className="mt-1 text-sm text-stone-600">unsupported providers or models</p>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Token-only events</p>
          <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-stone-950">
            {formatNumber(overview.coverage.tokenOnlyEvents)}
          </p>
          <p className="mt-1 text-sm text-stone-600">recovered without split-token data</p>
        </div>
      </div>

      {hasExceptions ? (
        <div className="mt-6 space-y-3">
          {overview.exclusions.map((item) => (
            <div key={`${item.provider}:${item.model}`} className="panel-muted px-4 py-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 h-10 w-1 rounded-full bg-cyan-400" />
                <div>
                  <p className="text-sm font-semibold text-stone-950">
                    {item.provider} / {item.model}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {formatNumber(item.tokens)} tokens excluded because {item.reason.toLowerCase()}.
                  </p>
                </div>
              </div>
            </div>
          ))}
          {overview.tokenTotals.unestimatedTokens > 0 ? (
            <div className="panel-muted px-4 py-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 h-10 w-1 rounded-full bg-stone-300" />
                <div>
                  <p className="text-sm font-semibold text-stone-950">Fallback-only sessions</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {formatNumber(overview.tokenTotals.unestimatedTokens)} tokens were recovered from TUI totals without split
                    token data, so they remain unestimated.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-[20px] border border-cyan-100 bg-cyan-50 px-4 py-4 text-sm leading-6 text-stone-700">
          Everything parsed so far has pricing coverage and split-token data.
        </div>
      )}
    </section>
  );
}
