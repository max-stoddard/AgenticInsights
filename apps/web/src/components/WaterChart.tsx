import { useEffect, useMemo, useState } from "react";
import type { TimeseriesPoint } from "@agentic-insights/shared";
import { formatLitres, formatNumber } from "../lib/format";

interface WaterChartProps {
  points: TimeseriesPoint[];
}

interface ChartPoint {
  label: string;
  central: number;
  low: number;
  high: number;
  tokens: number;
  excludedTokens: number;
  unestimatedTokens: number;
  x: number;
  y: number;
}

const CHART_WIDTH = 100;
const CHART_HEIGHT = 64;
const CHART_PADDING_X = 6;
const CHART_PADDING_Y = 7;

function buildPolyline(points: ChartPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function buildArea(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;

  return `M ${firstPoint.x} ${CHART_HEIGHT - CHART_PADDING_Y} L ${buildPolyline(points).replaceAll(",", " ")} L ${lastPoint.x} ${
    CHART_HEIGHT - CHART_PADDING_Y
  } Z`;
}

function buildGridLines(): number[] {
  return [CHART_PADDING_Y, CHART_HEIGHT / 2, CHART_HEIGHT - CHART_PADDING_Y];
}

function getAxisLabels(points: ChartPoint[]): string[] {
  if (points.length <= 3) {
    return points.map((point) => point.label);
  }

  return Array.from(
    new Set([
      points[0]!.label,
      points[Math.floor((points.length - 1) / 2)]!.label,
      points[points.length - 1]!.label
    ])
  );
}

function buildChartPoints(points: TimeseriesPoint[]): ChartPoint[] {
  if (points.length === 0) {
    return [];
  }

  const minValue = Math.min(...points.map((point) => point.waterLitres.central));
  const maxValue = Math.max(...points.map((point) => point.waterLitres.central));
  const span = maxValue - minValue || Math.max(maxValue, 1);
  const plotWidth = CHART_WIDTH - CHART_PADDING_X * 2;
  const plotHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;

  return points.map((point, index) => {
    const ratio = points.length === 1 ? 0.5 : index / (points.length - 1);
    const normalizedValue = span === 0 ? 0.5 : (point.waterLitres.central - minValue) / span;

    return {
      label: point.label,
      central: point.waterLitres.central,
      low: point.waterLitres.low,
      high: point.waterLitres.high,
      tokens: point.tokens,
      excludedTokens: point.excludedTokens,
      unestimatedTokens: point.unestimatedTokens,
      x: CHART_PADDING_X + ratio * plotWidth,
      y: CHART_HEIGHT - CHART_PADDING_Y - normalizedValue * plotHeight
    };
  });
}

export function WaterChart({ points }: WaterChartProps) {
  const chartPoints = useMemo(() => buildChartPoints(points), [points]);
  const latestPoint = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1] : null;
  const [activeIndex, setActiveIndex] = useState<number>(chartPoints.length > 0 ? chartPoints.length - 1 : -1);

  useEffect(() => {
    setActiveIndex(chartPoints.length > 0 ? chartPoints.length - 1 : -1);
  }, [chartPoints]);

  const activePoint = activeIndex >= 0 ? chartPoints[activeIndex] ?? null : null;
  const polyline = chartPoints.length > 0 ? buildPolyline(chartPoints) : "";
  const areaPath = chartPoints.length > 0 ? buildArea(chartPoints) : "";
  const axisLabels = getAxisLabels(chartPoints);

  return (
    <div className="mt-8">
      {latestPoint ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="panel-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Latest central</p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-stone-950">
              {formatLitres(latestPoint.central)}
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Current range</p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-stone-950">
              {formatLitres(latestPoint.low)} to {formatLitres(latestPoint.high)}
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Latest tokens</p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-stone-950">
              {formatNumber(latestPoint.tokens)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-stone-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,247,245,0.98))] p-4 sm:p-6">
        {activePoint ? (
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{activePoint.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-stone-950">
                {formatLitres(activePoint.central)}
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Range {formatLitres(activePoint.low)} to {formatLitres(activePoint.high)}
              </p>
            </div>
            <div className="text-sm leading-6 text-stone-600">
              <p>{formatNumber(activePoint.tokens)} tokens</p>
              {(activePoint.excludedTokens > 0 || activePoint.unestimatedTokens > 0) && (
                <p className="text-stone-500">
                  {activePoint.excludedTokens > 0 ? `${formatNumber(activePoint.excludedTokens)} excluded` : ""}
                  {activePoint.excludedTokens > 0 && activePoint.unestimatedTokens > 0 ? " · " : ""}
                  {activePoint.unestimatedTokens > 0 ? `${formatNumber(activePoint.unestimatedTokens)} unestimated` : ""}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {chartPoints.length > 0 ? (
          <>
            <div
              className="relative mt-5 h-72 rounded-[20px] border border-stone-200 bg-white"
              onMouseLeave={() => {
                setActiveIndex(chartPoints.length - 1);
              }}
            >
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="h-full w-full"
                role="img"
                aria-label="Water usage trend"
              >
                {buildGridLines().map((lineY) => (
                  <line
                    key={lineY}
                    x1={CHART_PADDING_X}
                    y1={lineY}
                    x2={CHART_WIDTH - CHART_PADDING_X}
                    y2={lineY}
                    stroke="rgb(231 229 228)"
                    strokeWidth="0.5"
                  />
                ))}
                <path d={areaPath} fill="rgba(34, 211, 238, 0.12)" />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="rgb(14 165 233)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                {chartPoints.map((point, index) => {
                  const active = index === activeIndex;
                  return (
                    <g key={`${point.label}:${index}`}>
                      <circle cx={point.x} cy={point.y} r={active ? "3.2" : "2.2"} fill="rgb(14 165 233)" />
                      <circle cx={point.x} cy={point.y} r="1.1" fill="white" />
                    </g>
                  );
                })}
              </svg>

              {chartPoints.map((point, index) => (
                <button
                  key={`${point.label}:button`}
                  type="button"
                  aria-label={`${point.label}: ${formatLitres(point.central)}`}
                  className={`absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-500/0 outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                    index === activeIndex ? "shadow-[0_0_0_4px_rgba(34,211,238,0.18)]" : ""
                  }`}
                  style={{
                    left: `${point.x}%`,
                    top: `${(point.y / CHART_HEIGHT) * 100}%`
                  }}
                  onMouseEnter={() => {
                    setActiveIndex(index);
                  }}
                  onFocus={() => {
                    setActiveIndex(index);
                  }}
                >
                  <span className="sr-only">
                    {point.label}: {formatLitres(point.central)}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-stone-500">
              {axisLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-[20px] border border-dashed border-stone-300 bg-white px-4 py-10 text-sm leading-6 text-stone-600">
            No water estimate available for this bucket.
          </div>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-stone-600">
        The chart keeps the central estimate prominent while preserving the low-to-high range and non-estimated token counts
        on every point.
      </p>
    </div>
  );
}
