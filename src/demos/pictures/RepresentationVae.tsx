/**
 * Concepts ▸ Representation ▸ VAE loss: a frame x squeezed by the encoder q(z | x) to a small Gaussian (μ, σ) in a
 * 2-D latent plane, a sample z = μ + σ⊙ε drawn from it, the KL pull towards the unit circle N(0, I), and the decoder
 * p(x | z) redrawing the frame, with the reconstruction gap between x and x̂. A drawing, not model output.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, ArrowDef, FAINT, FrameBox, GRAY, LIGHT, Note, Sym } from "./RepresentationParts.tsx";

const CX = 160, CY = 88, UNIT = 30; // latent plane: origin and one unit of z in px
const MU = { x: CX + 1.05 * UNIT, y: CY - 0.9 * UNIT };
const Z = { x: MU.x + 9, y: MU.y + 4 }; // μ + σ⊙ε for one ε

export default function RepresentationVae() {
  const { pick } = useLang();
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "A frame x goes through the encoder to a small Gaussian with mean μ and spread σ in a two-dimensional latent plane. A sample z = μ + σ⊙ε is drawn from it; an arrow marked KL pulls the Gaussian towards the dashed unit circle N(0, I). The decoder turns z back into a frame x̂, whose ball sits slightly off the true one: the reconstruction gap.",
        "畫面 x 經過編碼器，變成二維潛在平面中一個平均值為 μ、散布為 σ 的小高斯。從中抽出一個樣本 z = μ + σ⊙ε；標著 KL 的箭頭把這個高斯拉向虛線單位圓 N(0, I)。解碼器把 z 還原成畫面 x̂，其中的球與真實的球略有偏差：這就是重建差距。",
      ])}
    >
      <defs>
        <ArrowDef id="vae-gray" color={GRAY} />
        <ArrowDef id="vae-amber" color={AMBER} />
      </defs>

      {/* input frame x */}
      <Sym x={35} y={54} main="x" anchor="middle" />
      <FrameBox x={10} y={60} w={50} h={50}>
        <circle cx={30} cy={88} r={8} fill={GRAY} />
      </FrameBox>

      {/* encoder: wide to narrow */}
      <polygon points="66,62 100,76 100,94 66,108" fill="#f3f4f6" stroke={LIGHT} />
      <Sym x={83} y={126} main="q" rest="(z | x)" size={12} anchor="middle" />

      {/* latent plane */}
      <rect x={108} y={30} width={104} height={108} rx={4} fill="white" stroke={FAINT} />
      <line x1={112} y1={CY} x2={208} y2={CY} stroke={FAINT} />
      <line x1={CX} y1={34} x2={CX} y2={134} stroke={FAINT} />
      <circle cx={CX} cy={CY} r={UNIT} fill="none" stroke={GRAY} strokeDasharray="4 3" />
      <Sym x={CX} y={132} main="N" rest="(0, I)" size={12} anchor="middle" />
      {/* q(z|x): the small Gaussian */}
      <ellipse cx={MU.x} cy={MU.y} rx={13} ry={8} fill={AMBER_FILL} fillOpacity={0.22} stroke={AMBER} />
      <circle cx={MU.x} cy={MU.y} r={2.2} fill={AMBER} />
      <line x1={MU.x} y1={MU.y} x2={MU.x + 13} y2={MU.y} stroke={AMBER} strokeWidth={0.8} />
      <Sym x={MU.x - 4} y={MU.y - 11} main="μ" rest=", σ" size={12} fill={AMBER} anchor="middle" />
      {/* the sample z */}
      <circle cx={Z.x} cy={Z.y} r={2.8} fill="white" stroke={AMBER} strokeWidth={1.6} />
      <Sym x={Z.x + 2} y={Z.y + 14} main="z" size={13} fill={AMBER} />
      {/* KL pull towards the prior */}
      <line x1={MU.x - 9} y1={MU.y + 8} x2={CX + 9} y2={CY - 6} stroke={GRAY} strokeWidth={1.4} markerEnd="url(#vae-gray)" />
      <Note x={CX + 6} y={CY - 16} anchor="end" fill={GRAY} size={11}>KL</Note>
      <Sym x={CX} y={23} main="z" rest=" = μ + σ⊙ε" size={12} fill={AMBER} anchor="middle" />

      {/* decoder: narrow to wide */}
      <line x1={Z.x + 2} y1={Z.y + 2} x2={218} y2={86} stroke={AMBER} strokeWidth={1} markerEnd="url(#vae-amber)" />
      <polygon points="220,76 254,62 254,108 220,94" fill="#fef3c7" stroke={AMBER} strokeOpacity={0.6} />
      <Sym x={237} y={126} main="p" rest="(x | z)" size={12} anchor="middle" />

      {/* reconstruction x̂ with the true ball as a ghost */}
      <Sym x={285} y={54} main="x̂" fill={AMBER} anchor="middle" />
      <FrameBox x={260} y={60} w={50} h={50} stroke={AMBER}>
        <circle cx={280} cy={88} r={8} fill="none" stroke={GRAY} strokeDasharray="2 2" />
        <circle cx={286} cy={85} r={8.5} fill={AMBER_FILL} fillOpacity={0.55} />
      </FrameBox>

      {/* the reconstruction gap */}
      <path d="M35,114 V146 H285 V114" fill="none" stroke={LIGHT} strokeDasharray="3 3" />
      <Sym x={160} y={166} main="−log p" rest="(x | z)" size={12} anchor="middle" />
      <Note x={160} y={178} size={11}>{pick(["the reconstruction gap", "重建差距"])}</Note>
    </svg>
  );
}
