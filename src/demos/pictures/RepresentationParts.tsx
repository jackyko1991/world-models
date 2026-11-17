/**
 * Small shared pieces for the equation pictures of the representation, generative and limits pages
 * (Representation*, Generative*, Limits*): the site's colours, an italic serif symbol label with an optional
 * subscript, a plain note, an arrowhead marker, a seeded random generator, and a little "frame" box.
 */
import type { ReactNode } from "react";

export const GRAY = "#374151"; // truth / the thing itself
export const LIGHT = "#9ca3af"; // construction lines
export const FAINT = "#d1d5db";
export const AMBER = "#b45309"; // model / prediction
export const AMBER_FILL = "#f59e0b";
export const SKY = "#0284c7"; // a second model

export const SERIF = "'Times New Roman', Times, 'Noto Serif', Georgia, serif"; // lining figures: 0 is not o

/** An italic serif label in the equation's own symbols: `main`, then an optional subscript, then optional `rest`. */
export function Sym({
  x, y, main, sub, rest, size = 14, fill = GRAY, anchor = "start",
}: {
  x: number; y: number; main: ReactNode; sub?: ReactNode; rest?: ReactNode; size?: number; fill?: string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text x={x} y={y} fontFamily={SERIF} fontStyle="italic" fontSize={size} fill={fill} textAnchor={anchor}>
      {main}
      {sub !== undefined && (
        <tspan dy={4} fontSize={Math.max(11, size - 3)}>
          {sub}
        </tspan>
      )}
      {rest !== undefined && <tspan dy={sub !== undefined ? -4 : 0}>{rest}</tspan>}
    </text>
  );
}

/** A plain (upright, sans) note, for the few words a picture needs. */
export function Note({ x, y, children, anchor = "middle", fill = "#6b7280", size = 11.5 }: {
  x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; fill?: string; size?: number;
}) {
  return (
    <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor}>
      {children}
    </text>
  );
}

/** An arrowhead marker definition; reference it with `markerEnd={`url(#${id})`}`. Ids must be unique per page. */
export function ArrowDef({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill={color} />
    </marker>
  );
}

/** A small deterministic generator of standard normal numbers (LCG + Box–Muller), so static pictures never change. */
export function normals(seed: number, n: number): number[] {
  let s = seed >>> 0;
  const u = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s + 0.5) / 4294967296;
  };
  const out: number[] = [];
  while (out.length < n) {
    const r = Math.sqrt(-2 * Math.log(u())), th = 2 * Math.PI * u();
    out.push(r * Math.cos(th), r * Math.sin(th));
  }
  return out.slice(0, n);
}

/** A little video frame: a rounded box with a floor line; children are drawn inside. */
export function FrameBox({ x, y, w, h, stroke = GRAY, children }: {
  x: number; y: number; w: number; h: number; stroke?: string; children?: ReactNode;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill="white" stroke={stroke} strokeWidth={1.4} />
      <line x1={x + 3} y1={y + h - 6} x2={x + w - 3} y2={y + h - 6} stroke={FAINT} strokeWidth={1.2} />
      {children}
    </g>
  );
}
