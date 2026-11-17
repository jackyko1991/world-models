/**
 * Concepts ▸ Representation ▸ JEPA energy E(x, y) = D(s_y, Pred(s_x, z)): two views of a tree in the wind (now x,
 * later y, with the leaves in different places), two encoders, and in representation space the context point s_x,
 * the predictor (with the latent z) landing on ŝ_y, the target s_y, and the distance D between them. A drawing.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, ArrowDef, FAINT, GRAY, LIGHT, Note, Sym, normals } from "./RepresentationParts.tsx";

/** A tree: a trunk that does not move, and leaves scattered by `seed` (they are what cannot be predicted). */
function Tree({ x, y, seed }: { x: number; y: number; seed: number }) {
  const n = normals(seed, 24);
  return (
    <g>
      <rect x={x} y={y} width={48} height={40} rx={3} fill="white" stroke={GRAY} strokeWidth={1.4} />
      <rect x={x + 22} y={y + 18} width={4} height={18} fill={GRAY} />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={x + 24 + 7 * n[2 * i]} cy={y + 15 + 4 * n[2 * i + 1]} r={2.6} fill="#9ca3af" />
      ))}
    </g>
  );
}

export default function RepresentationJepa() {
  const { pick } = useLang();
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "Two views of a tree: x now and y a moment later, with the leaves in different places. Each goes through an encoder to a point in representation space, s_x and s_y. From s_x the predictor, also given a latent z, lands on a predicted point ŝ_y; the dashed distance D between ŝ_y and s_y is the energy E.",
        "一棵樹的兩個畫面：現在的 x 與稍後的 y，葉子位置不同。兩者各自經過編碼器，成為表示空間中的點 s_x 與 s_y。預測器從 s_x 出發，加上潛在變數 z，落在預測點 ŝ_y；ŝ_y 與 s_y 之間的虛線距離 D 就是能量 E。",
      ])}
    >
      <defs>
        <ArrowDef id="jepa-gray" color={GRAY} />
        <ArrowDef id="jepa-amber" color={AMBER} />
      </defs>

      {/* the two views */}
      <Sym x={32} y={16} main="x" anchor="middle" />
      <Tree x={8} y={22} seed={3} />
      <Sym x={32} y={108} main="y" anchor="middle" />
      <Tree x={8} y={114} seed={11} />

      {/* encoders */}
      <polygon points="62,28 90,36 90,52 62,60" fill="#f3f4f6" stroke={LIGHT} />
      <polygon points="62,120 90,128 90,144 62,152" fill="#f3f4f6" stroke={LIGHT} />
      <Note x={76} y={90} size={11}>Enc</Note>

      {/* representation space */}
      <rect x={100} y={8} width={214} height={166} rx={6} fill="white" stroke={FAINT} strokeDasharray="4 3" />
      <Note x={306} y={22} anchor="end" size={11}>{pick(["representation space", "表示空間"])}</Note>

      {/* s_x and the predictor */}
      <line x1={90} y1={44} x2={113} y2={56} stroke={GRAY} strokeWidth={1.2} markerEnd="url(#jepa-gray)" />
      <circle cx={118} cy={58} r={4} fill={GRAY} />
      <Sym x={112} y={78} main="s" sub="x" />
      <line x1={122} y1={58} x2={148} y2={58} stroke={GRAY} strokeWidth={1.2} markerEnd="url(#jepa-gray)" />
      <rect x={150} y={46} width={46} height={24} rx={4} fill="#fef3c7" stroke={AMBER} />
      <Note x={173} y={62} fill={AMBER} size={12}>Pred</Note>
      <Sym x={173} y={26} main="z" anchor="middle" />
      <line x1={173} y1={30} x2={173} y2={44} stroke={GRAY} strokeWidth={1.2} markerEnd="url(#jepa-gray)" />
      <path d="M196,60 Q245,64 259,104" fill="none" stroke={AMBER} strokeWidth={1.4} markerEnd="url(#jepa-amber)" />

      {/* the predicted point and the target */}
      <circle cx={262} cy={110} r={5} fill={AMBER_FILL} stroke={AMBER} />
      <Sym x={272} y={108} main="ŝ" sub="y" fill={AMBER} />
      <line x1={90} y1={136} x2={225} y2={142} stroke={GRAY} strokeWidth={1.2} markerEnd="url(#jepa-gray)" />
      <circle cx={230} cy={142} r={5} fill={GRAY} />
      <Sym x={222} y={162} main="s" sub="y" />

      {/* the distance D = the energy */}
      <line x1={259} y1={114} x2={234} y2={138} stroke={AMBER} strokeWidth={1.6} strokeDasharray="3 2" />
      <Sym x={252} y={136} main="D" rest=" = E" size={13} fill={AMBER} />
    </svg>
  );
}
