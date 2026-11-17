/**
 * Small shared pieces for the Gaussian-splatting equation pictures (GaussiansCovariance, GaussiansColour,
 * GaussiansProjection, GaussiansComposite, TowardDeform, SplatProjection): the site's colours, an italic serif symbol
 * label with an optional subscript, and an arrowhead marker.
 */
import type { ReactNode } from "react";

export const GRAY = "#374151"; // truth / the scene element itself
export const LIGHT = "#9ca3af"; // construction lines
export const AMBER = "#b45309"; // model / prediction
export const AMBER_FILL = "#f59e0b";
export const SKY = "#0284c7"; // a second model

export const SERIF = "Georgia, 'Times New Roman', serif";

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
export function Note({ x, y, children, anchor = "middle", fill = "#6b7280" }: {
  x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; fill?: string;
}) {
  return (
    <text x={x} y={y} fontSize={11.5} fill={fill} textAnchor={anchor}>
      {children}
    </text>
  );
}

/** An arrowhead marker definition; reference it with `markerEnd={`url(#${id})`}`. */
export function ArrowDef({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill={color} />
    </marker>
  );
}

/** Points of an ellipse centred at (cx, cy) with semi-axes a, b, rotated by `deg` (SVG convention, clockwise). */
export function ellipsePoints(cx: number, cy: number, a: number, b: number, deg: number, n = 360): [number, number][] {
  const th = (deg * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const p = (2 * Math.PI * k) / n, ex = a * Math.cos(p), ey = b * Math.sin(p);
    pts.push([cx + c * ex - s * ey, cy + s * ex + c * ey]);
  }
  return pts;
}
