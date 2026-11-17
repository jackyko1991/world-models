/**
 * Static pictures for the volume-rendering equations (Concepts ▸ 3D scene models ▸ Volume rendering): the continuous
 * integral along a ray, one constant segment, the discrete sum over slabs, and the weights that add up to 1 − T_final.
 * Also exports the small symbol-label helper the NeRF and ray pictures use.
 */
import { useLang } from "@learnkit/web";
import type { ReactNode } from "react";

export const AMBER = "#b45309";
export const AMBER_LIGHT = "#f59e0b";
export const SKY = "#0284c7";
export const GRAY = "#374151";
export const SERIF = "Georgia, 'Times New Roman', serif";
export const SVG_CLASS = "h-auto w-full max-w-[340px]";

/** A run of a math label: plain italic text, or [text, kind] with kind "_" (subscript), "^" (superscript),
 * "^_" (a subscript inside a superscript), "b" (bold upright, for vectors) or "r" (upright roman). */
export type Run = string | readonly [string, "_" | "^" | "^_" | "b" | "r"];

/** A serif-italic label in the equation's own symbols; sub- and superscripts are tspans with dy. */
export function MathLabel({
  x,
  y,
  runs,
  size = 12,
  fill = GRAY,
  anchor = "start",
}: {
  x: number;
  y: number;
  runs: readonly Run[];
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
}) {
  let level = 0;
  return (
    <text x={x} y={y} fontFamily={SERIF} fontStyle="italic" fontSize={size} fill={fill} textAnchor={anchor}>
      {runs.map((r, k) => {
        const [t, kind] = typeof r === "string" ? [r, "n"] : r;
        const target = kind === "_" ? size * 0.3 : kind === "^" ? -size * 0.42 : kind === "^_" ? -size * 0.25 : 0;
        const dy = target - level;
        level = target;
        const small = kind === "_" || kind === "^";
        const tiny = kind === "^_";
        return (
          <tspan
            key={k}
            dy={dy === 0 ? undefined : dy}
            fontSize={small ? size * 0.78 : tiny ? size * 0.6 : undefined}
            fontWeight={kind === "b" ? "bold" : undefined}
            fontStyle={kind === "b" || kind === "r" ? "normal" : undefined}
          >
            {t}
          </tspan>
        );
      })}
    </text>
  );
}

/** An arrowhead marker; give each picture its own id. */
export function Arrowhead({ id, fill }: { id: string; fill: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill={fill} />
    </marker>
  );
}

/** A small camera (body and lens) whose lens tip is at (x, y), looking right. */
export function CameraIcon({ x, y }: { x: number; y: number }) {
  return (
    <g fill={GRAY}>
      <rect x={x - 26} y={y - 10} width={17} height={20} rx={2} />
      <path d={`M${x - 9} ${y} L${x} ${y - 7} L${x} ${y + 7} Z`} />
    </g>
  );
}

function Svg({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" className={SVG_CLASS} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

/** C = ∫ T σ c dt: a ray through a soft cloud; light emitted at t travels back to the camera, dimmed by the matter in front. */
export function VolumeIntegralPicture() {
  const { pick } = useLang();
  const tn = 90;
  const t = 226;
  const tf = 300;
  return (
    <Svg
      label={pick([
        "A camera at o sends a ray r(t) = o + t d through a soft cloud of density σ and colour c. A point at distance t glows; its light travels back to the camera and fades while it crosses the cloud between t_n and t. That stretch is marked T(t), the fraction that survives.",
        "相機在 o，光線 r(t) = o + t d 穿過一團密度 σ、顏色 c 的柔和雲。距離 t 處的一點發光；它的光沿光線回到相機，在穿過 t_n 到 t 之間的雲時逐漸變暗。這一段標為 T(t)，也就是存活下來的比例。",
      ])}
    >
      <defs>
        <radialGradient id="vol-int-cloud">
          <stop offset="0" stopColor={GRAY} stopOpacity="0.45" />
          <stop offset="0.6" stopColor={GRAY} stopOpacity="0.2" />
          <stop offset="1" stopColor={GRAY} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vol-int-back" gradientUnits="userSpaceOnUse" x1={t - 6} y1="0" x2="36" y2="0">
          <stop offset="0" stopColor={AMBER} stopOpacity="1" />
          <stop offset="0.5" stopColor={AMBER} stopOpacity="0.25" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0.25" />
        </linearGradient>
        <Arrowhead id="vol-int-a" fill={AMBER} />
        <Arrowhead id="vol-int-g" fill={GRAY} />
      </defs>
      <ellipse cx="200" cy="100" rx="88" ry="52" fill="url(#vol-int-cloud)" />
      <MathLabel x={200} y={42} anchor="middle" runs={["σ, ", ["c", "b"]]} />
      <CameraIcon x={32} y={100} />
      <MathLabel x={10} y={128} runs={[["o", "b"]]} />
      {/* the shaded stretch the light must cross: T(t) */}
      <rect x={tn} y={96} width={t - tn} height={8} fill={GRAY} opacity="0.18" />
      <line x1="34" y1="100" x2="312" y2="100" stroke={GRAY} strokeWidth="1.2" markerEnd="url(#vol-int-g)" />
      {[tn, t, tf].map((x) => (
        <line key={x} x1={x} y1={95} x2={x} y2={105} stroke={GRAY} strokeWidth="1.2" />
      ))}
      <MathLabel x={tn} y={119} anchor="middle" runs={["t", ["n", "_"]]} />
      <MathLabel x={t} y={119} anchor="middle" runs={["t"]} />
      <MathLabel x={tf} y={119} anchor="middle" runs={["t", ["f", "_"]]} />
      <path d={`M${tn} 126 V131 H${t} V126`} fill="none" stroke={GRAY} strokeWidth="1" />
      <MathLabel x={(tn + t) / 2} y={147} anchor="middle" size={13} runs={["T", ["(", "r"], "t", [")", "r"]]} />
      {/* the emitting point and its light heading home */}
      <g stroke={AMBER} strokeWidth="1.2">
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const a = (k * Math.PI) / 3 + 0.3;
          return <line key={k} x1={t + 6 * Math.cos(a)} y1={100 + 6 * Math.sin(a)} x2={t + 11 * Math.cos(a)} y2={100 + 11 * Math.sin(a)} />;
        })}
      </g>
      <circle cx={t} cy={100} r={4} fill={AMBER_LIGHT} stroke={AMBER} />
      <MathLabel x={t + 4} y={70} anchor="middle" fill={AMBER} runs={["σ ", ["c", "b"], " dt"]} />
      <line x1={t - 6} y1="84" x2="38" y2="84" stroke="url(#vol-int-back)" strokeWidth="3" markerEnd="url(#vol-int-a)" />
      <MathLabel x={20} y={166} runs={[["r", "b"], ["(", "r"], "t", [") = ", "r"], ["o", "b"], [" + ", "r"], "t", ["d", "b"]]} />
    </Svg>
  );
}

/** ∫ T_i e^{−σ s} σ c ds = T_i (1 − e^{−σδ}) c: one slab stops a fraction of the light crossing it and glows with the same weight. */
export function VolumeSegmentPicture() {
  const { pick } = useLang();
  const x0 = 170; // near face of the slab (camera side)
  const x1 = 240; // far face
  const cy = 112;
  const h0 = 36;
  const sd = 1.3; // σ_i δ_i
  const top: string[] = [];
  const bot: string[] = [];
  for (let k = 0; k <= 20; k++) {
    const s = k / 20;
    const x = x1 - s * (x1 - x0);
    const h = h0 * Math.exp(-sd * s);
    top.push(`${x.toFixed(1)} ${(cy - h / 2).toFixed(1)}`);
    bot.unshift(`${x.toFixed(1)} ${(cy + h / 2).toFixed(1)}`);
  }
  const hOut = h0 * Math.exp(-sd);
  const sdRuns: Run[] = ["e", ["−σ", "^"], ["i", "^_"], ["δ", "^"], ["i", "^_"]];
  return (
    <Svg
      label={pick([
        "A single slab of thickness δ_i, density σ_i and colour c_i. Light entering from behind is cut down exponentially inside it: the fraction e^(−σ_i δ_i) passes, the rest, 1 − e^(−σ_i δ_i), is stopped. The slab glows with that same weight, and its glow reaches the camera dimmed by T_i, the matter in front.",
        "一片厚度 δ_i、密度 σ_i、顏色 c_i 的薄層。從後方進入的光在其中指數衰減：通過的比例是 e^(−σ_i δ_i)，其餘的 1 − e^(−σ_i δ_i) 被擋下。薄層以同樣的權重發光，它的光被前方物質削弱為 T_i 倍後才到達相機。",
      ])}
    >
      <defs>
        <linearGradient id="vol-seg-glow" gradientUnits="userSpaceOnUse" x1={x0 - 4} y1="0" x2="36" y2="0">
          <stop offset="0" stopColor={AMBER} stopOpacity="1" />
          <stop offset="0.35" stopColor={AMBER} stopOpacity="1" />
          <stop offset="0.75" stopColor={AMBER} stopOpacity="0.35" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0.35" />
        </linearGradient>
        <Arrowhead id="vol-seg-a" fill={AMBER} />
        <Arrowhead id="vol-seg-g" fill={GRAY} />
      </defs>
      <CameraIcon x={32} y={88} />
      {/* the matter in front of the slab */}
      <rect x={58} y={30} width={52} height={124} rx={6} fill={GRAY} opacity="0.12" />
      <MathLabel x={84} y={170} anchor="middle" size={13} runs={["T", ["i", "_"]]} />
      {/* the slab */}
      <rect x={x0} y={30} width={x1 - x0} height={124} fill={AMBER_LIGHT} opacity="0.22" stroke={AMBER} />
      <MathLabel x={(x0 + x1) / 2} y={48} anchor="middle" runs={["σ", ["i", "_"], [", ", "r"], ["c", "b"], ["i", "_"]]} />
      <path d={`M${x0} 160 V165 H${x1} V160`} fill="none" stroke={GRAY} />
      <MathLabel x={(x0 + x1) / 2} y={178} anchor="middle" runs={["δ", ["i", "_"]]} />
      {/* light from behind: 1 in, e^{−σδ} out */}
      <rect x={x1} y={cy - h0 / 2} width={300 - x1} height={h0} fill={GRAY} opacity="0.35" />
      <path d={`M${top.join(" L")} L${bot.join(" L")} Z`} fill={GRAY} opacity="0.35" />
      <rect x={120} y={cy - hOut / 2} width={x0 - 120} height={hOut} fill={GRAY} opacity="0.35" />
      <line x1="310" y1={cy} x2="122" y2={cy} stroke={GRAY} strokeWidth="1" markerEnd="url(#vol-seg-g)" />
      <MathLabel x={272} y={cy - h0 / 2 - 6} anchor="middle" runs={[["1", "r"]]} />
      <MathLabel x={142} y={cy + 24} anchor="middle" runs={sdRuns} />
      <MathLabel x={205} y={22} anchor="middle" fill={AMBER} runs={[["1 − ", "r"], ...sdRuns]} />
      <text x={205} y={cy + 32} fontSize="11" textAnchor="middle" fill={GRAY}>
        {pick(["stopped", "擋下"])}
      </text>
      {/* the slab's own glow, dimmed on its way to the camera */}
      <line x1={x0 - 4} y1="66" x2="36" y2="80" stroke="url(#vol-seg-glow)" strokeWidth="3" markerEnd="url(#vol-seg-a)" />
    </Svg>
  );
}

/** The discrete example used by the sum and weight pictures: σ_j δ_j per slab, its α_j, and T_j before each slab. */
const SD = [0.2, 0.8, 0.3, 0.6, 0.3];
const ALPHA = SD.map((v) => 1 - Math.exp(-v));
const T = ALPHA.reduce<number[]>((acc, a) => [...acc, acc[acc.length - 1] * (1 - a)], [1]); // T_1 … T_6

/** C ≈ Σ T_i α_i c_i: a row of slabs; the band the camera sees through gets thinner at each one (its height is T_i). */
export function VolumeSumPicture() {
  const { pick } = useLang();
  const widths = [26, 34, 22, 30, 24];
  const gap = 18;
  const cy = 96;
  const H = 64;
  let cursor = 34;
  const gaps: [number, number][] = [];
  const slabs: [number, number][] = [];
  const top: string[] = [];
  const bot: string[] = [];
  const edge = (x: number, tv: number) => {
    top.push(`${x.toFixed(1)} ${(cy - (H * tv) / 2).toFixed(1)}`);
    bot.unshift(`${x.toFixed(1)} ${(cy + (H * tv) / 2).toFixed(1)}`);
  };
  widths.forEach((w, i) => {
    gaps.push([cursor, cursor + gap]);
    edge(cursor, T[i]);
    edge(cursor + gap, T[i]);
    const s0 = cursor + gap;
    slabs.push([s0, s0 + w]);
    for (let k = 1; k <= 8; k++) edge(s0 + (w * k) / 8, T[i] * Math.exp((-SD[i] * k) / 8));
    cursor = s0 + w;
  });
  gaps.push([cursor, 312]);
  edge(312, T[5]);
  return (
    <Svg
      label={pick([
        "Five slabs in a row along a ray, darker for denser. An amber band starts at the camera with full height and loses a fraction α_j inside every slab, so its height in the gap before slab i is the transmittance T_i, the product of (1 − α_j) for the slabs in front.",
        "沿一條光線排成一列的五片薄層，越密越深色。一條琥珀色光帶從相機出發時是滿高度，每穿過一片薄層就失去 α_j 的比例，所以它在第 i 片之前的空隙中的高度就是透射率 T_i，即前方各層 (1 − α_j) 的乘積。",
      ])}
    >
      <CameraIcon x={32} y={cy} />
      <path d={`M${top.join(" L")} L${bot.join(" L")} Z`} fill={AMBER_LIGHT} opacity="0.75" />
      {slabs.map(([a, b], i) => (
        <rect key={i} x={a} y={cy - 40} width={b - a} height={80} fill={GRAY} fillOpacity={0.1 + 0.6 * ALPHA[i]} stroke={GRAY} />
      ))}
      {gaps.map(([a, b], i) => (
        <MathLabel key={i} x={(a + b) / 2} y={cy - 46} anchor="middle" runs={["T", [String(i + 1), "_"]]} />
      ))}
      {slabs.map(([a, b], i) => (
        <MathLabel key={i} x={(a + b) / 2} y={cy + 56} anchor="middle" runs={["α", [String(i + 1), "_"]]} />
      ))}
      <path d={`M${slabs[1][0]} ${cy - 66} V${cy - 70} H${slabs[1][1]} V${cy - 66}`} fill="none" stroke={GRAY} />
      <MathLabel x={(slabs[1][0] + slabs[1][1]) / 2} y={cy - 74} anchor="middle" runs={["σ", ["2", "_"], [", ", "r"], "δ", ["2", "_"]]} />
      <text x={20} y={174} fontSize="11" fill={GRAY}>
        {pick(["band height = ", "光帶高度 = "])}
        <tspan fontFamily={SERIF} fontStyle="italic">T</tspan>
        <tspan fontFamily={SERIF} fontStyle="italic" fontSize="9" dy="3">i</tspan>
        <tspan dy="-3"> = ∏ (1 − </tspan>
        <tspan fontFamily={SERIF} fontStyle="italic">α</tspan>
        <tspan fontFamily={SERIF} fontStyle="italic" fontSize="9" dy="3">j</tspan>
        <tspan dy="-3">)</tspan>
      </text>
    </Svg>
  );
}

/** Σ w_i = 1 − T_final: the transmittance staircase; each drop is a weight, and stacked they fill all but T_final. */
export function VolumeWeightsPicture() {
  const { pick } = useLang();
  const yOf = (v: number) => 160 - v * 140;
  const xs = [40, 70, 100, 130, 160, 190, 206]; // T_i holds on [xs[i-1], xs[i]]
  const barX = 226;
  const barW = 22;
  return (
    <Svg
      label={pick([
        "A staircase of transmittance falling from T_1 = 1. Each drop T_i − T_(i+1) is drawn in amber and is the weight w_i. Stacked in a bar, the drops fill exactly 1 − T_final; the gray rest, T_final, is the light that reaches the background.",
        "從 T_1 = 1 往下的透射率階梯。每一級落差 T_i − T_(i+1) 以琥珀色畫出，就是權重 w_i。把落差疊成一根長條，它們剛好填滿 1 − T_final；剩下的灰色部分 T_final 是到達背景的光。",
      ])}
    >
      {/* axes */}
      <line x1="34" y1={yOf(0)} x2="210" y2={yOf(0)} stroke={GRAY} strokeWidth="0.8" />
      <line x1="34" y1={yOf(0)} x2="34" y2={yOf(1) - 6} stroke={GRAY} strokeWidth="0.8" />
      <text x="28" y={yOf(1) + 4} fontSize="11" textAnchor="end" fill={GRAY}>1</text>
      <text x="28" y={yOf(0) + 4} fontSize="11" textAnchor="end" fill={GRAY}>0</text>
      <MathLabel x={40} y={14} runs={["T", ["i", "_"]]} />
      {/* staircase */}
      {T.map((v, i) => (
        <line key={i} x1={xs[i]} y1={yOf(v)} x2={xs[i + 1]} y2={yOf(v)} stroke={GRAY} strokeWidth="1.6" />
      ))}
      {T.slice(0, 5).map((v, i) => (
        <g key={i}>
          <line x1={xs[i + 1]} y1={yOf(v)} x2={xs[i + 1]} y2={yOf(T[i + 1])} stroke={i % 2 ? AMBER_LIGHT : AMBER} strokeWidth="4" />
          <line x1={xs[i + 1]} y1={yOf(T[i + 1])} x2={barX} y2={yOf(T[i + 1])} stroke={GRAY} strokeWidth="0.6" strokeDasharray="2 3" />
          {v - T[i + 1] > 0.08 && <MathLabel x={xs[i + 1] - 4} y={(yOf(v) + yOf(T[i + 1])) / 2 + 4} anchor="end" fill={AMBER} runs={["w", [String(i + 1), "_"]]} />}
        </g>
      ))}
      {/* the drops stacked: they fill 1 − T_final, the rest goes to the background */}
      {T.slice(0, 5).map((v, i) => (
        <rect key={i} x={barX} y={yOf(v)} width={barW} height={yOf(T[i + 1]) - yOf(v)} fill={i % 2 ? AMBER_LIGHT : AMBER} />
      ))}
      <rect x={barX} y={yOf(T[5])} width={barW} height={yOf(0) - yOf(T[5])} fill={GRAY} opacity="0.25" stroke={GRAY} strokeDasharray="3 2" />
      <path d={`M${barX + barW + 4} ${yOf(1)} H${barX + barW + 8} V${yOf(T[5])} H${barX + barW + 4}`} fill="none" stroke={AMBER} />
      <MathLabel x={barX + barW + 11} y={(yOf(1) + yOf(T[5])) / 2 - 2} fill={AMBER} runs={[["Σ", "r"], "w", ["i", "_"]]} />
      <MathLabel x={barX + barW + 11} y={(yOf(1) + yOf(T[5])) / 2 + 14} fill={AMBER} runs={[["1 − ", "r"], "T", ["final", "_"]]} />
      <MathLabel x={barX + barW + 6} y={yOf(0) - 3} runs={["T", ["final", "_"], [" → ", "r"], ["c", "b"], ["bg", "_"]]} size={11} />
      <text x={(xs[0] + xs[6]) / 2} y="176" fontSize="11" textAnchor="middle" fill={GRAY}>
        {pick(["samples along the ray →", "沿光線的樣本 →"])}
      </text>
    </Svg>
  );
}
