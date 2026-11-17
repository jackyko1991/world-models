/**
 * Picture for J and Σ′ = J W Σ Wᵀ Jᵀ (Concepts ▸ 3D scene models ▸ Gaussians): W turns the world frame into the
 * camera's; the ellipsoid Σ sits in front of the camera; the rays that graze it cross the image plane and bound its
 * 2-D footprint Σ′. J is the perspective divide made linear at μ. Static SVG.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, ArrowDef, GRAY, LIGHT, Note, Sym, ellipsePoints } from "./GaussiansParts.tsx";

const C: [number, number] = [22, 96]; // camera centre
const MU: [number, number] = [214, 88]; // the Gaussian's mean
const A = 50, B = 24, TILT = -25; // the ellipsoid's outline
const PLANE = 118; // x of the image plane

/** Where the line from the camera through p crosses the image plane. */
const onPlane = (p: [number, number]) => C[1] + ((p[1] - C[1]) * (PLANE - C[0])) / (p[0] - C[0]);

// The two rays that graze the ellipse: the outline points of largest and smallest angle seen from the camera.
const outline = ellipsePoints(MU[0], MU[1], A, B, TILT);
const angle = (p: [number, number]) => Math.atan2(p[1] - C[1], p[0] - C[0]);
const top = outline.reduce((m, p) => (angle(p) < angle(m) ? p : m));
const bottom = outline.reduce((m, p) => (angle(p) > angle(m) ? p : m));
const uTop = onPlane(top), uBottom = onPlane(bottom), uMu = onPlane(MU);
/** Height of the upper grazing ray at x. */
const topRayAt = (x: number) => C[1] + ((top[1] - C[1]) * (x - C[0])) / (top[0] - C[0]);

export default function GaussiansProjection() {
  const { pick } = useLang();
  const far = (p: [number, number]) => [C[0] + (p[0] - C[0]) * 1.12, C[1] + (p[1] - C[1]) * 1.12];
  const [tx, ty] = far(top), [bx, by] = far(bottom);
  return (
    <svg
      viewBox="0 18 320 166"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "A camera on the left, an image plane in front of it, and a tilted 3-D ellipsoid Sigma further away. Two rays from the camera graze the ellipsoid and cross the image plane, bounding a 2-D ellipse, the footprint Sigma prime. W carries the world frame into the camera's; J is the divide by depth made linear at the mean mu.",
        "左邊是相機，前方是影像平面，更遠處是傾斜的三維橢球 Σ。兩條從相機出發、擦過橢球的光線穿過影像平面，圍出一個二維橢圓，也就是足跡 Σ′。W 把世界座標轉成相機座標；J 是在平均 μ 處線性化的深度除法。",
      ])}
    >
      <defs>
        <ArrowDef id="gproj-arrow" color={GRAY} />
        <ArrowDef id="gproj-arrow-l" color={LIGHT} />
      </defs>

      {/* grazing rays and the central ray */}
      <line x1={C[0]} y1={C[1]} x2={tx} y2={ty} stroke={LIGHT} strokeWidth={1} />
      <line x1={C[0]} y1={C[1]} x2={bx} y2={by} stroke={LIGHT} strokeWidth={1} />
      <line x1={C[0]} y1={C[1]} x2={MU[0]} y2={MU[1]} stroke={LIGHT} strokeWidth={1} strokeDasharray="3 3" />

      {/* image plane, seen at a slant, with the footprint */}
      <path d={`M ${PLANE - 10} 52 L ${PLANE + 10} 40 L ${PLANE + 10} 140 L ${PLANE - 10} 152 z`} fill="#ffffff" fillOpacity={0.7} stroke={GRAY} strokeWidth={1} />
      <ellipse
        cx={PLANE}
        cy={(uTop + uBottom) / 2}
        rx={10}
        ry={(uBottom - uTop) / 2}
        fill={AMBER_FILL}
        fillOpacity={0.45}
        stroke={AMBER}
        strokeWidth={1.5}
      />
      <circle cx={PLANE} cy={uMu} r={2} fill={AMBER} />
      <Sym x={PLANE - 14} y={uMu + 4} main="μ′" fill={AMBER} anchor="end" />
      <Sym x={PLANE} y={34} main="Σ′" fill={AMBER} anchor="middle" size={15} />

      {/* the 3-D Gaussian in camera space */}
      <g transform={`rotate(${TILT} ${MU[0]} ${MU[1]})`}>
        <ellipse cx={MU[0]} cy={MU[1]} rx={A} ry={B} fill="#e5e7eb" fillOpacity={0.85} stroke={GRAY} strokeWidth={1.5} />
        <ellipse cx={MU[0]} cy={MU[1]} rx={A} ry={7} fill="none" stroke={GRAY} strokeWidth={0.8} strokeDasharray="3 2" />
      </g>
      <circle cx={MU[0]} cy={MU[1]} r={2} fill={GRAY} />
      <Sym x={MU[0] + 4} y={MU[1] + 16} main="μ" />
      <Sym x={MU[0] + 44} y={MU[1] - 34} main="Σ" size={15} />

      {/* J: the divide by depth, linearised at μ */}
      <Sym x={164} y={topRayAt(164) - 8} main="J" fill={AMBER} size={15} anchor="middle" />
      <Note x={206} y={134}>{pick(["J: ÷ depth, made linear at μ", "J：在 μ 處線性化的 ÷ 深度"])}</Note>

      {/* camera with its axes */}
      <g transform={`translate(${C[0]} ${C[1]})`}>
        <rect x={-14} y={-7} width={11} height={14} rx={2} fill={GRAY} />
        <path d="M-3,-4 L3,-7 L3,7 L-3,4 z" fill={GRAY} />
      </g>
      <line x1={C[0]} y1={C[1] + 14} x2={C[0] + 26} y2={C[1] + 14} stroke={GRAY} strokeWidth={1} markerEnd="url(#gproj-arrow)" />
      <Sym x={C[0] + 30} y={C[1] + 25} main="t" sub="z" size={13} />

      {/* W: world frame to camera frame */}
      <g transform="translate(288 160)" stroke={GRAY} strokeWidth={1}>
        <line x1={0} y1={0} x2={18} y2={0} markerEnd="url(#gproj-arrow)" />
        <line x1={0} y1={0} x2={0} y2={-18} markerEnd="url(#gproj-arrow)" />
        <line x1={0} y1={0} x2={-10} y2={8} markerEnd="url(#gproj-arrow)" />
      </g>
      <path d={`M 276 168 Q 150 186 ${C[0] + 2} ${C[1] + 30}`} fill="none" stroke={GRAY} strokeWidth={1.1} strokeDasharray="4 3" markerEnd="url(#gproj-arrow)" />
      <Sym x={150} y={164} main="W" size={15} anchor="middle" />
      <Note x={300} y={180}>{pick(["world", "世界"])}</Note>
    </svg>
  );
}
