/**
 * From pixels to rays (Coding Skills ▸ Rays and splats): a pinhole camera seen from above, an image row of W pixels
 * on the plane z = −1 (in units of the focal length f), and one ray through each pixel centre. The reader sets f
 * and picks a pixel; the numbers are cameraRay() from src/models/volumeRender.ts, with the camera at the origin.
 */
import { RichText, useLang } from "@learnkit/web";
import { useState } from "react";
import { DemoButton, Slider } from "../pages/kit.tsx";
import { cameraRay, type Camera } from "../models/volumeRender.ts";

const AMBER = "#b45309";
const GRAY = "#374151";
const PIX = 8;

export default function PixelRays() {
  const { pick } = useLang();
  const [focal, setFocal] = useState(8);
  const [i, setI] = useState(5);
  // a camera at the origin looking down −z: right = x, up = y, back = z
  const cam: Camera = { width: PIX, height: 1, focal, right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1], origin: [0, 0, 0] };
  const fov = (2 * Math.atan(PIX / 2 / focal) * 180) / Math.PI;

  // drawing: camera at (W/2, H − 20), looking up the screen; 1 unit of camera z = `zs` px
  const W = 360;
  const H = 230;
  const ox = W / 2;
  const oy = H - 20;
  const zs = 60; // image plane drawn at z = −1
  const len = 190;
  const xPlane = (k: number) => ((k + 0.5 - PIX / 2) / focal) * zs; // pixel centre, in px from the axis
  const ray = cameraRay(cam, i, 0);
  const x = (i + 0.5 - PIX / 2) / focal;

  return (
    <div className="w-full max-w-[420px] space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded border border-gray-200 bg-white" role="img" aria-label={pick(["A pinhole camera from above with one ray per pixel", "從上方看的針孔相機，每個像素一條光線"])}>
        {Array.from({ length: PIX }, (_, k) => {
          const r = cameraRay(cam, k, 0).d;
          const sel = k === i;
          return (
            <g key={k}>
              <line x1={ox} y1={oy} x2={ox + r[0] * len} y2={oy + r[2] * len} stroke={sel ? AMBER : "#d1d5db"} strokeWidth={sel ? 2 : 1} />
              <rect
                x={ox + ((k - PIX / 2) / focal) * zs}
                y={oy - zs - 4}
                width={zs / focal}
                height={8}
                fill={sel ? AMBER : "#f3f4f6"}
                stroke={GRAY}
                strokeWidth={0.6}
                onClick={() => setI(k)}
                style={{ cursor: "pointer" }}
              />
              <circle cx={ox + xPlane(k)} cy={oy - zs} r={1.5} fill={GRAY} />
            </g>
          );
        })}
        <circle cx={ox} cy={oy} r={4} fill={GRAY} />
        <line x1={ox} y1={oy} x2={ox} y2={oy - zs} stroke={GRAY} strokeDasharray="3 3" />
        <text x={ox + 6} y={oy - zs / 2} fontSize={10} fill={GRAY}>z = −1</text>
        <text x={ox + 8} y={oy + 4} fontSize={10} fill={GRAY}>{pick(["camera centre", "相機中心"])}</text>
        <text x={8} y={14} fontSize={10} fill="#6b7280">{pick([`field of view ${fov.toFixed(1)}°`, `視野 ${fov.toFixed(1)}°`])}</text>
      </svg>
      <p className="font-mono text-xs text-gray-700">
        i = {i}: x = (i + ½ − W/2) / f = {x.toFixed(3)} → d = ({ray.d[0].toFixed(3)}, {ray.d[1].toFixed(3)}, {ray.d[2].toFixed(3)})
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Slider label={["focal length $f$ (px)", "焦距 $f$（像素）"]} value={focal} min={3} max={20} onChange={setFocal} />
        <DemoButton onClick={() => setI((k) => Math.max(0, k - 1))}>{pick(["◀ pixel", "◀ 像素"])}</DemoButton>
        <DemoButton onClick={() => setI((k) => Math.min(PIX - 1, k + 1))}>{pick(["pixel ▶", "像素 ▶"])}</DemoButton>
      </div>
      <p className="text-[11px] text-gray-500">
        <RichText text={pick([`One image row of $W = ${PIX}$ pixels, seen from above; the $y$ coordinate works the same way.`, `從上方看一列 $W = ${PIX}$ 個像素；$y$ 座標的做法相同。`])} />
      </p>
    </div>
  );
}
