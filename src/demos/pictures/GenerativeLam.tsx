/**
 * Concepts ▸ Generative ▸ Genie's latent action model: the change between x_t and x_{t+1} (the player moved up and to
 * the right) is encoded to a vector, which VQ snaps to the nearest of eight codebook vectors, ã_t; the decoder rebuilds
 * x_{t+1} from the past frame and that code alone, and the leftover gap is L_LAM. A note says how play uses it. A drawing.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, ArrowDef, FAINT, FrameBox, GRAY, LIGHT, Note, SERIF, Sym } from "./RepresentationParts.tsx";

const PX = 160, PY = 76, R = 40; // codebook plane
const CODES = Array.from({ length: 8 }, (_, k) => {
  const th = (k * Math.PI) / 4;
  return { k: k + 1, x: PX + R * Math.cos(th), y: PY - R * Math.sin(th), lx: PX + (R + 11) * Math.cos(th), ly: PY - (R + 11) * Math.sin(th) + 4 };
});
const E = { x: PX + 30 * Math.cos(0.42), y: PY - 30 * Math.sin(0.42) }; // enc output, between codes 1 and 2 but nearer 2
const A = CODES[1];

function Player({ x, y, fill, ghost = false }: { x: number; y: number; fill: string; ghost?: boolean }) {
  return ghost ? (
    <rect x={x} y={y} width={9} height={9} fill="none" stroke={GRAY} strokeDasharray="2 2" />
  ) : (
    <rect x={x} y={y} width={9} height={9} fill={fill} />
  );
}

export default function GenerativeLam() {
  const { pick } = useLang();
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "Two frames, x_t and x_{t+1}: the player has moved up and to the right. The encoder turns the change into a vector, drawn as a hollow point among eight codebook vectors arranged in a circle; VQ snaps it to the nearest one, code 2, which is ã_t. The decoder rebuilds x_{t+1} from the past frame and ã_t; the small gap between the rebuilt player and the true one is the loss L_LAM. At play time a person picks one of the eight codes instead.",
        "兩個畫面 x_t 與 x_{t+1}：玩家往右上移動了。編碼器把這個變化轉成一個向量，畫成一個空心點，周圍是排成一圈的八個碼本向量；VQ 把它對到最近的一個，也就是代碼 2，即 ã_t。解碼器用過去的畫面與 ã_t 重建 x_{t+1}；重建的玩家與真實玩家之間的小差距就是損失 L_LAM。遊玩時則改由人從八個代碼中挑一個。",
      ])}
    >
      <defs>
        <ArrowDef id="lam-gray" color={GRAY} />
        <ArrowDef id="lam-amber" color={AMBER} />
      </defs>

      {/* the two frames */}
      <Sym x={31} y={20} main="x" sub="t" size={13} anchor="middle" />
      <FrameBox x={8} y={26} w={46} h={38}>
        <Player x={18} y={44} fill={GRAY} />
      </FrameBox>
      <Sym x={31} y={84} main="x" sub="t+1" size={13} anchor="middle" />
      <FrameBox x={8} y={90} w={46} h={38}>
        <Player x={18} y={108} fill={GRAY} ghost />
        <Player x={30} y={98} fill={GRAY} />
        <line x1={24} y1={110} x2={31} y2={104} stroke={GRAY} strokeWidth={1} markerEnd="url(#lam-gray)" />
      </FrameBox>

      {/* encoder sees both */}
      <line x1={54} y1={45} x2={68} y2={68} stroke={LIGHT} />
      <line x1={54} y1={109} x2={68} y2={84} stroke={LIGHT} />
      <rect x={66} y={64} width={34} height={24} rx={4} fill="#fef3c7" stroke={AMBER} />
      <Note x={83} y={80} fill={AMBER} size={11.5}>enc</Note>
      <line x1={100} y1={76} x2={E.x - 3} y2={E.y + 2} stroke={AMBER} strokeWidth={1} strokeDasharray="3 2" markerEnd="url(#lam-amber)" />

      {/* codebook of eight */}
      <circle cx={PX} cy={PY} r={R} fill="none" stroke={FAINT} />
      {CODES.map((c) => (
        <g key={c.k}>
          <line x1={PX} y1={PY} x2={c.x} y2={c.y} stroke={FAINT} />
          <circle cx={c.x} cy={c.y} r={c.k === A.k ? 5 : 3.2} fill={c.k === A.k ? AMBER_FILL : "white"} stroke={c.k === A.k ? AMBER : LIGHT} strokeWidth={1.4} />
          {c.k !== A.k && <Note x={c.lx} y={c.ly} size={11} fill="#6b7280">{c.k}</Note>}
        </g>
      ))}
      <circle cx={E.x} cy={E.y} r={3.2} fill="white" stroke={AMBER} strokeWidth={1.4} />
      <line x1={E.x} y1={E.y} x2={A.x + 2} y2={A.y + 4} stroke={AMBER} strokeWidth={1.4} markerEnd="url(#lam-amber)" />
      <Sym x={A.x + 7} y={A.y - 8} main="ã" sub="t" rest=" = 2" size={13} fill={AMBER} />
      <Note x={PX} y={147} size={11.5} fill={GRAY}>{pick(["VQ: snap to the nearest of 8", "VQ：對到 8 個中最近的"])}</Note>

      {/* decoder: past frame + code → x̂_{t+1} */}
      <line x1={A.x + 5} y1={A.y + 4} x2={224} y2={72} stroke={AMBER} strokeWidth={1.2} markerEnd="url(#lam-amber)" />
      <path d="M54,34 H60 V8 H240 V64" fill="none" stroke={LIGHT} strokeDasharray="3 3" markerEnd="url(#lam-gray)" />
      <rect x={226} y={66} width={30} height={22} rx={4} fill="#fef3c7" stroke={AMBER} />
      <Note x={241} y={81} fill={AMBER} size={11.5}>dec</Note>
      <line x1={256} y1={77} x2={262} y2={77} stroke={AMBER} strokeWidth={1.2} />
      <FrameBox x={264} y={58} w={48} h={38} stroke={AMBER}>
        <Player x={286} y={67} fill={GRAY} ghost />
        <rect x={288} y={69} width={9} height={9} fill={AMBER_FILL} fillOpacity={0.7} />
      </FrameBox>
      <Sym x={288} y={52} main="x̂" sub="t+1" size={13} fill={AMBER} anchor="middle" />
      <Sym x={288} y={112} main="ℒ" sub="LAM" size={13} anchor="middle" />

      {/* play time */}
      <Note x={164} y={164} size={11.5} fill={GRAY}>
        {pick(["play: pick ", "遊玩：挑 "])}
        <tspan fontFamily={SERIF} fontStyle="italic">ã → p</tspan>
        <tspan dy={3} fontFamily={SERIF} fontStyle="italic">θ</tspan>
        <tspan dy={-3}>{pick([" → next frame", " → 下一幀"])}</tspan>
      </Note>
    </svg>
  );
}
