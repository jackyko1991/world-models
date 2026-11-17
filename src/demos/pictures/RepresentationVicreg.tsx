/**
 * Concepts ▸ Representation ▸ VICReg variance and covariance terms: a batch of embeddings that has collapsed onto a
 * short diagonal (small spread, the two dimensions copying each other) beside a batch spread out in both dimensions,
 * each with its per-dimension standard deviation bars and the γ threshold. The shaded shortfall below γ is what
 * v(Z) adds up; the tilt of the collapsed cloud is the off-diagonal C₁₂ that c(Z) penalises. Seeded, static points.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, FAINT, GRAY, Note, Sym, normals } from "./RepresentationParts.tsx";

const N = 40;
const SCALE = 17; // px per unit of z in the scatter
const BAR = 26; // px per unit of standard deviation
const GAMMA = 1; // the target standard deviation

function std(v: number[]): number {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
}

const g = normals(7, 3 * N);
const collapsed = Array.from({ length: N }, (_, i) => {
  const u = 0.3 * g[3 * i];
  return [u + 0.06 * g[3 * i + 1], u + 0.06 * g[3 * i + 2]] as const;
});
const spread = Array.from({ length: N }, (_, i) => [1.2 * g[3 * i + 1], 1.2 * g[3 * i + 2]] as const);

function Panel({ ox, pts, title, verdict, cov }: {
  ox: number; pts: readonly (readonly [number, number])[]; title: string; verdict: string; cov: string;
}) {
  const cx = ox + 75, cy = 58;
  const sd = [std(pts.map((p) => p[0])), std(pts.map((p) => p[1]))];
  const base = 160, gy = base - GAMMA * BAR;
  return (
    <g>
      <Note x={cx} y={12} fill={GRAY} size={12}>{title}</Note>
      <rect x={ox + 8} y={18} width={134} height={80} rx={4} fill="white" stroke={FAINT} />
      <line x1={ox + 12} y1={cy} x2={ox + 138} y2={cy} stroke={FAINT} />
      <line x1={cx} y1={22} x2={cx} y2={94} stroke={FAINT} />
      {pts.map(([a, b], i) => (
        <circle
          key={i}
          cx={Math.max(ox + 12, Math.min(ox + 138, cx + SCALE * a))}
          cy={Math.max(22, Math.min(94, cy - SCALE * b))}
          r={2.1}
          fill={AMBER_FILL}
          fillOpacity={0.8}
        />
      ))}
      <Sym x={ox + 138} y={92} main={cov} size={11.5} anchor="end" />

      {/* standard deviation per dimension, and the γ hinge */}
      {sd.map((s, j) => {
        const x = ox + 30 + 26 * j, top = base - s * BAR;
        return (
          <g key={j}>
            {top > gy && (
              <rect x={x} y={gy} width={18} height={top - gy} fill={AMBER_FILL} fillOpacity={0.25} stroke={AMBER} strokeDasharray="2 2" />
            )}
            <rect x={x} y={top} width={18} height={base - top} fill={AMBER} />
            <Sym x={x + 9} y={base + 13} main="z" sub={j === 0 ? "1" : "2"} size={12} anchor="middle" />
          </g>
        );
      })}
      <line x1={ox + 24} y1={base} x2={ox + 86} y2={base} stroke={GRAY} />
      <line x1={ox + 24} y1={gy} x2={ox + 86} y2={gy} stroke={GRAY} strokeDasharray="4 3" />
      <Sym x={ox + 90} y={gy + 4} main="γ" size={13} />
      <Sym x={ox + 104} y={150} main={verdict} size={12} fill={AMBER} />
    </g>
  );
}

export default function RepresentationVicreg() {
  const { pick } = useLang();
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "Left: a collapsed batch of embeddings, a short tilted streak near the origin; its standard deviation bars for z₁ and z₂ fall short of the dashed γ line, and the shaded shortfall is v(Z). The tilt means the two dimensions copy each other, a large C₁₂. Right: a batch spread in both directions; both bars reach γ, so v(Z) is zero, and C₁₂ is near zero.",
        "左：塌縮的一批嵌入，在原點附近擠成一道短短的斜線；z₁ 與 z₂ 的標準差長條都達不到虛線 γ，著色的不足部分就是 v(Z)。斜線表示兩個維度互相複製，C₁₂ 很大。右：往兩個方向都散開的一批嵌入；兩根長條都達到 γ，所以 v(Z) 為零，C₁₂ 也接近零。",
      ])}
    >
      <Panel ox={0} pts={collapsed} title={pick(["collapsed", "塌縮"])} verdict="v > 0" cov={pick(["C₁₂ large", "C₁₂ 很大"])} />
      <Panel ox={166} pts={spread} title={pick(["spread out", "散開"])} verdict="v = 0" cov="C₁₂ ≈ 0" />
      <line x1={160} y1={6} x2={160} y2={174} stroke={FAINT} />
    </svg>
  );
}
