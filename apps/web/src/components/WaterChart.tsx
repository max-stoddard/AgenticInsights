import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TimeseriesPoint } from "@agentic-insights/shared";
import { formatLitres } from "../lib/format";
import { ChartTooltip } from "./ChartTooltip";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(chartPoints.length > 0 ? chartPoints.length - 1 : -1);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setActiveIndex(chartPoints.length > 0 ? chartPoints.length - 1 : -1);
    setShowTooltip(false);
  }, [chartPoints]);

  const activePoint = activeIndex >= 0 ? chartPoints[activeIndex] ?? null : null;
  const polyline = chartPoints.length > 0 ? buildPolyline(chartPoints) : "";
  const areaPath = chartPoints.length > 0 ? buildArea(chartPoints) : "";
  const axisLabels = getAxisLabels(chartPoints);

  const getPixelPosition = useCallback(
    (point: ChartPoint) => {
      if (!containerRef.current) return { px: 0, py: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        px: (point.x / CHART_WIDTH) * rect.width,
        py: (point.y / CHART_HEIGHT) * rect.height
      };
    },
    []
  );

  if (chartPoints.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-ink-secondary">
        No water estimate available for this time range.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div
        ref={containerRef}
        className="relative h-72 sm:h-80"
        onMouseLeave={() => {
          setShowTooltip(false);
          setActiveIndex(chartPoints.length - 1);
        }}
      >
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-full w-full"
          role="img"
          aria-label="Water usage trend"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(14,165,233,0.15)" />
              <stop offset="100%" stopColor="rgba(14,165,233,0)" />
            </linearGradient>
          </defs>

          {buildGridLines().map((lineY) => (
            <line
              key={lineY}
              x1={CHART_PADDING_X}
              y1={lineY}
              x2={CHART_WIDTH - CHART_PADDING_X}
              y2={lineY}
              stroke="#F1F5F9"
              strokeWidth="0.3"
            />
          ))}

          <path d={areaPath} fill="url(#chartGradient)" />

          <polyline
            points={polyline}
            fill="none"
            stroke="#0EA5E9"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />

          {chartPoints.map((point, index) => {
            const active = index === activeIndex;
            return (
              <g key={`${point.label}:${index}`}>
                {active ? (
                  <>
                    <circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#0EA5E9" strokeWidth="2" />
                  </>
                ) : (
                  <circle cx={point.x} cy={point.y} r="2.2" fill="#0EA5E9" />
                )}
              </g>
            );
          })}
        </svg>

        {chartPoints.map((point, index) => (
          <button
            key={`${point.label}:button`}
            type="button"
            aria-label={`${point.label}: ${formatLitres(point.central)}`}
            className={`absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${
              index === activeIndex ? "shadow-[0_0_0_4px_rgba(14,165,233,0.18)]" : ""
            }`}
            style={{
              left: `${point.x}%`,
              top: `${(point.y / CHART_HEIGHT) * 100}%`
            }}
            onMouseEnter={() => {
              setActiveIndex(index);
              setShowTooltip(true);
            }}
            onFocus={() => {
              setActiveIndex(index);
              setShowTooltip(true);
            }}
          >
            <span className="sr-only">
              {point.label}: {formatLitres(point.central)}
            </span>
          </button>
        ))}

        {showTooltip && activePoint ? (
          <ChartTooltip
            label={activePoint.label}
            central={activePoint.central}
            low={activePoint.low}
            high={activePoint.high}
            tokens={activePoint.tokens}
            x={getPixelPosition(activePoint).px}
            y={getPixelPosition(activePoint).py}
            containerWidth={containerRef.current?.getBoundingClientRect().width ?? 0}
          />
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-ink-tertiary">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
