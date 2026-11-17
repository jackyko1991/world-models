/**
 * Picture for front-to-back compositing C(x) = Σ cᵢ αᵢ Tᵢ, Tᵢ = Π_{j<i}(1 − αⱼ) (Concepts ▸ 3D scene models ▸
 * Gaussians): one pixel's line of sight passes through three translucent splats, sorted by depth. Below, the light
 * still getting through, T, steps down at each splat; each step, αᵢTᵢ, is that splat's share of the pixel, drawn in
 * its colour. Static SVG.
 */
import { useLang } from "@learnkit/web";
import { ArrowDef, GRAY, LIGHT, Note, SERIF } from "./GaussiansParts.tsx";

const SPLATS = [
  { x: 100, alpha: 0.6, rgb: [245, 158, 11], rx: 22, ry: 32 },
  { x: 175, alpha: 0.5, rgb: [2, 132, 199], rx: 18, ry: 26 },
  { x: 250, alpha: 0.7, rgb: [107, 114, 128], rx: 24, ry: 30 },
] as const;
const BACKGROUND = [255, 255, 255];
const hex = (rgb: readonly number[]) => `rgb(${rgb.map((v) => Math.round(v)).join(",")})`;

// T before each splat, and the final pixel colour (whatever light is left falls on a white background).
const T: number[] = [1];
SPLATS.forEach((s, i) => T.push(T[i] * (1 - s.alpha)));
const PIXEL = [0, 1, 2].map(
  (k) => SPLATS.reduce((acc, s, i) => acc + s.rgb[k] * s.alpha * T[i], 0) + BACKGROUND[k] * T[SPLATS.length],
);

const RAY_Y = 56, BASE = 172, SCALE = 66; // the line of sight; T = 0 and the height of T = 1
const ty = (t: number) => BASE - SCALE * t;

export default function GaussiansComposite() {
  const { pick } = useLang();
  const stairs =
    `M 30 ${ty(1)} ` +
    SPLATS.map((s, i) => `L ${s.x} ${ty(T[i])} L ${s.x} ${ty(T[i + 1])}`).join(" ") +
    ` L 306 ${ty(T[SPLATS.length])}`;
  const sub = (s: string, n: number, x: number, y: number, anchor: "start" | "end" = "start") => (
    <text x={x} y={y} fontFamily={SERIF} fontStyle="italic" fontSize={13} fill={GRAY} textAnchor={anchor}>
      {s.split("·").map((part, k) => (
        <tspan key={k}>
          {part}
          <tspan dy={4} fontSize={11}>{n}</tspan>
          <tspan dy={-4}>{""}</tspan>
        </tspan>
      ))}
    </text>
  );
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "A pixel's line of sight passes through three translucent splats sorted by depth, with opacities 0.6, 0.5 and 0.7. Below, the remaining light T starts at 1 and drops at each splat to 0.4, 0.2 and 0.06; each drop, alpha times T, is that splat's share of the pixel colour, so the nearest splat counts most.",
        "一個像素的視線依深度穿過三個半透明潑濺，不透明度分別為 0.6、0.5、0.7。下方剩餘的光 T 從 1 開始，每經過一個潑濺就降到 0.4、0.2、0.06；每次下降的量 α 乘以 T，就是該潑濺在像素顏色中所占的份額，所以最近的潑濺分量最大。",
      ])}
    >
      <defs>
        <ArrowDef id="gcomp-arrow" color={GRAY} />
      </defs>

      {/* the pixel and its line of sight */}
      <rect x={8} y={RAY_Y - 9} width={18} height={18} rx={2} fill={hex(PIXEL)} stroke={GRAY} strokeWidth={1} />
      <text x={17} y={RAY_Y - 16} fontFamily={SERIF} fontStyle="italic" fontSize={13} fill={GRAY} textAnchor="middle">
        C(x)
      </text>
      {SPLATS.map((s, i) => (
        <g key={i}>
          <line x1={s.x} y1={RAY_Y} x2={s.x} y2={ty(T[i])} stroke={LIGHT} strokeWidth={0.8} strokeDasharray="2 3" />
          <ellipse cx={s.x} cy={RAY_Y} rx={s.rx} ry={s.ry} fill={hex(s.rgb)} fillOpacity={s.alpha * 0.8} stroke={hex(s.rgb)} strokeWidth={1} />
          <text x={s.x} y={RAY_Y - s.ry - 6} fontFamily={SERIF} fontStyle="italic" fontSize={13} fill={GRAY} textAnchor="middle">
            α<tspan dy={4} fontSize={11}>{i + 1}</tspan>
            <tspan dy={-4}> = {s.alpha}</tspan>
          </text>
        </g>
      ))}
      <line x1={26} y1={RAY_Y} x2={312} y2={RAY_Y} stroke={GRAY} strokeWidth={1.2} markerEnd="url(#gcomp-arrow)" />
      <Note x={300} y={RAY_Y + 16} anchor="end">{pick(["depth", "深度"])}</Note>

      {/* the light that still gets through, and each splat's share of it */}
      <line x1={30} y1={BASE} x2={306} y2={BASE} stroke="#d1d5db" strokeWidth={1} />
      <path d={stairs} fill="none" stroke={GRAY} strokeWidth={1.4} />
      {SPLATS.map((s, i) => (
        <rect key={i} x={s.x - 4} y={ty(T[i])} width={8} height={ty(T[i + 1]) - ty(T[i])} fill={hex(s.rgb)} />
      ))}
      {sub("T", 1, 34, ty(1) - 5)}
      {sub("T", 2, 110, ty(T[1]) - 5)}
      {sub("T", 3, 185, ty(T[2]) - 5)}
      {sub("T", 4, 262, ty(T[3]) - 5)}
      {sub("α·T", 1, 94, ty(1) + 32, "end")}
      {sub("α·T", 2, 169, ty(T[1]) + 14, "end")}
      {sub("α·T", 3, 244, ty(T[2]) + 12, "end")}
    </svg>
  );
}
