/**
 * Coding Skills ▸ Rays and splats ▸ projecting a Gaussian: one 3-D Gaussian in front of a pinhole camera. Gray dots are
 * samples of the Gaussian pushed through the real perspective projection (the truth); the amber ellipses are the EWA
 * prediction Σ' = J W Σ Wᵀ Jᵀ at 1σ and 2σ (src/models/splat.ts). Near the camera or far off-axis the projection
 * bends and the linear approximation starts to miss.
 */
import { RichText, useLang } from "@learnkit/web";
import { useMemo, useState } from "react";
import { gaussian, rng } from "../models/rng.ts";
import { covariance3D, ellipseAxes, perspectiveJacobian, projectCovariance, projectPoint, quatToRot, toCamera, type Camera, type Quat, type Vec3 } from "../models/splat.ts";
import { Slider } from "../pages/kit.tsx";

const CAM: Camera = { pos: [0, 0, 0], W: [1, 0, 0, 0, 1, 0, 0, 0, 1], fx: 120, fy: 120, cx: 120, cy: 90, width: 240, height: 180, near: 0.05 };
const AMBER = "#b45309";
const SAMPLES = (() => {
  const r = rng(42);
  return Array.from({ length: 500 }, () => [gaussian(r), gaussian(r), gaussian(r)]);
})();

export default function SplatViewerSingle() {
  const { pick } = useLang();
  const [x, setX] = useState(0.3);
  const [z, setZ] = useState(2);
  const [len, setLen] = useState(0.3);
  const [yaw, setYaw] = useState(40);

  const { mean, cov, dots, J } = useMemo(() => {
    const mean: Vec3 = [x, 0.1, z];
    const a = (yaw * Math.PI) / 180;
    const q: Quat = [Math.cos(a / 2), 0, Math.sin(a / 2), 0];
    const s: Vec3 = [len, 0.06, 0.06];
    const R = quatToRot(q);
    const dots = SAMPLES.flatMap((n) => {
      const p: Vec3 = [0, 1, 2].map((i) => mean[i] + R[3 * i] * s[0] * n[0] + R[3 * i + 1] * s[1] * n[1] + R[3 * i + 2] * s[2] * n[2]) as Vec3;
      return p[2] > CAM.near ? [projectPoint(CAM, p)] : [];
    });
    return { mean, cov: projectCovariance(CAM, mean, covariance3D(q, s), 0), dots, J: perspectiveJacobian(toCamera(CAM, mean), CAM.fx, CAM.fy) };
  }, [x, z, len, yaw]);
  const [u, v] = projectPoint(CAM, mean);
  const e1 = ellipseAxes(cov, 1), e2 = ellipseAxes(cov, 2);
  const deg = (e1.angle * 180) / Math.PI;
  const f = (n: number) => n.toFixed(1);

  return (
    <div className="w-full space-y-2" data-testid="splat-single">
      <svg viewBox="0 0 240 180" className="mx-auto h-auto w-full max-w-[420px] rounded border border-gray-300 bg-white" role="img" aria-label={pick(["Samples of a 3-D Gaussian projected to the screen, with the EWA ellipses", "投影到螢幕上的三維高斯樣本，以及 EWA 橢圓"])}>
        <path d="M120 0V180M0 90H240" stroke="#e5e7eb" />
        {dots.map(([a, b], i) => (
          <circle key={i} cx={a} cy={b} r={0.9} fill="#374151" opacity={0.45} />
        ))}
        <g transform={`rotate(${deg} ${u} ${v})`}>
          <ellipse cx={u} cy={v} rx={e1.rx} ry={e1.ry} fill="none" stroke={AMBER} strokeWidth={1.4} />
          <ellipse cx={u} cy={v} rx={e2.rx} ry={e2.ry} fill="none" stroke={AMBER} strokeWidth={1} strokeDasharray="3 2" />
        </g>
        <circle cx={u} cy={v} r={2} fill={AMBER} />
        <text x={6} y={14} fontSize={9} fill="#374151">{pick(["gray: samples, truly projected", "灰：真實投影的樣本"])}</text>
        <text x={6} y={26} fontSize={9} fill={AMBER}>{pick(["amber: EWA ellipse, 1σ and 2σ", "琥珀：EWA 橢圓，1σ 與 2σ"])}</text>
      </svg>
      <div className="flex flex-col items-center gap-1">
        <Slider label={["Sideways $x$", "橫向 $x$"]} value={x} min={-1.4} max={1.4} step={0.05} onChange={setX} format={(n) => n.toFixed(2)} />
        <Slider label={["Depth $z$", "深度 $z$"]} value={z} min={0.5} max={4} step={0.05} onChange={setZ} format={(n) => n.toFixed(2)} />
        <Slider label={["Long scale $s_1$", "長軸尺度 $s_1$"]} value={len} min={0.05} max={0.6} step={0.01} onChange={setLen} format={(n) => n.toFixed(2)} />
        <Slider label={["Yaw", "偏航角"]} value={yaw} min={0} max={180} step={1} onChange={setYaw} format={(n) => `${n}°`} />
      </div>
      <p className="overflow-x-auto text-center text-xs text-gray-700">
        <RichText
          text={`$J = \\begin{pmatrix} ${f(J[0])} & 0 & ${f(J[2])} \\\\ 0 & ${f(J[4])} & ${f(J[5])} \\end{pmatrix},\\quad \\Sigma' = \\begin{pmatrix} ${f(cov[0])} & ${f(cov[1])} \\\\ ${f(cov[1])} & ${f(cov[2])} \\end{pmatrix}\\ \\text{px}^2$`}
        />
      </p>
    </div>
  );
}
