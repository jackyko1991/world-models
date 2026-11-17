/**
 * An orbitable Gaussian-splat view drawn with canvas 2D by src/models/splat.ts: every frame projects each splat (EWA),
 * sorts by depth and composites front to back at low resolution, then the canvas is scaled up by CSS. Drag, the
 * arrow buttons, or the arrow keys (when focused) orbit; + and − zoom. An optional overlay draws each splat's ellipse.
 * Shared by the scene viewer (SplatViewer) and the moving scene (MovingSplats).
 */
import { useLang } from "@learnkit/web";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ellipseAxes, orbitCamera, renderSplats, type Camera, type Projected, type Splat3D, type Vec3 } from "../models/splat.ts";
import { DemoButton } from "../pages/kit.tsx";

export interface View {
  az: number;
  el: number;
  radius: number;
}

export function SplatViewerCanvas({
  splats,
  background,
  target,
  fovy,
  initial,
  width = 192,
  height = 144,
  blur = 0.3,
  ellipses = false,
  overlay,
  label,
  children,
}: {
  splats: Splat3D[];
  background: Vec3;
  target: Vec3;
  fovy: number;
  initial: View;
  width?: number;
  height?: number;
  blur?: number;
  /** draw each splat's 2σ ellipse on top */
  ellipses?: boolean;
  /** extra drawing on the overlay canvas, in render pixels scaled by `k` */
  overlay?: (ctx: CanvasRenderingContext2D, cam: Camera, k: number) => void;
  label: string;
  children?: ReactNode;
}) {
  const { pick } = useLang();
  const [view, setView] = useState<View>(initial);
  const [stats, setStats] = useState({ ms: 0, drawn: 0 });
  const base = useRef<HTMLCanvasElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const K = 2; // overlay resolution relative to the render

  const orbit = (daz: number, del: number, zoom = 1) =>
    setView((v) => ({ az: v.az + daz, el: Math.min(1.45, Math.max(0.02, v.el + del)), radius: Math.min(8, Math.max(1.5, v.radius * zoom)) }));

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const t0 = performance.now();
      const cam = orbitCamera(view.az, view.el, view.radius, target, fovy, width, height);
      const img = renderSplats(splats, cam, background, blur);
      const ctx = base.current?.getContext("2d");
      if (ctx) {
        const data = ctx.createImageData(width, height);
        for (let k = 0; k < width * height; k++) {
          data.data[4 * k] = 255 * img.rgb[3 * k];
          data.data[4 * k + 1] = 255 * img.rgb[3 * k + 1];
          data.data[4 * k + 2] = 255 * img.rgb[3 * k + 2];
          data.data[4 * k + 3] = 255;
        }
        ctx.putImageData(data, 0, 0);
      }
      const o = top.current?.getContext("2d");
      if (o) {
        o.clearRect(0, 0, width * K, height * K);
        if (ellipses) drawEllipses(o, img.projected, K);
        overlay?.(o, cam, K);
      }
      setStats({ ms: performance.now() - t0, drawn: img.projected.length });
    });
    return () => cancelAnimationFrame(id);
  }, [view, splats, background, target, fovy, width, height, blur, ellipses, overlay]);

  return (
    <div className="w-full max-w-[480px] space-y-2">
      <div
        className="relative w-full cursor-grab touch-none overflow-hidden rounded-md border border-gray-300 bg-white outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--lk-accent)"
        style={{ aspectRatio: `${width} / ${height}` }}
        tabIndex={0}
        role="img"
        aria-label={label}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const w = (e.currentTarget as HTMLElement).clientWidth || 1;
          orbit((-(e.clientX - drag.current.x) / w) * 3, ((e.clientY - drag.current.y) / w) * 3);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const step = 0.12;
          const keys: Record<string, () => void> = {
            ArrowLeft: () => orbit(step, 0),
            ArrowRight: () => orbit(-step, 0),
            ArrowUp: () => orbit(0, step),
            ArrowDown: () => orbit(0, -step),
            "+": () => orbit(0, 0, 0.9),
            "=": () => orbit(0, 0, 0.9),
            "-": () => orbit(0, 0, 1.1),
          };
          if (keys[e.key]) {
            e.preventDefault();
            keys[e.key]();
          }
        }}
      >
        <canvas ref={base} width={width} height={height} className="absolute inset-0 h-full w-full" />
        <canvas ref={top} width={width * K} height={height * K} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <DemoButton onClick={() => orbit(0.25, 0)}>{pick(["◀ Orbit", "◀ 環繞"])}</DemoButton>
        <DemoButton onClick={() => orbit(-0.25, 0)}>{pick(["Orbit ▶", "環繞 ▶"])}</DemoButton>
        <DemoButton onClick={() => orbit(0, 0.15)}>{pick(["▲ Up", "▲ 上"])}</DemoButton>
        <DemoButton onClick={() => orbit(0, -0.15)}>{pick(["▼ Down", "▼ 下"])}</DemoButton>
        <DemoButton onClick={() => orbit(0, 0, 0.88)}>{pick(["+ Closer", "+ 拉近"])}</DemoButton>
        <DemoButton onClick={() => orbit(0, 0, 1.14)}>{pick(["− Farther", "− 拉遠"])}</DemoButton>
        <DemoButton onClick={() => setView(initial)}>{pick(["Reset view", "重設視角"])}</DemoButton>
        {children}
      </div>
      <p className="text-center text-[11px] text-gray-500 tabular-nums">
        {pick([
          `${stats.drawn} splats sorted and composited at ${width}×${height} in ${stats.ms.toFixed(0)} ms · drag, or focus and use the arrow keys`,
          `${stats.drawn} 個潑濺，在 ${width}×${height} 解析度下排序並合成，用時 ${stats.ms.toFixed(0)} 毫秒 · 拖曳，或選取後用方向鍵`,
        ])}
      </p>
    </div>
  );
}

/** Each splat's 2σ ellipse (the contour where its alpha falls to e⁻² of its peak), faint for faint splats. */
export function drawEllipses(ctx: CanvasRenderingContext2D, projected: Projected[], k: number) {
  ctx.lineWidth = 0.8;
  for (const p of projected) {
    const { rx, ry, angle } = ellipseAxes(p.cov, 2);
    if (rx * k < 0.6) continue;
    const [r, g, b] = p.rgb.map((v) => Math.round(255 * v * 0.7));
    ctx.strokeStyle = `rgba(${r},${g},${b},${(0.15 + 0.6 * p.opacity).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(p.x * k, p.y * k, rx * k, Math.max(ry * k, 0.3), angle, 0, 2 * Math.PI);
    ctx.stroke();
  }
}
