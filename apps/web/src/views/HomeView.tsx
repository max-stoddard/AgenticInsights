import type { OverviewResponse } from "@agentic-insights/shared";
import { AlertBanner } from "../components/AlertBanner";
import { DashboardFooter } from "../components/DashboardFooter";
import { DataStatusPanel } from "../components/DataStatusPanel";
import { MetricCard } from "../components/MetricCard";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { formatLitres, formatNumber } from "../lib/format";

interface HomeViewProps {
  error: string | null;
  loading: boolean;
  overview: OverviewResponse | null;
  timeZone: string;
  onOpenMethodology: () => void;
}

function LoadingOverviewHub() {
  return (
    <section className="space-y-4" aria-label="Loading dashboard">
      <SkeletonBlock className="h-48" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-52" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
      </div>
    </section>
  );
}

function WaterSummaryCard({
  overview,
  onOpenMethodology
}: {
  overview: OverviewResponse;
  onOpenMethodology: () => void;
}) {
  const ready = overview.diagnostics.state === "ready";

  return (
    <MetricCard
      eyebrow="Current water estimate"
      title="Estimated litres"
      value={ready ? formatLitres(overview.waterLitres.central) : "Waiting for data"}
      detail={
        ready
          ? `Range ${formatLitres(overview.waterLitres.low)} to ${formatLitres(overview.waterLitres.high)}`
          : "Water estimates appear here once readable local activity is available."
      }
      footer={
        <div className="flex h-full flex-col gap-4">
          <span>
            {ready
              ? `${formatNumber(overview.coverage.supportedEvents)} supported events currently contribute to water.`
              : "Water is the only live metric in this version of the dashboard."}
          </span>
          <button
            type="button"
            className="micro-pill w-fit justify-center text-left text-stone-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
            onClick={onOpenMethodology}
          >
            Open methodology
          </button>
        </div>
      }
      tone="feature"
      className="h-full"
    />
  );
}

function ComingSoonCard({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="panel-shell px-5 py-5 sm:px-6 sm:py-6">
      <p className="section-kicker">{eyebrow}</p>
      <h2 className="mt-3 section-heading">{title}</h2>
      <p className="mt-3 section-copy">{description}</p>
    </section>
  );
}

export function HomeView({ error, loading, overview, timeZone, onOpenMethodology }: HomeViewProps) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <section className="px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-[-0.06em] text-stone-950 sm:text-5xl">
            See your coding-agent usage at a glance
          </h1>
          <p className="mt-5 text-base leading-7 text-stone-600">
            Track the local usage signals Agentic Insights can read today, starting with water estimates and clear placeholders
            for the broader footprint views planned next.
          </p>
        </div>
      </section>

      {error ? <AlertBanner title="Failed to load dashboard data">{error}</AlertBanner> : null}

      {loading || !overview ? (
        <LoadingOverviewHub />
      ) : overview.diagnostics.state !== "ready" ? (
        <DataStatusPanel diagnostics={overview.diagnostics} />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <WaterSummaryCard overview={overview} onOpenMethodology={onOpenMethodology} />
          <ComingSoonCard
            eyebrow="Prompts"
            title="Prompt insights"
            description="Review prompt-level patterns, attribution, and cost context in a dedicated view."
          />
          <ComingSoonCard
            eyebrow="Energy"
            title="Energy estimates"
            description="Track energy usage alongside tokens and supported activity once those estimates are available."
          />
          <ComingSoonCard
            eyebrow="CO2"
            title="CO2 estimates"
            description="Add carbon estimates to the same local workflow without changing how you inspect activity."
          />
        </section>
      )}

      <DashboardFooter lastIndexedAt={overview?.lastIndexedAt ?? null} timeZone={timeZone} />
    </div>
  );
}
