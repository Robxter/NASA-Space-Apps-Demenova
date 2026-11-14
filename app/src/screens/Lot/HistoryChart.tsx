// One history series as a uPlot chart (lazy chunk: uPlot loads only when a chart is on screen).
// Values arrive in SI and are converted for display only; nulls stay gaps, never zero.
import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { UnitSystem } from '../../types/contracts';
import { convert, type QuantityKind } from '../../units';

export interface HistoryChartProps {
  dates: string[];
  values: (number | null)[];
  kind: QuantityKind;
  units: UnitSystem;
  label: string;
  /** Marks the replay day. */
  marker?: string | null;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function HistoryChart({ dates, values, kind, units, label, marker }: HistoryChartProps) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const xs = dates.map((d) => Date.parse(`${d}T00:00:00Z`) / 1000);
    const ys = values.map((v) => (v === null || !Number.isFinite(v) ? null : convert(kind, v, units).value));
    const unit = convert(kind, 0, units).unit;
    const ink2 = cssVar('--dn-ink-2', 'currentColor');
    const line = cssVar('--dn-line', 'currentColor');
    const stroke = cssVar('--dn-leaf', 'currentColor');
    const markX = marker ? Date.parse(`${marker}T00:00:00Z`) / 1000 : null;
    const axis = { stroke: ink2, grid: { stroke: line, width: 1 }, ticks: { stroke: line, width: 1 } };
    const opts: uPlot.Options = {
      width: Math.max(el.clientWidth, 200),
      height: 140,
      tzDate: (ts) => uPlot.tzDate(new Date(ts * 1000), 'Etc/UTC'),
      legend: { show: false },
      cursor: { drag: { x: false, y: false } },
      scales: { x: { time: true } },
      axes: [axis, { ...axis, size: 64, values: (_u, vals) => vals.map((v) => `${v}${unit ? ` ${unit}` : ''}`) }],
      series: [{}, { label, stroke, width: 2, spanGaps: false, points: { show: true, size: 4, fill: stroke } }],
      hooks: markX
        ? {
            draw: [
              (u) => {
                const x = Math.round(u.valToPos(markX, 'x', true));
                const ctx = u.ctx;
                ctx.save();
                ctx.strokeStyle = cssVar('--dn-ink', 'black');
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, u.bbox.top);
                ctx.lineTo(x, u.bbox.top + u.bbox.height);
                ctx.stroke();
                ctx.restore();
              },
            ],
          }
        : {},
    };
    const plot = new uPlot(opts, [xs, ys as unknown as number[]], el);
    const ro = new ResizeObserver(() => plot.setSize({ width: Math.max(el.clientWidth, 200), height: 140 }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      plot.destroy();
    };
  }, [dates, values, kind, units, label, marker]);

  return <div ref={box} role="img" aria-label={label} className="w-full overflow-hidden" />;
}
