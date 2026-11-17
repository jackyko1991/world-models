/**
 * The latent map of a tiny VAE trained on frames of a ball in a box (public/models/latent-map.json, made by
 * scripts/latent_map.py). `LatentMapExplorer`: a scatter of the encoded frames, coloured by a generating factor; the
 * point under the pointer (drag, click, or arrow keys) is decoded to a frame. `LatentInterpolation`: a strip of frames
 * between two balls, cross-fading pixels against walking the latent line.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { decode, lerpLatent, lerpPixels, nearest, renderFrame, type LatentMapData } from "../models/latentMap.ts";
import { DemoButton } from "../pages/kit.tsx";

const AMBER: [number, number, number] = [180, 83, 9];
const GRAY: [number, number, number] = [55, 65, 81];

let cache: Promise<LatentMapData> | null = null;
/** Load the exported decoder once per page view. */
export function useLatentMap(): LatentMapData | null | "error" {
  const [data, setData] = useState<LatentMapData | null | "error">(null);
  useEffect(() => {
    let live = true;
    cache ??= fetch(`${import.meta.env.BASE_URL}models/latent-map.json`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<LatentMapData>;
    });
    cache.then(
      (d) => live && setData(d),
      () => {
        cache = null;
        if (live) setData("error");
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return data;
}

/** A frame (row-major intensities in [0, 1]) drawn on a small canvas, ink colour on white, scaled up without smoothing. */
function Frame({ frame, size, colour, px = 96, label }: { frame: Float64Array; size: number; colour: [number, number, number]; px?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = Math.min(1, Math.max(0, frame[i]));
      for (let c = 0; c < 3; c++) img.data[4 * i + c] = Math.round(255 + v * (colour[c] - 255));
      img.data[4 * i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [frame, size, colour]);
  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className="rounded border border-gray-300"
      style={{ width: px, height: px, imageRendering: "pixelated" }}
    />
  );
}

function Status({ data }: { data: "error" | null }) {
  const { pick } = useLang();
  return (
    <p className="py-8 text-xs text-gray-500">
      {data === "error" ? pick(["Could not load the model weights.", "無法載入模型權重。"]) : pick(["Loading the decoder…", "正在載入解碼器…"])}
    </p>
  );
}

const LIM = 3; // the map shows z in [-LIM, LIM]²
const VB = 240;
const toSvg = (z: number[]) => [((z[0] + LIM) / (2 * LIM)) * VB, ((LIM - z[1]) / (2 * LIM)) * VB];

/** Sequential light-to-dark sky ramp for a factor value t in [0, 1]. */
const ramp = (t: number) => {
  const a = [186, 230, 253];
  const b = [7, 89, 133];
  return `rgb(${a.map((v, i) => Math.round(v + t * (b[i] - v))).join(",")})`;
};

export function LatentMapExplorer() {
  const data = useLatentMap();
  if (!data || data === "error") return <Status data={data} />;
  return <Explorer data={data} />;
}

function Explorer({ data }: { data: LatentMapData }) {
  const { pick } = useLang();
  const [z, setZ] = useState<[number, number]>([0, 0]);
  const [by, setBy] = useState<"x" | "y">("x");
  const dragging = useRef(false);
  const svg = useRef<SVGSVGElement>(null);
  const { size, radius, layers, points, range } = data;
  const decoded = useMemo(() => decode(layers, z), [layers, z]);
  const near = points[nearest(points, z)];
  const truth = useMemo(() => renderFrame(size, radius, near.x, near.y), [size, radius, near]);

  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = (e.clientY - r.top) / r.height;
    const c = (t: number) => Math.max(-LIM, Math.min(LIM, t));
    setZ([c(-LIM + 2 * LIM * u), c(LIM - 2 * LIM * v)]);
  };
  const onKey = (e: KeyboardEvent) => {
    const d = e.shiftKey ? 0.5 : 0.1;
    const move: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    const m = move[e.key];
    if (!m) return;
    e.preventDefault();
    setZ(([a, b]) => [Math.max(-LIM, Math.min(LIM, a + m[0])), Math.max(-LIM, Math.min(LIM, b + m[1]))]);
  };
  const [cx, cy] = toSvg(z);
  const fmt = (v: number) => (v >= 0 ? " " : "") + v.toFixed(2);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-600">
        <span>{pick(["Colour points by", "點的顏色依據"])}</span>
        <DemoButton active={by === "x"} onClick={() => setBy("x")}>
          {pick(["ball x", "球的 x"])}
        </DemoButton>
        <DemoButton active={by === "y"} onClick={() => setBy("y")}>
          {pick(["ball y", "球的 y"])}
        </DemoButton>
        <DemoButton onClick={() => setZ([0, 0])}>{pick(["Centre", "回到中心"])}</DemoButton>
      </div>
      <div className="flex w-full flex-wrap items-start justify-center gap-4">
        <svg
          ref={svg}
          viewBox={`0 0 ${VB} ${VB}`}
          className="h-auto w-full max-w-[300px] cursor-crosshair touch-none rounded-md border border-gray-300 bg-white focus:outline-2 focus:outline-(--lk-accent)"
          tabIndex={0}
          role="application"
          aria-label={pick([
            "Latent map. Drag or use the arrow keys (Shift for bigger steps) to move the amber cross; its decoded frame is shown beside it.",
            "潛在地圖。拖動或用方向鍵（按住 Shift 走大步）移動琥珀色十字，旁邊顯示它解碼出的畫面。",
          ])}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => dragging.current && fromPointer(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          {/* the prior's 1σ and 2σ circles */}
          {[1, 2].map((s) => (
            <circle key={s} cx={VB / 2} cy={VB / 2} r={(s / (2 * LIM)) * VB} className="fill-none stroke-gray-200" strokeDasharray="3 3" />
          ))}
          <line x1={0} y1={VB / 2} x2={VB} y2={VB / 2} className="stroke-gray-200" />
          <line x1={VB / 2} y1={0} x2={VB / 2} y2={VB} className="stroke-gray-200" />
          {points.map((p, i) => {
            const [x, y] = toSvg(p.z);
            const t = ((by === "x" ? p.x : p.y) - range[0]) / (range[1] - range[0]);
            return <circle key={i} cx={x} cy={y} r={2.6} fill={ramp(t)} />;
          })}
          <g className="pointer-events-none stroke-(--lk-accent)" strokeWidth={2}>
            <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} />
            <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} />
            <circle cx={cx} cy={cy} r={4} className="fill-none" />
          </g>
          <text x={VB - 4} y={VB / 2 - 4} textAnchor="end" className="fill-gray-400 text-[9px]">
            z₁
          </text>
          <text x={VB / 2 + 4} y={10} className="fill-gray-400 text-[9px]">
            z₂
          </text>
        </svg>
        <div className="flex flex-col items-center gap-2 text-xs text-gray-600">
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <Frame frame={decoded} size={size} colour={AMBER} label={pick(["Decoded frame", "解碼出的畫面"])} />
              <span className="text-(--lk-accent)">{pick(["decoded", "解碼結果"])}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Frame frame={truth} size={size} colour={GRAY} label={pick(["Nearest real frame", "最近的真實畫面"])} />
              <span className="text-gray-700">{pick(["nearest real frame", "最近的真實畫面"])}</span>
            </div>
          </div>
          <p className="font-mono tabular-nums whitespace-pre">
            z = ({fmt(z[0])}, {fmt(z[1])})
          </p>
          <p className="flex items-center gap-1">
            <span>{pick([`ball ${by} =`, `球的 ${by} =`])}</span>
            <span className="text-[10px]">{range[0]}</span>
            <span className="inline-block h-2 w-16 rounded" style={{ background: `linear-gradient(to right, ${ramp(0)}, ${ramp(1)})` }} />
            <span className="text-[10px]">{range[1]}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

const STRIP = 7;

/** Pixel against latent interpolation between two frames, in STRIP steps. */
export function LatentInterpolation() {
  const data = useLatentMap();
  if (!data || data === "error") return <Status data={data} />;
  return <Interpolation data={data} />;
}

function Interpolation({ data }: { data: LatentMapData }) {
  const { pick } = useLang();
  const { size, radius, layers, points } = data;
  // pairs of exported frames far apart: the corners and the sides of the box
  const pairs = useMemo(() => {
    const pick2 = (f: (p: (typeof points)[number]) => number) => [points.reduce((m, p) => (f(p) < f(m) ? p : m)), points.reduce((m, p) => (f(p) > f(m) ? p : m))];
    return [pick2((p) => p.x + p.y), pick2((p) => p.x - 0.2 * Math.abs(p.y - 8)), pick2((p) => p.x - p.y), pick2((p) => p.y - 0.2 * Math.abs(p.x - 8))];
  }, [points]);
  const [k, setK] = useState(0);
  const [a, b] = pairs[k];
  const rows = useMemo(() => {
    const fa = renderFrame(size, radius, a.x, a.y);
    const fb = renderFrame(size, radius, b.x, b.y);
    const ts = Array.from({ length: STRIP }, (_, i) => i / (STRIP - 1));
    return {
      pixels: ts.map((t) => lerpPixels(fa, fb, t)),
      latent: ts.map((t) => lerpLatent(layers, a.z, b.z, t)),
    };
  }, [a, b, layers, size, radius]);
  const row = (frames: Float64Array[], colour: [number, number, number], name: string) => (
    <div className="flex flex-wrap justify-center gap-1">
      {frames.map((f, i) => (
        <Frame key={i} frame={f} size={size} colour={colour} px={40} label={`${name} ${i + 1}/${STRIP}`} />
      ))}
    </div>
  );
  return (
    <div className="flex w-full flex-col items-center gap-2 text-xs">
      <div className="flex items-center gap-2">
        <DemoButton onClick={() => setK((k + 1) % pairs.length)}>{pick(["Another pair", "換一對"])}</DemoButton>
        <span className="text-gray-500">
          {k + 1}/{pairs.length}
        </span>
      </div>
      <p className="font-medium text-gray-700">{pick(["Interpolate pixels: (1 − t)·A + t·B", "在像素上內插：(1 − t)·A + t·B"])}</p>
      {row(rows.pixels, GRAY, pick(["pixel interpolation", "像素內插"]))}
      <p className="font-medium text-(--lk-accent)">{pick(["Interpolate latents: decode((1 − t)·z_A + t·z_B)", "在潛在空間內插：decode((1 − t)·z_A + t·z_B)"])}</p>
      {row(rows.latent, AMBER, pick(["latent interpolation", "潛在內插"]))}
    </div>
  );
}
