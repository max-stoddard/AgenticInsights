import type { Bucket, OverviewResponse, TimeseriesResponse } from "@ai-water-usage/shared";
import { AlertBanner } from "../components/AlertBanner";
import { BucketToggle } from "../components/BucketToggle";
import { CoverageSummary } from "../components/CoverageSummary";
import { MetricCard } from "../components/MetricCard";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { WaterChart } from "../components/WaterChart";
import { formatDateTime, formatLitres, formatNumber } from "../lib/format";

interface HomeViewProps {
  bucket: Bucket;
  error: string | null;
  loading: boolean;
  overview: OverviewResponse | null;
  timeseries: TimeseriesResponse | null;
  timeZone: string;
  onBucketChange: (bucket: Bucket) => void;
  onOpenMethodology: () => void;
}

function HeroSnapshot({
  overview,
  timeZone
}: {
  overview: OverviewResponse | null;
  timeZone: string;
}) {
  if (!overview) {
    return (
      <div className="panel-muted p-5 sm:p-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-10 w-40" />
        </div>
        <div className="mt-6 space-y-3">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (overview.diagnostics.state !== "ready") {
    const title =
      overview.diagnostics.state === "no_data" ? "No Codex history detected" : "Could not read local Codex data";
    const copy =
      overview.diagnostics.state === "no_data"
        ? "The launcher is running locally, but there is no readable Codex token history at the checked path yet."
        : overview.diagnostics.message ?? "The launcher could not read the configured Codex directory.";

    return (
      <div className="panel-muted p-5 sm:p-6">
        <p className="section-kicker">Launcher status</p>
        <div className="mt-3 space-y-3">
          <p className="text-2xl font-semibold tracking-[-0.05em] text-stone-950">{title}</p>
          <p className="text-sm leading-6 text-stone-600">{copy}</p>
        </div>
        <div className="mt-6 space-y-3">
          <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Checked path</p>
            <p className="mt-2 break-all font-mono text-xs text-stone-700">{overview.diagnostics.codexHome}</p>
          </div>
          <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Launcher fix</p>
            <p className="mt-2 break-all font-mono text-xs text-stone-700">ai-water-usage --codex-home /path/to/.codex</p>
          </div>
        </div>
      </div>
    );
  }

  const rows = [
    { label: "Estimated litres", value: formatLitres(overview.waterLitres.central), detail: "central estimate" },
    { label: "Supported events", value: formatNumber(overview.coverage.supportedEvents), detail: "priced and estimated" },
    { label: "Last indexed", value: formatDateTime(overview.lastIndexedAt), detail: timeZone }
  ];

  return (
    <div className="panel-muted p-5 sm:p-6">
      <p className="section-kicker">Current snapshot</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-[-0.05em] text-stone-950">
            {formatLitres(overview.waterLitres.central)}
          </p>
          <p className="mt-1 text-sm text-stone-600">derived from supported local Codex usage</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-cyan-700">
          H2O
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 rounded-[20px] border border-stone-200 bg-white px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{row.label}</p>
              <p className="mt-1 text-sm text-stone-600">{row.detail}</p>
            </div>
            <p className="text-right text-sm font-semibold text-stone-900 sm:text-base">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingDashboard() {
  return (
    <section className="space-y-4" aria-label="Loading dashboard">
      <div className="grid gap-4 lg:grid-cols-12">
        <SkeletonBlock className="h-52 lg:col-span-5" />
        <SkeletonBlock className="h-52 lg:col-span-3" />
        <SkeletonBlock className="h-52 lg:col-span-4" />
      </div>
      <SkeletonBlock className="h-[28rem]" />
      <SkeletonBlock className="h-64" />
    </section>
  );
}

function DiagnosticsPanel({ overview }: { overview: OverviewResponse }) {
  const isNoData = overview.diagnostics.state === "no_data";

  return (
    <section className="panel-shell px-6 py-6 sm:px-8 sm:py-8">
      <div className="max-w-3xl">
        <div className="micro-pill">{isNoData ? "Waiting for local history" : "Local read issue"}</div>
        <h2 className="mt-4 section-heading">
          {isNoData ? "No Codex history detected" : "Could not read local Codex data"}
        </h2>
        <p className="mt-4 text-base leading-7 text-stone-600">
          {isNoData
            ? "Run Codex once, then refresh this dashboard. If your logs live somewhere else, point the launcher at that Codex home first."
            : "Point the launcher at a readable Codex home and refresh. The dashboard only estimates water usage from local Codex history it can actually read."}
        </p>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Current Codex home</p>
          <code className="mt-3 block overflow-x-auto text-sm text-stone-800">{overview.diagnostics.codexHome}</code>
        </div>
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Launcher example</p>
          <code className="mt-3 block overflow-x-auto text-sm text-stone-800">
            ai-water-usage --codex-home /path/to/.codex
          </code>
        </div>
      </div>

      {overview.diagnostics.message ? (
        <div className="mt-4 rounded-[20px] border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-700">
          {overview.diagnostics.message}
        </div>
      ) : null}
    </section>
  );
}

export function HomeView({
  bucket,
  error,
  loading,
  overview,
  timeseries,
  timeZone,
  onBucketChange,
  onOpenMethodology
}: HomeViewProps) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
        <div className="panel-shell relative overflow-hidden px-6 py-6 sm:px-8 sm:py-8">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),transparent_58%)]" />
          <div className="relative">
            <div className="micro-pill">Local Codex Water Usage</div>
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <p className="section-kicker">Water-weighted local estimate</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-stone-950 sm:text-5xl">
                  Water usage estimate from your Codex history
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
                  Understand how much water your supported coding-agent usage likely consumed, using local token history,
                  pricing-weighted normalization, and transparent exclusions.
                </p>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  <span className="micro-pill">Low / central / high range</span>
                  <span className="micro-pill">Local calibration median</span>
                  <span className="micro-pill">Unsupported models kept visible</span>
                </div>
              </div>

              <div className="panel-muted flex flex-col justify-between p-5">
                <div>
                  <p className="section-kicker">What this tracks</p>
                  <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-stone-950">
                    Supported token flow converted into a water estimate
                  </p>
                </div>
                <div className="mt-6 space-y-3 text-sm leading-6 text-stone-600">
                  <p>Exact token counts stay visible.</p>
                  <p>Unsupported providers are separated, not hidden.</p>
                  <p>Range data remains available in the trend view.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <HeroSnapshot overview={overview} timeZone={timeZone} />
      </section>

      {error ? <AlertBanner title="Failed to load dashboard data">{error}</AlertBanner> : null}

      {loading || !overview ? (
        <LoadingDashboard />
      ) : overview.diagnostics.state !== "ready" ? (
        <DiagnosticsPanel overview={overview} />
      ) : !timeseries ? (
        <LoadingDashboard />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-12">
            <MetricCard
              eyebrow="Total water used"
              title="Estimated litres"
              value={formatLitres(overview.waterLitres.central)}
              detail={`Range ${formatLitres(overview.waterLitres.low)} to ${formatLitres(overview.waterLitres.high)}`}
              footer={<span>Local calibration with fixed benchmark coefficients</span>}
              tone="feature"
              className="lg:col-span-5"
            />
            <MetricCard
              eyebrow="Total token usage"
              title="All parsed tokens"
              value={formatNumber(overview.tokenTotals.totalTokens)}
              detail={`${formatNumber(overview.tokenTotals.supportedTokens)} supported · ${formatNumber(
                overview.tokenTotals.excludedTokens
              )} excluded · ${formatNumber(overview.tokenTotals.unestimatedTokens)} unestimated`}
              footer={<span>Water totals exclude unsupported and token-only events</span>}
              className="lg:col-span-3"
            />
            <MetricCard
              eyebrow="Coverage snapshot"
              title="Last indexed"
              value={formatDateTime(overview.lastIndexedAt)}
              detail={`${formatNumber(overview.coverage.supportedEvents)} supported events with pricing coverage`}
              footer={<span>Browser timezone: {timeZone}</span>}
              size="compact"
              className="lg:col-span-4"
            />
          </section>

          <section className="panel-shell px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="section-kicker">Trend</p>
                <h2 className="mt-3 section-heading">Water usage by {bucket}</h2>
                <p className="mt-4 section-copy">
                  The chart highlights the central estimate while keeping each point’s low-to-high range and non-estimated
                  tokens easy to inspect.
                </p>
              </div>
              <BucketToggle active={bucket} onChange={onBucketChange} />
            </div>
            <WaterChart points={timeseries.points} />
          </section>

          <CoverageSummary overview={overview} onOpenMethodology={onOpenMethodology} />
        </>
      )}
    </div>
  );
}
