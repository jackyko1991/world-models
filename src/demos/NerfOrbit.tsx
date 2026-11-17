/**
 * A tiny NeRF, orbited (Concepts ▸ 3D scene models ▸ NeRF). The weights (public/models/tiny-nerf.json, about 11k
 * parameters, trained offline by scripts/tiny_nerf.py) run in plain TypeScript (src/models/nerfTiny.ts): every pixel
 * marches a ray through the network and the volume-rendering sum. A coarse preview appears at once, then full rows
 * are rendered a few at a time per animation frame so the page stays responsive. A dial shows where the training
 * cameras were.
 */
import { RichText, useLang } from "@learnkit/web";
import { useEffect, useRef, useState } from "react";
import { DemoButton, Slider } from "../pages/kit.tsx";
import { loadNerf, parameterCount, renderRows, type TinyNerf, type TinyNerfData } from "../models/nerfTiny.ts";
import { orbitCamera } from "../models/volumeRender.ts";

const AMBER = "#b45309";
const GRAY = "#374151";
const PREVIEW = 12; // coarse preview size (pixels)
const BUDGET_MS = 10; // work per animation frame

export default function NerfOrbit() {
  const { pick } = useLang();
  const [data, setData] = useState<TinyNerfData | null>(null);
  const [failed, setFailed] = useState(false);
  const [az, setAz] = useState(30);
  const [el, setEl] = useState(30);
  const [spinning, setSpinning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ms, setMs] = useState<number | null>(null);
  const model = useRef<TinyNerf | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    fetch(`${import.meta.env.BASE_URL}models/tiny-nerf.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: TinyNerfData) => {
        if (!live) return;
        model.current = loadNerf(d);
        setData(d);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  // render the current view: a coarse preview, then full rows across animation frames
  useEffect(() => {
    const m = model.current;
    const cv = canvas.current;
    if (!m || !data || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = data.render.size;
    const { fov, radius } = data.render;
    const a = (az * Math.PI) / 180;
    const e = (el * Math.PI) / 180;

    const small = orbitCamera(PREVIEW, fov, radius, a, e);
    const prev = new ImageData(PREVIEW, PREVIEW);
    renderRows(m, small, 0, PREVIEW, prev.data);
    const off = document.createElement("canvas");
    off.width = off.height = PREVIEW;
    off.getContext("2d")?.putImageData(prev, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, size, size);

    const cam = orbitCamera(size, fov, radius, a, e);
    const img = new ImageData(size, size);
    let row = 0;
    let raf = 0;
    const t0 = performance.now();
    setProgress(0);
    const work = () => {
      const start = performance.now();
      const first = row;
      while (row < size && performance.now() - start < BUDGET_MS) {
        renderRows(m, cam, row, row + 1, img.data);
        row++;
      }
      ctx.putImageData(img, 0, 0, 0, first, size, row - first);
      setProgress(row / size);
      if (row < size) raf = requestAnimationFrame(work);
      else setMs(performance.now() - t0);
    };
    raf = requestAnimationFrame(work);
    return () => cancelAnimationFrame(raf);
  }, [data, az, el]);

  // spin on request: step the azimuth once each frame is finished
  useEffect(() => {
    if (!spinning || progress < 1) return;
    const id = window.setTimeout(() => setAz((x) => (x + 10) % 360), 60);
    return () => window.clearTimeout(id);
  }, [spinning, progress]);

  if (failed) return <p className="text-xs text-gray-500">{pick(["Could not load the network weights.", "無法載入網路權重。"])}</p>;

  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const size = data?.render.size ?? 48;
  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-3 sm:flex-row sm:items-start">
      <div className="space-y-1">
        <canvas
          ref={canvas}
          width={size}
          height={size}
          className="h-auto w-[240px] rounded border border-gray-200 bg-white sm:w-[264px]"
          style={{ imageRendering: "pixelated" }}
          role="img"
          aria-label={pick(["The tiny NeRF's rendering of the scene from the chosen viewpoint", "極小 NeRF 從所選視角渲染的場景"])}
        />
        <div className="h-1 w-[240px] rounded bg-gray-100 sm:w-[264px]">
          <div className="h-1 rounded" style={{ width: `${Math.round(progress * 100)}%`, background: AMBER }} />
        </div>
        {!data && <p className="text-xs text-gray-500">{pick(["Loading weights…", "正在載入權重……"])}</p>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {data && <Dial data={data} az={az} el={el} />}
        <Slider label={["azimuth", "方位角"]} value={az} min={0} max={355} step={5} onChange={setAz} format={(v) => `${v}°`} />
        <Slider label={["elevation", "仰角"]} value={el} min={5} max={70} step={5} onChange={setEl} format={(v) => `${v}°`} />
        <div className="flex flex-wrap gap-1.5">
          <DemoButton onClick={() => setAz((x) => (x + 345) % 360)}>{pick(["◀ orbit", "◀ 環繞"])}</DemoButton>
          <DemoButton onClick={() => setAz((x) => (x + 15) % 360)}>{pick(["orbit ▶", "環繞 ▶"])}</DemoButton>
          {!reduce && (
            <DemoButton onClick={() => setSpinning((s) => !s)} active={spinning}>
              {spinning ? pick(["❚❚ stop", "❚❚ 停止"]) : pick(["▶ spin", "▶ 旋轉"])}
            </DemoButton>
          )}
        </div>
        {data && model.current && (
          <p className="text-[11px] text-gray-500">
            <RichText
              text={pick([
                `${size}×${size} px, ${data.render.samples} samples per ray, ${parameterCount(model.current).toLocaleString("en")} parameters${ms !== null ? `; last frame ${Math.round(ms)} ms` : ""}. Held-out views: PSNR ${Math.min(...data.training.heldOutPsnr).toFixed(1)}–${Math.max(...data.training.heldOutPsnr).toFixed(1)} dB.`,
                `${size}×${size} 像素，每條光線 ${data.render.samples} 個取樣點，${parameterCount(model.current).toLocaleString("en")} 個參數${ms !== null ? `；上一幀 ${Math.round(ms)} 毫秒` : ""}。未參與訓練的視角：PSNR ${Math.min(...data.training.heldOutPsnr).toFixed(1)}–${Math.max(...data.training.heldOutPsnr).toFixed(1)} dB。`,
              ])}
            />
          </p>
        )}
      </div>
    </div>
  );
}

/** Top-down dial: training cameras (gray) by azimuth and elevation, and the current camera (amber). */
function Dial({ data, az, el }: { data: TinyNerfData; az: number; el: number }) {
  const { pick } = useLang();
  const R = 50;
  const pos = (a: number, e: number): [number, number] => {
    const r = R * Math.cos(e); // looking down: high cameras sit nearer the centre
    return [60 + r * Math.sin(a), 60 + r * Math.cos(a)];
  };
  const [cx, cy] = pos((az * Math.PI) / 180, (el * Math.PI) / 180);
  return (
    <svg viewBox="0 0 120 120" className="h-auto w-28" role="img" aria-label={pick(["Training cameras seen from above, and the current camera", "從上方看的訓練相機位置，以及目前的相機"])}>
      <circle cx={60} cy={60} r={R} fill="none" stroke="#e5e7eb" />
      <rect x={52} y={52} width={16} height={16} fill="#f3f4f6" stroke="#d1d5db" />
      {data.training.trainViews.map(([a, e], i) => {
        const [x, y] = pos(a, e);
        return <circle key={i} cx={x} cy={y} r={2} fill={GRAY} opacity={0.55} />;
      })}
      <circle cx={cx} cy={cy} r={4.5} fill={AMBER} />
      <line x1={cx} y1={cy} x2={60} y2={60} stroke={AMBER} strokeWidth={1} strokeDasharray="2 2" />
    </svg>
  );
}
