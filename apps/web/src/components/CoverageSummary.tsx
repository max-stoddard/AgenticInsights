import { useState } from "react";
import type { OverviewResponse } from "@agentic-insights/shared";
import { formatNumber } from "../lib/format";

interface CoverageSummaryProps {
  overview: OverviewResponse;
  onOpenMethodology: () => void;
}

export function CoverageSummary({ overview, onOpenMethodology }: CoverageSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const hasExceptions = overview.exclusions.length > 0 || overview.tokenTotals.unestimatedTokens > 0;

  return (
    <section className="card px-6 py-5 sm:px-8 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-ink">What's included</h2>
        <button
          type="button"
          className="pill transition-colors hover:bg-accent-muted hover:text-accent-hover"
          onClick={onOpenMethodology}
        >
          How it works
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-[-0.03em] text-ink">
            {formatNumber(overview.coverage.supportedEvents)}
          </span>
          <span className="text-ink-secondary">supported</span>
        </div>

        <span className="hidden h-4 w-px bg-slate-200 sm:block" />

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-[-0.03em] text-ink">
            {formatNumber(overview.coverage.excludedEvents)}
          </span>
          <span className="text-ink-secondary">excluded</span>
        </div>

        <span className="hidden h-4 w-px bg-slate-200 sm:block" />

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-[-0.03em] text-ink">
            {formatNumber(overview.coverage.tokenOnlyEvents)}
          </span>
          <span className="text-ink-secondary">token-only</span>
        </div>
      </div>

      {hasExceptions ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm font-medium text-accent no-underline transition-colors hover:text-accent-hover"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
            {expanded ? "Hide details" : `Show ${overview.exclusions.length + (overview.tokenTotals.unestimatedTokens > 0 ? 1 : 0)} details`}
          </button>

          {expanded ? (
            <div className="mt-3 space-y-2">
              {overview.exclusions.map((item) => (
                <div key={`${item.provider}:${item.model}`} className="flex items-start gap-3 rounded-lg bg-surface-muted px-4 py-3">
                  <div className="mt-0.5 h-8 w-1 flex-shrink-0 rounded-full bg-accent" />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {item.provider} / {item.model}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-secondary">
                      {formatNumber(item.tokens)} tokens — {item.reason.toLowerCase()}
                    </p>
                  </div>
                </div>
              ))}
              {overview.tokenTotals.unestimatedTokens > 0 ? (
                <div className="flex items-start gap-3 rounded-lg bg-surface-muted px-4 py-3">
                  <div className="mt-0.5 h-8 w-1 flex-shrink-0 rounded-full bg-ink-tertiary" />
                  <div>
                    <p className="text-sm font-medium text-ink">Fallback-only sessions</p>
                    <p className="mt-0.5 text-sm text-ink-secondary">
                      {formatNumber(overview.tokenTotals.unestimatedTokens)} tokens without split data
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-secondary">
          All sessions have pricing coverage and split-token data.
        </p>
      )}
    </section>
  );
}
