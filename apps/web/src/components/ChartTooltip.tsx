import { formatLitres, formatNumber } from "../lib/format";

interface ChartTooltipProps {
  label: string;
  central: number;
  low: number;
  high: number;
  tokens: number;
  x: number;
  y: number;
  containerWidth: number;
}

export function ChartTooltip({ label, central, low, high, tokens, x, y, containerWidth }: ChartTooltipProps) {
  const tooltipWidth = 180;
  const offset = 12;
  const flipsRight = x + tooltipWidth + offset > containerWidth;

  return (
    <div
      className="pointer-events-none absolute z-10 w-[180px] rounded-lg bg-slate-900 px-3 py-2.5 text-white shadow-lg transition-opacity duration-150"
      style={{
        left: flipsRight ? x - tooltipWidth - offset : x + offset,
        top: y - 8,
        transform: "translateY(-100%)"
      }}
    >
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-[-0.03em]">{formatLitres(central)}</p>
      <p className="mt-0.5 text-xs text-slate-400">
        Between {formatLitres(low)} and {formatLitres(high)}
      </p>
      <p className="mt-1 text-xs text-slate-400">{formatNumber(tokens)} tokens</p>
    </div>
  );
}
