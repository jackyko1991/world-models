/**
 * Picture for Σ = R S Sᵀ Rᵀ (Concepts ▸ 3D scene models ▸ Gaussians): a unit sphere is stretched by S along its own
 * axes (s₁, s₂, s₃), then turned by R into a tilted ellipsoid. Static SVG.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, ArrowDef, GRAY, LIGHT, Note, Sym } from "./GaussiansParts.tsx";

const TILT = -35; // R, in degrees (SVG rotation)

export default function GaussiansCovariance() {
  const { pick } = useLang();
  const cy = 74;
  const th = (TILT * Math.PI) / 180;
  const ax1: [number, number] = [Math.cos(th), Math.sin(th)];
  const ax2: [number, number] = [Math.sin(th), -Math.cos(th)];
  const R0 = 266;
  return (
    <svg
      viewBox="0 20 320 140"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "A unit sphere; S stretches it along its axes to lengths s1, s2, s3, an axis-aligned ellipsoid; R then rotates that ellipsoid into a tilted one, the shape of the covariance Sigma.",
        "一個單位球；S 沿它的軸把它拉伸成長度 s1、s2、s3 的軸對齊橢球；R 再把這個橢球旋轉成傾斜的橢球，也就是共變異數 Σ 的形狀。",
      ])}
    >
      <defs>
        <ArrowDef id="gcov-arrow" color={GRAY} />
      </defs>

      {/* unit sphere */}
      <circle cx={42} cy={cy} r={24} fill="#e5e7eb" stroke={GRAY} strokeWidth={1.5} />
      <ellipse cx={42} cy={cy} rx={24} ry={6.5} fill="none" stroke={GRAY} strokeWidth={0.8} strokeDasharray="3 2" />
      <line x1={42} y1={cy} x2={66} y2={cy} stroke={GRAY} strokeWidth={1} />
      <Sym x={54} y={cy - 6} main="1" size={12} />

      {/* S: stretch along the axes */}
      <line x1={72} y1={cy} x2={100} y2={cy} stroke={GRAY} strokeWidth={1.4} markerEnd="url(#gcov-arrow)" />
      <Sym x={86} y={cy - 8} main="S" anchor="middle" size={15} />
      <ellipse cx={150} cy={cy} rx={44} ry={18} fill={AMBER_FILL} fillOpacity={0.22} stroke={AMBER} strokeWidth={1.5} />
      <ellipse cx={150} cy={cy} rx={44} ry={6} fill="none" stroke={AMBER} strokeWidth={0.8} strokeDasharray="3 2" />
      <line x1={150} y1={cy} x2={194} y2={cy} stroke={AMBER} strokeWidth={1.2} />
      <line x1={150} y1={cy} x2={150} y2={cy - 18} stroke={AMBER} strokeWidth={1.2} />
      <line x1={150} y1={cy} x2={140} y2={cy + 6} stroke={AMBER} strokeWidth={1.2} />
      <Sym x={178} y={cy - 10} main="s" sub="1" fill={AMBER} anchor="middle" />
      <Sym x={146} y={cy - 22} main="s" sub="2" fill={AMBER} anchor="end" />
      <Sym x={130} y={cy + 30} main="s" sub="3" fill={AMBER} anchor="middle" />
      <line x1={136} y1={cy + 17} x2={139} y2={cy + 8} stroke={LIGHT} strokeWidth={0.8} />

      {/* R: rotate */}
      <line x1={200} y1={cy} x2={226} y2={cy} stroke={GRAY} strokeWidth={1.4} markerEnd="url(#gcov-arrow)" />
      <Sym x={212} y={cy - 8} main="R" anchor="middle" size={15} />
      <g transform={`rotate(${TILT} ${R0} ${cy})`}>
        <ellipse cx={R0} cy={cy} rx={44} ry={18} fill={AMBER_FILL} fillOpacity={0.22} stroke={AMBER} strokeWidth={1.5} />
        <ellipse cx={R0} cy={cy} rx={44} ry={6} fill="none" stroke={AMBER} strokeWidth={0.8} strokeDasharray="3 2" />
      </g>
      <line x1={R0 - 34} y1={cy} x2={R0 + 40} y2={cy} stroke={LIGHT} strokeWidth={0.8} strokeDasharray="2 2" />
      <path
        d={`M ${R0 + 28} ${cy} A 28 28 0 0 0 ${R0 + 28 * ax1[0]} ${cy + 28 * ax1[1]}`}
        fill="none"
        stroke={GRAY}
        strokeWidth={1}
      />
      <line x1={R0} y1={cy} x2={R0 + 44 * ax1[0]} y2={cy + 44 * ax1[1]} stroke={AMBER} strokeWidth={1.2} />
      <line x1={R0} y1={cy} x2={R0 + 18 * ax2[0]} y2={cy + 18 * ax2[1]} stroke={AMBER} strokeWidth={1.2} />
      <Sym x={R0 + 46 * ax1[0] + 2} y={cy + 46 * ax1[1] - 2} main="s" sub="1" fill={AMBER} />
      <Sym x={R0 + 22 * ax2[0] - 2} y={cy + 22 * ax2[1]} main="s" sub="2" fill={AMBER} anchor="end" />

      {/* what each stage is */}
      <Note x={42} y={128}>{pick(["unit sphere", "單位球"])}</Note>
      <Note x={150} y={128}>{pick(["stretch along axes", "沿軸伸縮"])}</Note>
      <Note x={266} y={128}>{pick(["then rotate", "再旋轉"])}</Note>
      <Sym x={150} y={150} main="S Sᵀ" anchor="middle" fill={AMBER} />
      <Sym x={266} y={150} main="Σ = R S Sᵀ Rᵀ" anchor="middle" fill={AMBER} />
    </svg>
  );
}
