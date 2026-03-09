import type { MethodologyResponse, OverviewResponse } from "@ai-water-usage/shared";
import { AlertBanner } from "../components/AlertBanner";
import { CoverageDetailsPanel } from "../components/CoverageDetailsPanel";
import { MethodologyPanel } from "../components/MethodologyPanel";
import { SkeletonBlock } from "../components/SkeletonBlock";

interface MethodologyViewProps {
  error: string | null;
  loading: boolean;
  methodology: MethodologyResponse | null;
  overview: OverviewResponse | null;
}

function LoadingMethodology() {
  return (
    <section className="space-y-4" aria-label="Loading methodology">
      <SkeletonBlock className="h-48" />
      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonBlock className="h-[32rem]" />
        <SkeletonBlock className="h-[32rem]" />
      </div>
    </section>
  );
}

export function MethodologyView({ error, loading, methodology, overview }: MethodologyViewProps) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <section className="panel-shell px-6 py-8 sm:px-8 sm:py-10">
        <div className="max-w-3xl">
          <div className="micro-pill">Methodology</div>
          <p className="mt-8 section-kicker">How this estimate is built</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.06em] text-stone-950 sm:text-5xl">
            Pricing-weighted water estimation from local Codex logs
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
            This view explains what is included, what is excluded, and how local token activity is normalized into a low,
            central, and high water estimate.
          </p>
        </div>
      </section>

      {error ? <AlertBanner title="Failed to load methodology data">{error}</AlertBanner> : null}

      {loading || !overview || !methodology ? (
        <LoadingMethodology />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          <CoverageDetailsPanel overview={overview} />
          <MethodologyPanel methodology={methodology} />
        </section>
      )}
    </div>
  );
}
