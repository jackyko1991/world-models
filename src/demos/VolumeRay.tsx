/**
 * One ray through a 2-D density field (Concepts ▸ 3D scene models ▸ Volume rendering). Soft coloured blobs fill a
 * slice; the reader drags the camera (or uses the buttons / arrow keys), turns it, and sets how many samples the ray
 * takes. Each sample's weight w_i = T_i(1 − e^{−σ_i δ_i}) is drawn as a bar across the ray and again in a chart with
 * the transmittance T, and the composited pixel colour is shown. The maths is src/models/volumeRender.ts.
 */
import { RichText, useLang } from "@learnkit/web";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { DemoButton, Slider } from "../pages/kit.tsx";
import { blobField, marchField, over, renderRay, samplePdf, type Blob, type Vec } from "../models/volumeRender.ts";

const AMBER = "#b45309";
const SKY = "#0284c7";
const GRAY = "#374151";

// the slice is [−1.6, 1.6] × [−1, 1] in world units, drawn at 150 px per unit (y up)
const X0 = -1.6;
const X1 = 1.6;
const Y0 = -1;
const Y1 = 1;
const S = 150;
const W = (X1 - X0) * S;
const H = (Y1 - Y0) * S;
const toSvg = (p: Vec): [number, number] => [(p[0] - X0) * S, (Y1 - p[1]) * S];

export const BLOBS: Blob[] = [
  { centre: [-0.35, 0.25], radius: 0.22, peak: 5, colour: [0.86, 0.25, 0.2] },
  { centre: [0.3, -0.12], radius: 0.16, peak: 14, colour: [0.15, 0.4, 0.88] },
  { centre: [0.95, 0.3], radius: 0.28, peak: 3, colour: [0.2, 0.65, 0.3] },
  { centre: [0.1, 0.55], radius: 0.13, peak: 25, colour: [0.92, 0.7, 0.15] },
];
const field = blobField(BLOBS);
const BACKGROUND = [1, 1, 1];

/** Where the ray o + t d leaves the slice (the far bound of the samples). */
function exitDistance(o: Vec, d: Vec): number {
  let t = Infinity;
  if (d[0] > 1e-9) t = Math.min(t, (X1 - o[0]) / d[0]);
  if (d[0] < -1e-9) t = Math.min(t, (X0 - o[0]) / d[0]);
  if (d[1] > 1e-9) t = Math.min(t, (Y1 - o[1]) / d[1]);
  if (d[1] < -1e-9) t = Math.min(t, (Y0 - o[1]) / d[1]);
  return Math.max(t, 0.1);
}

const rgbCss = (c: Vec) => `rgb(${c.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255)).join(",")})`;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** The density field as a small image (drawn once in the browser). */
function useFieldImage(): string | null {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const w = 160;
    const h = 100;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(w, h);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const p = [X0 + ((i + 0.5) / w) * (X1 - X0), Y1 - ((j + 0.5) / h) * (Y1 - Y0)];
        const { sigma, colour } = field(p);
        const a = 1 - Math.exp(-0.18 * sigma); // how opaque a short stretch looks
        const k = 4 * (j * w + i);
        for (let c = 0; c < 3; c++) img.data[k + c] = 255 * (1 - a + a * colour[c]);
        img.data[k + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }, []);
}

export default function VolumeRay({ compact = false }: { compact?: boolean }) {
  const { pick } = useLang();
  const [cam, setCam] = useState<Vec>([-1.4, 0.05]);
  const [angle, setAngle] = useState(0); // radians, 0 = looking along +x
  const [n, setN] = useState(16);
  const [fine, setFine] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const image = useFieldImage();

  const d = [Math.cos(angle), Math.sin(angle)];
  const near = 0.05;
  const far = exitDistance(cam, d);
  const res = marchField(field, cam, d, near, far, n);
  const pixel = over(res, BACKGROUND);
  const sum = res.weights.reduce((a, b) => a + b, 0);
  const fineTs = fine ? samplePdf(res.ts, res.weights, near, far, n) : [];
  const fineRes = fine ? fineComposite(cam, d, [...res.ts, ...fineTs].sort((a, b) => a - b), far) : null;

  const move = (dx: number, dy: number) => setCam(([x, y]) => [clamp(x + dx, X0 + 0.05, X1 - 0.05), clamp(y + dy, Y0 + 0.05, Y1 - 0.05)]);
  const turn = (da: number) => setAngle((a) => a + da);
  const onKey = (e: KeyboardEvent) => {
    const step = 0.05;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(-step, 0),
      ArrowRight: () => move(step, 0),
      ArrowUp: () => move(0, step),
      ArrowDown: () => move(0, -step),
      q: () => turn(0.05),
      e: () => turn(-0.05),
    };
    const f = keys[e.key];
    if (f) {
      e.preventDefault();
      f();
    }
  };
  const toWorld = (e: PointerEvent): Vec | null => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [X0 + pt.x / S, Y1 - pt.y / S];
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const p = toWorld(e);
    if (p) setCam([clamp(p[0], X0 + 0.05, X1 - 0.05), clamp(p[1], Y0 + 0.05, Y1 - 0.05)]);
  };

  const [cx, cy] = toSvg(cam);
  const end = toSvg([cam[0] + far * d[0], cam[1] + far * d[1]]);
  const normal = [-d[1], d[0]]; // bars stand across the ray
  const barScale = 120; // px per unit weight
  const deg = (angle * 180) / Math.PI;

  // chart: weights (bars) and transmittance (line) against t
  const CW = W;
  const CH = 120;
  const tx = (t: number) => 30 + ((t - 0) / far) * (CW - 40);
  const ty = (v: number) => CH - 18 - v * (CH - 30);
  const tPath = res.ts.map((t, i) => `${i ? "L" : "M"}${tx(t).toFixed(1)},${ty(res.trans[i]).toFixed(1)}`).join(" ") + ` L${tx(far).toFixed(1)},${ty(res.tFinal).toFixed(1)}`;
  const barW = Math.max(2, Math.min(14, ((CW - 40) / n) * 0.6));

  return (
    <div className="w-full max-w-[520px] space-y-2">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none rounded border border-gray-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={onMove}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
        role="img"
        aria-label={pick(["A 2-D slice of coloured density blobs with one camera ray and its samples. Arrow keys move the camera; Q and E turn it.", "一個由彩色密度團塊構成的二維切面，以及一條相機光線與其取樣點。方向鍵移動相機；Q 與 E 轉動相機。"])}
      >
        {image && <image href={image} x={0} y={0} width={W} height={H} preserveAspectRatio="none" style={{ imageRendering: "auto" }} />}
        <line x1={cx} y1={cy} x2={end[0]} y2={end[1]} stroke={GRAY} strokeWidth={1.2} strokeDasharray="4 3" />
        {res.ts.map((_, i) => {
          const p = toSvg(res.points[i]);
          const len = res.weights[i] * barScale;
          return (
            <g key={i}>
              {len > 0.3 && <line x1={p[0]} y1={p[1]} x2={p[0] - normal[0] * len} y2={p[1] + normal[1] * len} stroke={AMBER} strokeWidth={Math.min(6, barW * 0.8)} strokeLinecap="butt" opacity={0.85} />}
              <circle cx={p[0]} cy={p[1]} r={2.6} fill="white" stroke={GRAY} strokeWidth={1} />
            </g>
          );
        })}
        {fineTs.map((t, i) => {
          const p = toSvg([cam[0] + t * d[0], cam[1] + t * d[1]]);
          return <circle key={`f${i}`} cx={p[0]} cy={p[1]} r={2.2} fill={SKY} />;
        })}
        <g
          transform={`translate(${cx},${cy}) rotate(${-deg})`}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as Element).setPointerCapture?.(e.pointerId);
          }}
        >
          <circle r={14} fill="transparent" />
          <path d="M -12 -8 L 4 0 L -12 8 Z" fill={GRAY} />
          <rect x={4} y={-3} width={4} height={6} fill={rgbCss(pixel)} stroke={GRAY} strokeWidth={1} />
        </g>
      </svg>

      {!compact && (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="h-auto w-full rounded border border-gray-200 bg-white" role="img" aria-label={pick(["Weights and transmittance along the ray", "沿光線的權重與透射率"])}>
          <line x1={30} y1={ty(0)} x2={CW - 10} y2={ty(0)} stroke="#d1d5db" />
          <line x1={30} y1={ty(1)} x2={CW - 10} y2={ty(1)} stroke="#f3f4f6" />
          <text x={24} y={ty(1) + 4} fontSize={10} textAnchor="end" fill="#6b7280">1</text>
          <text x={24} y={ty(0) + 4} fontSize={10} textAnchor="end" fill="#6b7280">0</text>
          {res.ts.map((t, i) => (
            <rect key={i} x={tx(t) - barW / 2} y={ty(res.weights[i])} width={barW} height={Math.max(0, ty(0) - ty(res.weights[i]))} fill={rgbCss(field(res.points[i]).colour)} stroke={AMBER} strokeWidth={0.8} />
          ))}
          <path d={tPath} fill="none" stroke={GRAY} strokeWidth={1.5} />
          <text x={CW - 12} y={ty(res.tFinal) - 4} fontSize={10} textAnchor="end" fill={GRAY}>T</text>
          <text x={CW / 2} y={CH - 4} fontSize={10} textAnchor="middle" fill="#6b7280">{pick(["distance t along the ray", "沿光線的距離 t"])}</text>
        </svg>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700">
        <span className="inline-block h-8 w-8 rounded border border-gray-300" style={{ background: rgbCss(pixel) }} aria-hidden />
        <span>
          <RichText text={pick([`pixel $C + T_{\\text{final}}\\cdot$ white`, `像素 $C + T_{\\text{final}}\\cdot$ 白色`])} />
          <span className="ml-1 font-mono">({pixel.map((x) => x.toFixed(2)).join(", ")})</span>
        </span>
        <span className="font-mono">
          Σw = {sum.toFixed(3)} = 1 − T<sub>final</sub> = 1 − {res.tFinal.toFixed(3)}
        </span>
        {fineRes && (
          <span className="font-mono" style={{ color: SKY }}>
            {pick(["coarse + fine", "粗 + 細"])}: ({over(fineRes, BACKGROUND).map((x) => x.toFixed(2)).join(", ")})
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Slider label={["samples $N$", "取樣數 $N$"]} value={n} min={2} max={64} onChange={setN} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <DemoButton onClick={() => move(-0.1, 0)}>←</DemoButton>
        <DemoButton onClick={() => move(0.1, 0)}>→</DemoButton>
        <DemoButton onClick={() => move(0, 0.1)}>↑</DemoButton>
        <DemoButton onClick={() => move(0, -0.1)}>↓</DemoButton>
        <DemoButton onClick={() => turn(0.1)}>{pick(["↺ turn", "↺ 轉向"])}</DemoButton>
        <DemoButton onClick={() => turn(-0.1)}>{pick(["↻ turn", "↻ 轉向"])}</DemoButton>
        <DemoButton onClick={() => setFine((f) => !f)} active={fine}>
          {pick(["fine samples", "細取樣"])}
        </DemoButton>
        <DemoButton
          onClick={() => {
            setCam([-1.4, 0.05]);
            setAngle(0);
            setN(16);
            setFine(false);
          }}
        >
          {pick(["reset", "重設"])}
        </DemoButton>
      </div>
    </div>
  );
}

/** Composite the merged coarse + fine samples (NeRF's fine pass renders with both). */
function fineComposite(o: Vec, d: Vec, ts: number[], far: number) {
  const vals = ts.map((t) => field([o[0] + t * d[0], o[1] + t * d[1]]));
  return renderRay(
    vals.map((v) => v.sigma),
    vals.map((v) => v.colour),
    ts,
    far,
  );
}
