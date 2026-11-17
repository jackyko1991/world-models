/**
 * Picture for the degree-0/1 spherical-harmonic colour c(d) (Concepts ▸ 3D scene models ▸ Gaussians): one splat seen
 * from three directions d₁, d₂, d₃ shows three colours. The ring around it is c(d) for every direction in the plane:
 * k₀ sets its average, the degree-1 terms tilt it linearly across d (here, along d_x). Static SVG.
 */
import { useLang } from "@learnkit/web";
import { GRAY, ArrowDef, Note, SERIF, Sym } from "./GaussiansParts.tsx";

const WARM: [number, number, number] = [245, 158, 11]; // c(d) seen from the left
const COOL: [number, number, number] = [2, 132, 199]; // c(d) seen from the right
const mix = (f: number) =>
  `rgb(${WARM.map((w, i) => Math.round(w + (COOL[i] - w) * f)).join(",")})`;

export default function GaussiansColour() {
  const { pick } = useLang();
  const cx = 160, cy = 124, ring = 46, cam = 94;
  const views = [150, 90, 30].map((deg, i) => {
    const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = -Math.sin(a);
    return { i: i + 1, x: cx + cam * ux, y: cy + cam * uy, ux, uy, colour: mix((1 + ux) / 2) };
  });
  return (
    <svg
      viewBox="0 6 320 176"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "One Gaussian splat seen by three cameras from directions d1, d2, d3. Each camera sees a different colour: warm from the left, a blend from above, blue from the right. A coloured ring around the splat shows the colour for every direction.",
        "三台相機從方向 d1、d2、d3 看同一個高斯潑濺。每台相機看到的顏色不同：從左邊是暖色，從上方是混合色，從右邊是藍色。潑濺周圍的彩色環顯示每個方向的顏色。",
      ])}
    >
      <defs>
        <ArrowDef id="gsh-arrow" color={GRAY} />
        <linearGradient id="gsh-ring" x1={cx - ring} y1={0} x2={cx + ring} y2={0} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={mix(0)} />
          <stop offset="1" stopColor={mix(1)} />
        </linearGradient>
        <radialGradient id="gsh-blob">
          <stop offset="0" stopColor={mix(0.5)} stopOpacity={0.95} />
          <stop offset="1" stopColor={mix(0.5)} stopOpacity={0.15} />
        </radialGradient>
      </defs>

      {/* c(d) over directions: the ring */}
      <path
        d={`M ${cx - ring} ${cy} A ${ring} ${ring} 0 0 1 ${cx + ring} ${cy}`}
        fill="none"
        stroke="url(#gsh-ring)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <ellipse cx={cx} cy={cy} rx={26} ry={17} fill="url(#gsh-blob)" />
      <line x1={cx - 70} y1={cy + 22} x2={cx + 70} y2={cy + 22} stroke="#d1d5db" strokeWidth={1} />

      {views.map((v) => (
        <g key={v.i}>
          <line
            x1={v.x - 14 * v.ux}
            y1={v.y - 14 * v.uy}
            x2={cx + (ring + 10) * v.ux}
            y2={cy + (ring + 10) * v.uy}
            stroke={GRAY}
            strokeWidth={1.3}
            markerEnd="url(#gsh-arrow)"
          />
          {/* camera body, facing the splat */}
          <g transform={`translate(${v.x} ${v.y}) rotate(${(Math.atan2(-v.uy, -v.ux) * 180) / Math.PI})`}>
            <rect x={-7} y={-6} width={10} height={12} rx={2} fill={GRAY} />
            <path d="M3,-4 L9,-7 L9,7 L3,4 z" fill={GRAY} />
          </g>
        </g>
      ))}
      {/* the arrows' names and what each camera sees */}
      <Sym x={102} y={82} main="d" sub="1" />
      <Sym x={153} y={62} main="d" sub="2" anchor="end" />
      <Sym x={218} y={82} main="d" sub="3" anchor="end" />

      <rect x={30} y={70} width={18} height={18} rx={3} fill={views[0].colour} />
      <text x={39} y={62} fontFamily={SERIF} fontStyle="italic" fontSize={13} fill={GRAY} textAnchor="middle">
        c(d<tspan dy={4} fontSize={11}>1</tspan><tspan dy={-4}>)</tspan>
      </text>
      <rect x={180} y={22} width={18} height={18} rx={3} fill={views[1].colour} />
      <text x={204} y={36} fontFamily={SERIF} fontStyle="italic" fontSize={13} fill={GRAY}>
        c(d<tspan dy={4} fontSize={11}>2</tspan><tspan dy={-4}>)</tspan>
      </text>
      <rect x={272} y={70} width={18} height={18} rx={3} fill={views[2].colour} />
      <text x={281} y={62} fontFamily={SERIF} fontStyle="italic" fontSize={13} fill={GRAY} textAnchor="middle">
        c(d<tspan dy={4} fontSize={11}>3</tspan><tspan dy={-4}>)</tspan>
      </text>

      <Note x={160} y={164}>{pick(["k₀: the average colour", "k₀：平均顏色"])}</Note>
      <Note x={160} y={178}>{pick(["k₁, k₂, k₃: how it tilts with direction d", "k₁、k₂、k₃：隨方向 d 傾斜的程度"])}</Note>
    </svg>
  );
}
