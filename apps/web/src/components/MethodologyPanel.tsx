import type { MethodologyResponse } from "@agentic-insights/shared";
import { formatLitres, formatNumber } from "../lib/format";

interface MethodologyPanelProps {
  methodology: MethodologyResponse;
}

export function MethodologyPanel({ methodology }: MethodologyPanelProps) {
  return (
    <section className="panel-shell px-6 py-6 sm:px-8 sm:py-8">
      <p className="section-kicker">Methodology</p>
      <h2 className="mt-3 section-heading">How local usage becomes a water estimate</h2>
      <p className="mt-4 section-copy">
        Token extraction comes directly from local usage history the app can read. Water is inferred indirectly from official
        price ratios, calibrated against the median supported local event, and scaled through fixed benchmark coefficients.
      </p>

      <div className="mt-8 grid gap-3">
        <code className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 text-xs leading-6 text-zinc-100">
          eventCostUsd = input/1e6 * inputPrice + cachedInput/1e6 * cachedInputPrice + output/1e6 * outputPrice
        </code>
        <code className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 text-xs leading-6 text-zinc-700">
          waterLitres = eventCostUsd / referenceEventCostUsd * benchmarkCoefficient
        </code>
      </div>

      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Benchmark coefficients</p>
          <p className="mt-2 text-sm leading-6 text-zinc-700">
            Low {formatLitres(methodology.benchmarkCoefficients.low)} · Central{" "}
            {formatLitres(methodology.benchmarkCoefficients.central)} · High{" "}
            {formatLitres(methodology.benchmarkCoefficients.high)}
          </p>
        </div>

        <div className="panel-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Calibration snapshot</p>
          {methodology.calibration ? (
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              Median supported event cost: {methodology.calibration.referenceEventCostUsd.toFixed(6)} USD-equivalent across{" "}
              {formatNumber(methodology.calibration.supportedEventCount)} supported events.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              No supported events were available to compute a local calibration median.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50/80 text-xs uppercase tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-semibold">model</th>
                <th className="px-4 py-3 font-semibold">input / 1M</th>
                <th className="px-4 py-3 font-semibold">cached / 1M</th>
                <th className="px-4 py-3 font-semibold">output / 1M</th>
              </tr>
            </thead>
            <tbody>
              {methodology.pricingTable.map((entry) => (
                <tr key={entry.model} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">{entry.model}</td>
                  <td className="px-4 py-3">${entry.inputUsdPerMillion}</td>
                  <td className="px-4 py-3">${entry.cachedInputUsdPerMillion}</td>
                  <td className="px-4 py-3">${entry.outputUsdPerMillion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {methodology.sourceLinks.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-[#F0EDEA] px-3 py-1.5 text-sm text-[#6B6560] no-underline transition-colors hover:bg-[#5B8C7E]/10 hover:text-[#4A7A6C]"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
