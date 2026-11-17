/**
 * Picture for Σ′ = J W Σ Wᵀ Jᵀ with J = ∂(u, v)/∂(t_x, t_y, t_z) (Skills ▸ rendering ▸ splat): the covariance goes
 * through two linear maps. W re-expresses the ellipsoid in the camera's frame (same shape, new axes); J flattens it
 * onto the image. Below, why J is only an approximation: the projection u = f t_x / t_z is a curve in depth, and J is
 * its tangent at the mean μ. Static SVG.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, ArrowDef, GRAY, LIGHT, Note, SERIF, Sym } from "./GaussiansParts.tsx";

// The inset: u(t_z) = 1 / t_z for t_z in [1, 4], and its tangent at t_z = 2.
const X0 = 192, X1 = 300, Y0 = 176, H = 58;
const gx = (tz: number) => X0 + ((tz - 1) / 3) * (X1 - X0);
const gy = (u: number) => Y0 - H * u;
const TZ = 2;
const tangent = (tz: number) => 1 / TZ - (tz - TZ) / (TZ * TZ);

export default function SplatProjection() {
  const { pick } = useLang();
  const curve = Array.from({ length: 41 }, (_, k) => { const tz = 1 + (3 * k) / 40; return `${gx(tz)},${gy(1 / tz)}`; }).join(" ");
  return (
    <svg
      viewBox="0 6 320 188"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "Three panels. World: a tilted ellipsoid Sigma with the world axes. W: the same ellipsoid in the camera's axes, W Sigma W transpose. J: its flat 2-D footprint on the image, Sigma prime. Below, a graph of the projection u against depth t_z, a curve, with its tangent line at the mean mu marked J.",
        "三格圖。世界：傾斜的橢球 Σ 與世界座標軸。W：同一個橢球改以相機座標軸表示，W Σ Wᵀ。J：它在影像上的扁平二維足跡 Σ′。下方是投影 u 對深度 t_z 的圖，是一條曲線；它在平均 μ 處的切線標為 J。",
      ])}
    >
      <defs>
        <ArrowDef id="sproj-arrow" color={GRAY} />
      </defs>

      {/* world */}
      <g stroke={LIGHT} strokeWidth={1}>
        <line x1={14} y1={100} x2={34} y2={100} markerEnd="url(#sproj-arrow)" />
        <line x1={14} y1={100} x2={14} y2={80} markerEnd="url(#sproj-arrow)" />
        <line x1={14} y1={100} x2={26} y2={90} markerEnd="url(#sproj-arrow)" />
      </g>
      <g transform="rotate(-30 54 58)">
        <ellipse cx={54} cy={58} rx={32} ry={13} fill="#e5e7eb" stroke={GRAY} strokeWidth={1.4} />
        <ellipse cx={54} cy={58} rx={32} ry={5} fill="none" stroke={GRAY} strokeWidth={0.8} strokeDasharray="3 2" />
      </g>
      <Sym x={28} y={36} main="Σ" size={15} />
      <Note x={60} y={120}>{pick(["world", "世界"])}</Note>

      <line x1={96} y1={58} x2={120} y2={58} stroke={GRAY} strokeWidth={1.4} markerEnd="url(#sproj-arrow)" />
      <Sym x={108} y={50} main="W" anchor="middle" size={15} />

      {/* camera frame: same ellipsoid, the camera's axes */}
      <g stroke={GRAY} strokeWidth={1}>
        <line x1={130} y1={100} x2={152} y2={100} markerEnd="url(#sproj-arrow)" />
        <line x1={130} y1={100} x2={130} y2={78} markerEnd="url(#sproj-arrow)" />
      </g>
      <Sym x={156} y={104} main="t" sub="z" size={13} />
      <Sym x={134} y={80} main="t" sub="x" size={13} />
      <g transform="rotate(8 170 58)">
        <ellipse cx={170} cy={58} rx={32} ry={13} fill="#e5e7eb" stroke={GRAY} strokeWidth={1.4} />
        <ellipse cx={170} cy={58} rx={32} ry={5} fill="none" stroke={GRAY} strokeWidth={0.8} strokeDasharray="3 2" />
      </g>
      <text x={170} y={30} fontFamily={SERIF} fontStyle="italic" fontSize={14} fill={GRAY} textAnchor="middle">
        WΣWᵀ
      </text>
      <Note x={150} y={120}>{pick(["camera", "相機"])}</Note>

      <line x1={208} y1={58} x2={232} y2={58} stroke={GRAY} strokeWidth={1.4} markerEnd="url(#sproj-arrow)" />
      <Sym x={220} y={50} main="J" anchor="middle" size={15} fill={AMBER} />

      {/* image: the 2-D footprint */}
      <rect x={238} y={26} width={72} height={66} fill="#ffffff" stroke={GRAY} strokeWidth={1} />
      {[1, 2, 3, 4, 5].map((k) => (
        <g key={k} stroke="#e5e7eb" strokeWidth={0.6}>
          <line x1={238 + 12 * k} y1={26} x2={238 + 12 * k} y2={92} />
          <line x1={238} y1={26 + 11 * k} x2={310} y2={26 + 11 * k} />
        </g>
      ))}
      <ellipse cx={274} cy={59} rx={24} ry={11} transform="rotate(10 274 59)" fill={AMBER_FILL} fillOpacity={0.45} stroke={AMBER} strokeWidth={1.5} />
      <Sym x={274} y={20} main="Σ′" anchor="middle" size={15} fill={AMBER} />
      <Note x={274} y={108}>{pick(["image", "影像"])}</Note>

      {/* why J is an approximation: the divide is a curve, J its tangent */}
      <line x1={X0} y1={Y0} x2={X1 + 6} y2={Y0} stroke={GRAY} strokeWidth={1} markerEnd="url(#sproj-arrow)" />
      <line x1={X0} y1={Y0} x2={X0} y2={gy(1.1)} stroke={GRAY} strokeWidth={1} markerEnd="url(#sproj-arrow)" />
      <Sym x={X1 + 6} y={Y0 + 14} main="t" sub="z" size={13} anchor="middle" />
      <Sym x={X0 - 6} y={gy(0.95)} main="u" size={13} anchor="end" />
      <polyline points={curve} fill="none" stroke={GRAY} strokeWidth={1.4} />
      <line x1={gx(1.3)} y1={gy(tangent(1.3))} x2={gx(3.6)} y2={gy(tangent(3.6))} stroke={AMBER} strokeWidth={1.4} strokeDasharray="4 2" />
      <circle cx={gx(TZ)} cy={gy(1 / TZ)} r={2.5} fill={AMBER} />
      <Sym x={gx(TZ) + 4} y={gy(1 / TZ) - 6} main="μ" size={13} fill={AMBER} />
      <Sym x={gx(3.6) + 4} y={gy(tangent(3.6)) + 4} main="J" size={13} fill={AMBER} />
      <text x={10} y={150} fontSize={12} fill={GRAY}>
        <tspan fontFamily={SERIF} fontStyle="italic">
          u = f t<tspan dy={4} fontSize={11}>x</tspan>
          <tspan dy={-4}> / t</tspan>
          <tspan dy={4} fontSize={11}>z</tspan>
        </tspan>
        <tspan dy={-4}>{pick([": a curve", "：一條曲線"])}</tspan>
      </text>
      <text x={10} y={168} fontSize={12} fill={AMBER}>
        <tspan fontFamily={SERIF} fontStyle="italic">J</tspan>
        {pick([": its tangent at ", "：它在 "])}
        <tspan fontFamily={SERIF} fontStyle="italic">μ</tspan>
        {pick(["", " 的切線"])}
      </text>
    </svg>
  );
}
