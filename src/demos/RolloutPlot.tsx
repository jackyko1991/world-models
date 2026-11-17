/**
 * A small SVG line-plot frame shared by the rollout, cart-pole and calibration demos: axes, ticks, labels and scale
 * functions. Colours follow the book's convention: true = gray-700, model = amber, second model = sky.
 */
import type { ReactNode } from "react";

export const COLOR = { truth: "#374151", model: "#b45309", second: "#0284c7", diff: "#e11d48", grid: "#e5e7eb", muted: "#6b7280" } as const;

export interface Scale {
  x: (v: number) => number;
  y: (v: number) => number;
  /** plotting area in SVG units */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function makeScale(
  w: number,
  h: number,
  [x0, x1]: [number, number],
  [y0, y1]: [number, number],
  { log = false, pad = { l: 40, r: 10, t: 10, b: 30 } }: { log?: boolean; pad?: { l: number; r: number; t: number; b: number } } = {},
): Scale {
  const left = pad.l;
  const right = w - pad.r;
  const top = pad.t;
  const bottom = h - pad.b;
  const ty = (v: number) => (log ? Math.log10(v) : v);
  return {
    x: (v) => left + ((v - x0) / (x1 - x0)) * (right - left),
    y: (v) => bottom - ((ty(v) - ty(y0)) / (ty(y1) - ty(y0))) * (bottom - top),
    left,
    right,
    top,
    bottom,
  };
}

/** A polyline path through (x, y) points, clipped by the caller's clip-path. */
export function path(s: Scale, xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${i ? "L" : "M"}${s.x(x).toFixed(1)},${s.y(ys[i]).toFixed(1)}`).join("");
}

/** Axes with ticks and labels. Children are drawn inside a clip of the plotting area (id must be unique on the page). */
export function Axes({
  s,
  clipId,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  fmtX = (v) => String(v),
  fmtY = (v) => String(v),
  children,
}: {
  s: Scale;
  clipId: string;
  xTicks: number[];
  yTicks: number[];
  xLabel: string;
  yLabel: string;
  fmtX?: (v: number) => string;
  fmtY?: (v: number) => string;
  children: ReactNode;
}) {
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={s.left} y={s.top} width={s.right - s.left} height={s.bottom - s.top} />
        </clipPath>
      </defs>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={s.left} x2={s.right} y1={s.y(v)} y2={s.y(v)} stroke={COLOR.grid} />
          <text x={s.left - 4} y={s.y(v) + 3} textAnchor="end" fontSize="9" fill={COLOR.muted}>
            {fmtY(v)}
          </text>
        </g>
      ))}
      {xTicks.map((v) => (
        <text key={`x${v}`} x={s.x(v)} y={s.bottom + 12} textAnchor="middle" fontSize="9" fill={COLOR.muted}>
          {fmtX(v)}
        </text>
      ))}
      <line x1={s.left} x2={s.right} y1={s.bottom} y2={s.bottom} stroke="#9ca3af" />
      <line x1={s.left} x2={s.left} y1={s.top} y2={s.bottom} stroke="#9ca3af" />
      <text x={(s.left + s.right) / 2} y={s.bottom + 25} textAnchor="middle" fontSize="10" fill={COLOR.muted}>
        {xLabel}
      </text>
      <text transform={`translate(10 ${(s.top + s.bottom) / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill={COLOR.muted}>
        {yLabel}
      </text>
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </g>
  );
}

/** A one-line legend: coloured dashes with labels. */
export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" x2="18" y1="3" y2="3" stroke={it.color} strokeWidth="2.5" strokeDasharray={it.dashed ? "4 3" : undefined} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Reduced-motion preference (animations jump to their end state when set). */
export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
