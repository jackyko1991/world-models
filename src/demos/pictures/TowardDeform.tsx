/**
 * Picture for the 4D-GS deformation μ(t) = μ₀ + Δμ, q(t) = Δq ⊗ q₀, s(t) = s₀ + Δs (Concepts ▸ 3D scene models ▸
 * toward world models): three canonical Gaussians (gray, dashed, t = 0) and where the deformation puts them at two
 * later times (amber): one slides along a short path (μ), one also turns (q), one also stretches (s). Static SVG.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, ArrowDef, GRAY, LIGHT, Note, SERIF, Sym } from "./GaussiansParts.tsx";

type Pose = { x: number; y: number; deg: number; rx: number; ry: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** A quadratic Bézier from p0 through control c to p1. */
const bez = (p0: number[], c: number[], p1: number[], t: number) =>
  [0, 1].map((k) => (1 - t) * (1 - t) * p0[k] + 2 * (1 - t) * t * c[k] + t * t * p1[k]);

// Each Gaussian's hand-written deformation, t ∈ [0, 1].
const GAUSSIANS: { pose: (t: number) => Pose }[] = [
  { pose: (t) => { const [x, y] = bez([48, 78], [70, 30], [128, 44], t); return { x, y, deg: 20, rx: 17, ry: 9 }; } },
  { pose: (t) => { const [x, y] = bez([132, 128], [170, 140], [212, 106], t); return { x, y, deg: lerp(0, 75, t), rx: 19, ry: 7 }; } },
  { pose: (t) => { const [x, y] = bez([262, 38], [238, 80], [270, 124], t); return { x, y, deg: 0, rx: lerp(9, 24, t), ry: lerp(9, 6, t) }; } },
];
const TIMES = [0, 0.5, 1];

export default function TowardDeform() {
  const { pick } = useLang();
  const ell = (p: Pose, key: string, t: number) => (
    <ellipse
      key={key}
      cx={p.x}
      cy={p.y}
      rx={p.rx}
      ry={p.ry}
      transform={`rotate(${p.deg} ${p.x} ${p.y})`}
      fill={t === 0 ? "#e5e7eb" : AMBER_FILL}
      fillOpacity={t === 0 ? 0.7 : t < 1 ? 0.2 : 0.45}
      stroke={t === 0 ? GRAY : AMBER}
      strokeOpacity={t === 0 || t === 1 ? 1 : 0.55}
      strokeWidth={1.3}
      strokeDasharray={t === 0 ? "3 2" : undefined}
    />
  );
  const a0 = GAUSSIANS[0].pose(0), a1 = GAUSSIANS[0].pose(1);
  const b1 = GAUSSIANS[1].pose(1), c1 = GAUSSIANS[2].pose(1);
  return (
    <svg
      viewBox="0 8 320 174"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "Three canonical Gaussians at time 0, drawn dashed in gray, and the same Gaussians at two later times in amber. The first slides along a short curved path from mu0 to mu(t); the second slides and turns, q(t); the third slides and stretches, s(t). A time axis below marks 0, t1 and t2.",
        "三個時間 0 的標準高斯（灰色虛線），以及同一批高斯在兩個較晚時刻的位置（琥珀色）。第一個沿短弧線從 μ0 滑到 μ(t)；第二個邊滑邊轉，q(t)；第三個邊滑邊伸長，s(t)。下方的時間軸標出 0、t1、t2。",
      ])}
    >
      <defs>
        <ArrowDef id="tdef-arrow" color={GRAY} />
      </defs>

      {/* the paths the means follow */}
      {GAUSSIANS.map((g, i) => (
        <polyline
          key={i}
          points={Array.from({ length: 21 }, (_, k) => { const p = g.pose(k / 20); return `${p.x},${p.y}`; }).join(" ")}
          fill="none"
          stroke={LIGHT}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}
      {GAUSSIANS.map((g, i) => TIMES.map((t) => ell(g.pose(t), `${i}-${t}`, t)))}
      {GAUSSIANS.map((g, i) => TIMES.map((t) => {
        const p = g.pose(t);
        return <circle key={`${i}-${t}-c`} cx={p.x} cy={p.y} r={1.8} fill={t === 0 ? GRAY : AMBER} />;
      }))}

      {/* Δμ: straight from μ₀ to μ(t) */}
      <line x1={a0.x} y1={a0.y} x2={a1.x - 4} y2={a1.y + 1} stroke={GRAY} strokeWidth={1.1} markerEnd="url(#tdef-arrow)" />
      <Sym x={96} y={78} main="Δμ" size={13} />
      <Sym x={a0.x - 4} y={a0.y + 22} main="μ" sub="0" anchor="middle" />
      <Sym x={a1.x + 4} y={a1.y - 14} main="μ(t)" fill={AMBER} anchor="middle" />
      <Sym x={b1.x + 12} y={b1.y + 26} main="q(t)" fill={AMBER} />
      <Sym x={c1.x + 8} y={c1.y - 14} main="s(t)" fill={AMBER} anchor="middle" />

      {/* time */}
      <line x1={40} y1={164} x2={292} y2={164} stroke={GRAY} strokeWidth={1} markerEnd="url(#tdef-arrow)" />
      {[
        { x: 60, label: "0", colour: GRAY },
        { x: 150, label: "1", colour: AMBER },
        { x: 240, label: "2", colour: AMBER },
      ].map((tick, i) => (
        <g key={tick.label}>
          <line x1={tick.x} y1={159} x2={tick.x} y2={169} stroke={tick.colour} strokeWidth={1.5} />
          <text x={tick.x} y={153} fontFamily={SERIF} fontStyle="italic" fontSize={13} fill={tick.colour} textAnchor="middle">
            {i === 0 ? "t = 0" : <>t<tspan dy={4} fontSize={11}>{tick.label}</tspan></>}
          </text>
        </g>
      ))}
      <Sym x={300} y={168} main="t" />
      <Note x={60} y={180}>{pick(["canonical", "標準"])}</Note>
    </svg>
  );
}
