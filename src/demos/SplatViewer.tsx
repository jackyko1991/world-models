/**
 * Concepts ▸ 3D scene models ▸ Gaussian splatting, demo (b): a small 3DGS scene fitted offline by scripts/splat3d.py
 * (public/models/splat3d.json + .bin), rendered in the browser by src/models/splat.ts, orbitable, with a toggle that
 * outlines every Gaussian.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useState } from "react";
import { decodeSplats, type Splat3D, type Vec3 } from "../models/splat.ts";
import { DemoButton } from "../pages/kit.tsx";
import { SplatViewerCanvas } from "./SplatViewerCanvas.tsx";

interface Meta {
  count: number;
  background: Vec3;
  target: Vec3;
  radius: number;
  fovy: number;
  blur: number;
  train: { views: number; resolution: number; iterations: number };
  heldOut: { psnrInit: number; psnr: number };
}

export interface Scene {
  meta: Meta;
  splats: Splat3D[];
}

/** Load the fitted scene once. */
export function useSplatScene(): Scene | "error" | null {
  const [scene, setScene] = useState<Scene | "error" | null>(null);
  useEffect(() => {
    let live = true;
    const base = import.meta.env.BASE_URL;
    Promise.all([fetch(`${base}models/splat3d.json`).then((r) => r.json()), fetch(`${base}models/splat3d.bin`).then((r) => r.arrayBuffer())])
      .then(([meta, buf]) => live && setScene({ meta, splats: decodeSplats(new Float32Array(buf)) }))
      .catch(() => live && setScene("error"));
    return () => {
      live = false;
    };
  }, []);
  return scene;
}

export default function SplatViewer() {
  const { pick } = useLang();
  const scene = useSplatScene();
  const [ellipses, setEllipses] = useState(false);
  if (scene === null) return <p className="py-8 text-xs text-gray-500">{pick(["Loading the splat scene…", "正在載入潑濺場景…"])}</p>;
  if (scene === "error") return <p className="py-8 text-xs text-amber-800">{pick(["Could not load public/models/splat3d.bin.", "無法載入 public/models/splat3d.bin。"])}</p>;
  const { meta, splats } = scene;
  return (
    <div className="w-full space-y-2" data-testid="splat-viewer">
      <div className="flex justify-center">
        <SplatViewerCanvas
          splats={splats}
          background={meta.background}
          target={meta.target}
          fovy={meta.fovy}
          blur={meta.blur}
          initial={{ az: 0.9, el: 0.5, radius: meta.radius }}
          ellipses={ellipses}
          label={pick([
            "A Gaussian-splat scene: a chequered floor, a red sphere, a blue box and a yellow cylinder",
            "高斯潑濺場景：棋盤格地板、紅色球體、藍色方塊與黃色圓柱",
          ])}
        >
          <DemoButton active={ellipses} onClick={() => setEllipses((e) => !e)}>
            {pick(["Show ellipses", "顯示橢圓"])}
          </DemoButton>
        </SplatViewerCanvas>
      </div>
      <p className="text-center text-xs text-gray-600">
        {pick([
          `${meta.count} Gaussians · fitted to ${meta.train.views} ray-traced views at ${meta.train.resolution}×${meta.train.resolution} · held-out view PSNR ${meta.heldOut.psnrInit} dB at initialisation → ${meta.heldOut.psnr} dB after fitting`,
          `${meta.count} 個高斯 · 擬合 ${meta.train.views} 張 ${meta.train.resolution}×${meta.train.resolution} 的光線追蹤視圖 · 保留視角 PSNR：初始化 ${meta.heldOut.psnrInit} dB → 擬合後 ${meta.heldOut.psnr} dB`,
        ])}
      </p>
    </div>
  );
}
