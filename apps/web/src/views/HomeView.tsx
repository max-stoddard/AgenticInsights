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
      <SkeletonBlock className="h-52" />
      <div className="grid gap-3 sm:grid-cols-3">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
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
      eyebrow="Water"
      title="Est. water usage"
      value={ready ? formatLitres(overview.waterLitres.central) : "Waiting for data"}
      detail={
        ready
          ? `Range ${formatLitres(overview.waterLitres.low)} to ${formatLitres(overview.waterLitres.high)}`
          : "Estimates appear once local activity is available."
      }
      footer={
        <div className="flex h-full flex-col gap-4">
          <span>
            {ready
              ? `Based on ${formatNumber(overview.coverage.supportedEvents)} events`
              : "Water estimates are live. More metrics coming soon."}
          </span>
          <button
            type="button"
            className="micro-pill w-fit justify-center text-left text-[#6B6560] transition-colors hover:bg-[#5B8C7E]/10 hover:text-[#4A7A6C]"
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
    <section className="rounded-lg border border-dashed border-[#E8E4DF] bg-[#FAF9F7] px-4 py-3 opacity-55 sm:px-5 sm:py-4">
      <p className="section-kicker">{eyebrow}</p>
      <h2 className="mt-2 text-base font-semibold tracking-[-0.02em] text-zinc-900">{title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-[#6B6560]">{description}</p>
    </section>
  );
}

export function HomeView({ error, loading, overview, timeZone, onOpenMethodology }: HomeViewProps) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <section className="hero-glow px-6 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.06em] text-zinc-900 sm:text-3xl">
            Your agent footprint, locally.
          </h1>
          <p className="mt-4 text-base leading-7 text-[#6B6560]">
            Water estimates from your coding agent activity. Energy and CO2 coming soon.
          </p>
        </div>
      </section>

      {error ? <AlertBanner title="Failed to load dashboard data">{error}</AlertBanner> : null}

      {loading || !overview ? (
        <LoadingOverviewHub />
      ) : overview.diagnostics.state !== "ready" ? (
        <DataStatusPanel diagnostics={overview.diagnostics} />
      ) : (
        <div className="flex flex-col gap-4">
          <WaterSummaryCard overview={overview} onOpenMethodology={onOpenMethodology} />
          <section className="grid gap-3 sm:grid-cols-3">
            <ComingSoonCard
              eyebrow="Prompts"
              title="Prompt insights"
              description="Prompt patterns and cost breakdown."
            />
            <ComingSoonCard
              eyebrow="Energy"
              title="Energy estimates"
              description="Energy usage per session."
            />
            <ComingSoonCard
              eyebrow="CO2"
              title="CO2 estimates"
              description="Carbon footprint estimates."
            />
          </section>
        </div>
      )}

      <DashboardFooter lastIndexedAt={overview?.lastIndexedAt ?? null} timeZone={timeZone} />
    </div>
  );
}
