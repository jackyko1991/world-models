/**
 * Concepts ▸ 3D scene models ▸ toward world models: a Gaussian scene whose means move with time t. Canonical Gaussians
 * plus a deformation field (src/models/splat.ts `dynamicScene`, `deform`), rendered by the same splat renderer.
 * A slider sets t; ▶ plays it (only on request, and not under prefers-reduced-motion); a toggle draws the paths the
 * Gaussians' means follow over the whole clip.
 */
import { useLang } from "@learnkit/web";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deform, dynamicScene, projectPoint, type Camera, type Vec3 } from "../models/splat.ts";
import { DemoButton, Slider } from "../pages/kit.tsx";
import { SplatViewerCanvas } from "./SplatViewerCanvas.tsx";

const BG: Vec3 = [0.95, 0.96, 0.98];
const TARGET: Vec3 = [0, 0.3, 0];
const AMBER = "#b45309";

export default function MovingSplats() {
  const { pick } = useLang();
  const scene = useMemo(() => dynamicScene(3), []);
  const [t, setT] = useState(0.1);
  const [playing, setPlaying] = useState(false);
  const [paths, setPaths] = useState(false);
  const [ellipses, setEllipses] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!playing) return;
    let id = 0, last = performance.now();
    const tick = (now: number) => {
      setT((v) => (v + (now - last) / 6000) % 1); // one clip every 6 s
      last = now;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  const splats = useMemo(() => deform(scene, t), [scene, t]);
  // paths of a sample of means over t ∈ [0, 1], for the overlay
  const tracks = useMemo(() => {
    const ts = Array.from({ length: 49 }, (_, k) => k / 48);
    const frames = ts.map((s) => deform(scene, s));
    const pickIdx = scene.part.map((p, i) => (p !== "floor" && i % 23 === 0 ? i : -1)).filter((i) => i >= 0);
    return pickIdx.map((i) => frames.map((f) => f[i].mean));
  }, [scene]);
  const overlay = useCallback(
    (ctx: CanvasRenderingContext2D, cam: Camera, k: number) => {
      if (!paths) return;
      ctx.strokeStyle = AMBER;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      for (const tr of tracks) {
        ctx.beginPath();
        tr.forEach((p, n) => {
          const [u, v] = projectPoint(cam, p);
          if (n === 0) ctx.moveTo(u * k, v * k);
          else ctx.lineTo(u * k, v * k);
        });
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    [paths, tracks],
  );

  return (
    <div className="w-full space-y-2" data-testid="moving-splats">
      <div className="flex justify-center">
        <SplatViewerCanvas
          splats={splats}
          background={BG}
          target={TARGET}
          fovy={0.8}
          initial={{ az: 0.6, el: 0.45, radius: 3.4 }}
          ellipses={ellipses}
          overlay={overlay}
          label={pick(["A moving Gaussian scene: a bouncing ball, a spinning box and an orbiting moon", "一個會動的高斯場景：彈跳的球、旋轉的方塊與繞行的小月亮"])}
        >
          <DemoButton active={ellipses} onClick={() => setEllipses((e) => !e)}>
            {pick(["Show ellipses", "顯示橢圓"])}
          </DemoButton>
          <DemoButton active={paths} onClick={() => setPaths((p) => !p)}>
            {pick(["Show paths", "顯示軌跡"])}
          </DemoButton>
        </SplatViewerCanvas>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Slider
          label={["Time $t$", "時間 $t$"]}
          value={t}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => {
            setPlaying(false);
            setT(v);
          }}
          format={(v) => v.toFixed(2)}
        />
        {!reduced && <DemoButton onClick={() => setPlaying((p) => !p)}>{playing ? pick(["❚❚ Pause", "❚❚ 暫停"]) : pick(["▶ Play", "▶ 播放"])}</DemoButton>}
      </div>
    </div>
  );
}
