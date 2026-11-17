/**
 * Concepts ▸ Generative ▸ from video generation to a world model: top, a chain of past frames x_{≤t} and a prompt c
 * produce one next frame (the clip is decided by c); bottom, the same past frames and the action a_t: a different
 * key gives a different next frame. A drawing of a ball rolling right.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, ArrowDef, FrameBox, GRAY, LIGHT, Note, Sym } from "./RepresentationParts.tsx";

const W = 40, H = 30;
const XS = [8, 52, 96]; // x_{t-2}, x_{t-1}, x_t

function Frame({ x, y, pos, model = false }: { x: number; y: number; pos: number; model?: boolean }) {
  return (
    <FrameBox x={x} y={y} w={W} h={H} stroke={model ? AMBER : GRAY}>
      <circle cx={x + 6 + pos * (W - 12)} cy={y + H - 12} r={5} fill={model ? AMBER_FILL : GRAY} />
    </FrameBox>
  );
}

export default function GenerativeConditioning() {
  const { pick } = useLang();
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "Top: three past frames of a ball rolling right, x up to time t, and a prompt c lead to one generated next frame. Bottom: the same past frames and an action a_t; pressing right gives a next frame with the ball further right, pressing left gives one with the ball moving back. The action decides the future.",
        "上：一顆球向右滾的三個過去畫面（到時間 t 為止的 x）加上提示 c，生成一個下一幀。下：同樣的過去畫面加上動作 a_t；按右，下一幀的球更往右；按左，球往回走。決定未來的是動作。",
      ])}
    >
      <defs>
        <ArrowDef id="gen-gray" color={GRAY} />
        <ArrowDef id="gen-amber" color={AMBER} />
      </defs>

      {/* top: video generation */}
      <Note x={8} y={12} anchor="start" fill={GRAY} size={11.5}>{pick(["video generation", "影片生成"])}</Note>
      {XS.map((x, i) => <Frame key={i} x={x} y={20} pos={0.2 + 0.2 * i} />)}
      <path d="M8,56 v4 H136 v-4" fill="none" stroke={LIGHT} />
      <Sym x={72} y={72} main="x" sub="≤t" size={13} anchor="middle" />
      <line x1={142} y1={35} x2={190} y2={35} stroke={AMBER} strokeWidth={1.4} markerEnd="url(#gen-amber)" />
      <Sym x={166} y={28} main="c" size={13} anchor="middle" />
      <Note x={166} y={52} size={11}>{pick(["“rolls on”", "「繼續滾」"])}</Note>
      <Frame x={196} y={20} pos={0.8} model />
      <Sym x={240} y={40} main="x" sub="t+1" size={13} fill={AMBER} />

      {/* bottom: action-conditioned */}
      <Note x={8} y={92} anchor="start" fill={GRAY} size={11.5}>{pick(["world model", "世界模型"])}</Note>
      {XS.map((x, i) => <Frame key={i} x={x} y={114} pos={0.2 + 0.2 * i} />)}
      <Sym x={116} y={160} main="x" sub="t" size={13} anchor="middle" />
      <line x1={142} y1={124} x2={190} y2={108} stroke={AMBER} strokeWidth={1.4} markerEnd="url(#gen-amber)" />
      <line x1={142} y1={134} x2={190} y2={152} stroke={AMBER} strokeWidth={1.4} markerEnd="url(#gen-amber)" />
      <Sym x={160} y={100} main="a" sub="t" rest=" = →" size={13} anchor="middle" />
      <Sym x={160} y={168} main="a" sub="t" rest=" = ←" size={13} anchor="middle" />
      <Frame x={196} y={88} pos={0.8} model />
      <Frame x={196} y={140} pos={0.4} model />
      <Sym x={240} y={108} main="x" sub="t+1" size={13} fill={AMBER} />
      <Sym x={240} y={160} main="x" sub="t+1" size={13} fill={AMBER} />
    </svg>
  );
}
