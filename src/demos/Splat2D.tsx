/**
 * Concepts ▸ 3D scene models ▸ Gaussian splatting, demo (a): 2-D Gaussians fitting a small picture. A slider steps
 * through optimisation snapshots precomputed by scripts/splat2d.py (public/models/splat2d.json), each rendered here by
 * src/models/splat.ts. Clicking the render picks the Gaussian that contributes most to that pixel; the ‹ › buttons step
 * through Gaussians from the keyboard; the panel lists the chosen one's parameters.
 */
import { RichText, useLang } from "@learnkit/web";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { composite, contributions, ellipseAxes, gauss2DToProjected, sortByDepth, type Projected } from "../models/splat.ts";
import { DemoButton, Slider } from "../pages/kit.tsx";

interface Snapshot {
  step: number;
  count: number;
  loss: number;
  psnr: number;
  cloned: number;
  split: number;
  pruned: number;
  reset: number;
  g: number[][];
}
interface Data {
  width: number;
  height: number;
  background: [number, number, number];
  target: number[];
  snapshots: Snapshot[];
}

const UP = 2; // render at twice the target's resolution
const AMBER = "#b45309";

export default function Splat2D({ compact = false }: { compact?: boolean }) {
  const { pick } = useLang();
  const [data, setData] = useState<Data | "error" | null>(null);
  const [k, setK] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [outlines, setOutlines] = useState(true);
  const tgt = useRef<HTMLCanvasElement>(null);
  const out = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    fetch(`${import.meta.env.BASE_URL}models/splat2d.json`)
      .then((r) => r.json())
      .then((d: Data) => {
        if (!live) return;
        setData(d);
        setK(Math.min(d.snapshots.length - 1, 6));
      })
      .catch(() => live && setData("error"));
    return () => {
      live = false;
    };
  }, []);

  const snap = data && data !== "error" ? data.snapshots[k] : null;
  // the snapshot's Gaussians as screen splats, at the display resolution
  const projected: Projected[] = useMemo(() => {
    if (!snap) return [];
    return snap.g.map((g, i) => gauss2DToProjected([g[0] * UP, g[1] * UP, g[2] * UP, g[3] * UP, ...g.slice(4)], i));
  }, [snap]);

  useEffect(() => {
    if (!data || data === "error") return;
    const W = data.width, H = data.height;
    const t = tgt.current?.getContext("2d");
    if (t) {
      const im = t.createImageData(W, H);
      for (let p = 0; p < W * H; p++) {
        for (let c = 0; c < 3; c++) im.data[4 * p + c] = data.target[3 * p + c];
        im.data[4 * p + 3] = 255;
      }
      t.putImageData(im, 0, 0);
    }
  }, [data]);

  useEffect(() => {
    if (!data || data === "error") return;
    const id = requestAnimationFrame(() => {
      const W = data.width * UP, H = data.height * UP;
      const img = composite(sortByDepth(projected), W, H, data.background);
      const o = out.current?.getContext("2d");
      if (!o) return;
      const im = o.createImageData(W, H);
      for (let p = 0; p < W * H; p++) {
        for (let c = 0; c < 3; c++) im.data[4 * p + c] = 255 * img.rgb[3 * p + c];
        im.data[4 * p + 3] = 255;
      }
      o.putImageData(im, 0, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [data, projected]);

  if (data === null) return <p className="py-8 text-xs text-gray-500">{pick(["Loading the snapshots…", "正在載入快照…"])}</p>;
  if (data === "error" || !snap) return <p className="py-8 text-xs text-amber-800">{pick(["Could not load public/models/splat2d.json.", "無法載入 public/models/splat2d.json。"])}</p>;

  const W = data.width * UP, H = data.height * UP;
  const chosen = sel !== null && sel < projected.length ? projected[sel] : null;
  const g = chosen ? snap.g[chosen.index] : null;
  const pickAt = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / r.width) * W), j = Math.floor(((e.clientY - r.top) / r.height) * H);
    const c = contributions(projected, i, j);
    if (c.length) setSel(c.reduce((a, b) => (b.weight > a.weight ? b : a)).index);
  };
  const events = [
    snap.split ? pick([`${snap.split} split`, `分裂 ${snap.split} 個`]) : "",
    snap.cloned ? pick([`${snap.cloned} cloned`, `複製 ${snap.cloned} 個`]) : "",
    snap.pruned ? pick([`${snap.pruned} pruned`, `修剪 ${snap.pruned} 個`]) : "",
    snap.reset ? pick(["opacities reset to ≤ 0.2", "不透明度重設為 ≤ 0.2"]) : "",
  ].filter(Boolean);

  return (
    <div className="w-full space-y-3" data-testid="splat-2d">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 text-center">
          <p className="mb-1 text-xs font-medium text-gray-700">{pick(["Target (64×64)", "目標（64×64）"])}</p>
          <canvas ref={tgt} width={data.width} height={data.height} className="mx-auto aspect-square w-full max-w-[260px] rounded border border-gray-300" style={{ imageRendering: "pixelated" }} />
        </div>
        <div className="min-w-0 text-center">
          <p className="mb-1 text-xs font-medium" style={{ color: AMBER }}>
            {pick([`${snap.count} Gaussians, step ${snap.step}`, `${snap.count} 個高斯，第 ${snap.step} 步`])}
          </p>
          <div className="relative mx-auto aspect-square w-full max-w-[260px]">
            <canvas ref={out} width={W} height={H} className="absolute inset-0 h-full w-full rounded border border-amber-300" />
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full cursor-crosshair" onClick={pickAt} role="img" aria-label={pick(["Click to pick the Gaussian that contributes most to a pixel", "點擊以選出對該像素貢獻最大的高斯"])}>
              {outlines &&
                projected.map((p) => {
                  const a = ellipseAxes(p.cov, 1);
                  return <ellipse key={p.index} cx={p.x} cy={p.y} rx={a.rx} ry={a.ry} transform={`rotate(${(a.angle * 180) / Math.PI} ${p.x} ${p.y})`} fill="none" stroke="#1f2937" strokeOpacity={0.15 + 0.35 * p.opacity} strokeWidth={0.5} />;
                })}
              {chosen &&
                (() => {
                  const a = ellipseAxes(chosen.cov, 2);
                  return (
                    <g transform={`rotate(${(a.angle * 180) / Math.PI} ${chosen.x} ${chosen.y})`}>
                      <ellipse cx={chosen.x} cy={chosen.y} rx={a.rx} ry={a.ry} fill="none" stroke={AMBER} strokeWidth={1.6} />
                      <ellipse cx={chosen.x} cy={chosen.y} rx={a.rx / 2} ry={a.ry / 2} fill="none" stroke={AMBER} strokeWidth={1} strokeDasharray="2 2" />
                      <circle cx={chosen.x} cy={chosen.y} r={1.6} fill={AMBER} />
                    </g>
                  );
                })()}
            </svg>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Slider label={["Snapshot", "快照"]} value={k} min={0} max={data.snapshots.length - 1} onChange={setK} format={(v) => `${v + 1}/${data.snapshots.length}`} />
        <p className="text-xs text-gray-600 tabular-nums" aria-live="polite">
          {pick([`step ${snap.step} · PSNR ${snap.psnr} dB`, `第 ${snap.step} 步 · PSNR ${snap.psnr} dB`])}
          {events.length > 0 && <span className="ml-2 font-medium text-amber-800">{pick(["since the last snapshot: ", "自上一張快照以來："]) + events.join(", ")}</span>}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          <DemoButton onClick={() => setSel((s) => (s === null ? 0 : (s - 1 + projected.length) % projected.length))}>{pick(["‹ Previous Gaussian", "‹ 上一個高斯"])}</DemoButton>
          <DemoButton onClick={() => setSel((s) => (s === null ? 0 : (s + 1) % projected.length))}>{pick(["Next Gaussian ›", "下一個高斯 ›"])}</DemoButton>
          <DemoButton active={outlines} onClick={() => setOutlines((o) => !o)}>{pick(["Show outlines", "顯示輪廓"])}</DemoButton>
        </div>
      </div>
      {g && chosen && !compact && <Params g={g} index={chosen.index} count={projected.length} />}
      {g && chosen && compact && (
        <p className="text-center text-xs text-gray-700">
          <RichText text={`#${chosen.index + 1}: $\\mu = (${g[0].toFixed(1)}, ${g[1].toFixed(1)})$, $s = (${g[2].toFixed(2)}, ${g[3].toFixed(2)})$, $o = ${g[8].toFixed(2)}$`} />
        </p>
      )}
      {!g && <p className="text-center text-xs text-gray-500">{pick(["Click the right-hand picture to choose a Gaussian.", "點擊右邊的圖片來選一個高斯。"])}</p>}
    </div>
  );
}

function Params({ g, index, count }: { g: number[]; index: number; count: number }) {
  const { pick } = useLang();
  const [x, y, sx, sy, th, r, gg, b, o] = g;
  const c = Math.cos(th), s = Math.sin(th);
  const sxx = c * c * sx * sx + s * s * sy * sy, sxy = c * s * (sx * sx - sy * sy), syy = s * s * sx * sx + c * c * sy * sy;
  const f = (v: number, d = 2) => v.toFixed(d);
  const rows: [string, string][] = [
    [pick(["mean", "平均"]), `\\mu = (${f(x, 1)},\\ ${f(y, 1)})\\ \\text{px}`],
    [pick(["scales", "尺度"]), `s = (${f(sx)},\\ ${f(sy)})\\ \\text{px}`],
    [pick(["rotation", "旋轉"]), `\\theta = ${f((th * 180) / Math.PI, 0)}^\\circ`],
    [pick(["covariance", "共變異數"]), `\\Sigma = R S S^\\top R^\\top = \\begin{pmatrix} ${f(sxx)} & ${f(sxy)} \\\\ ${f(sxy)} & ${f(syy)} \\end{pmatrix}`],
    [pick(["opacity", "不透明度"]), `o = ${f(o)}`],
  ];
  return (
    <div className="mx-auto grid max-w-md gap-1 rounded-lg border border-amber-200 bg-white p-3 text-xs">
      <p className="flex items-center gap-2 font-medium text-gray-900">
        <span className="inline-block h-4 w-4 rounded border border-gray-300" style={{ background: `rgb(${255 * r},${255 * gg},${255 * b})` }} />
        {pick([`Gaussian #${index + 1} of ${count} (lower numbers are in front)`, `第 ${index + 1} 個高斯，共 ${count} 個（編號小的在前面）`])}
      </p>
      {rows.map(([k, tex]) => (
        <p key={k} className="flex items-baseline gap-2 overflow-x-auto">
          <span className="w-20 shrink-0 text-gray-500">{k}</span>
          <RichText text={`$${tex}$`} />
        </p>
      ))}
      <p className="flex items-baseline gap-2">
        <span className="w-20 shrink-0 text-gray-500">{pick(["colour", "顏色"])}</span>
        <span className="font-mono">
          ({f(r)}, {f(gg)}, {f(b)})
        </span>
      </p>
    </div>
  );
}
