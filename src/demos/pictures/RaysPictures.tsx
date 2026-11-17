/**
 * Static picture for the pixel-to-ray equation (Coding Skills ▸ Rays and splats ▸ rays): a pinhole camera seen from
 * above, the image plane at distance f, one pixel's offset from the principal point, the field of view, and the ray d.
 */
import { useLang } from "@learnkit/web";
import { AMBER, Arrowhead, GRAY, MathLabel, SVG_CLASS } from "./VolumePictures.tsx";

export function RaysPinholePicture() {
  const { pick } = useLang();
  const ox = 34;
  const oy = 100;
  const planeX = 150;
  const top = 24;
  const bottom = 176;
  const nPix = 8;
  const pix = (bottom - top) / nPix;
  const i = 1;
  const py = top + (i + 0.5) * pix; // pixel centre
  const slope = (py - oy) / (planeX - ox);
  const endX = 204;
  const fovR = 30;
  const aTop = Math.atan2(top - oy, planeX - ox);
  const aBot = Math.atan2(bottom - oy, planeX - ox);
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "A pinhole camera seen from above. Its centre o looks along the −z axis; the image plane stands at distance f, with pixels counted from i = 0 at one edge to W at the other and the principal point c_x on the axis. One pixel is highlighted; its centre lies i + ½ − c_x pixels off the axis, and the ray from o through it is the direction d. The two edge rays span the field of view, with half the image width W/2 on each side.",
        "從上方看的針孔相機。中心 o 沿 −z 軸看出去；影像平面位於距離 f 處，像素從一邊的 i = 0 數到另一邊的 W，主點 c_x 在光軸上。標出的一個像素，其中心離光軸 i + ½ − c_x 個像素，從 o 穿過它的光線就是方向 d。兩條邊緣光線張出視野，每一側是影像寬度的一半 W/2。",
      ])}
    >
      <defs>
        <Arrowhead id="rays-p-a" fill={AMBER} />
        <Arrowhead id="rays-p-g" fill={GRAY} />
      </defs>
      {/* the camera box with its pinhole at o */}
      <path d={`M${ox} ${oy - 3} V${oy - 14} H${ox - 24} V${oy + 14} H${ox} V${oy + 3}`} fill="none" stroke={GRAY} strokeWidth="1.6" />
      <circle cx={ox} cy={oy} r="2.2" fill={GRAY} />
      <MathLabel x={ox - 14} y={oy + 30} anchor="middle" runs={[["o", "b"]]} />
      {/* optical axis */}
      <line x1={ox} y1={oy} x2="312" y2={oy} stroke={GRAY} strokeWidth="0.8" strokeDasharray="4 3" markerEnd="url(#rays-p-g)" />
      <MathLabel x={312} y={oy + 16} anchor="end" runs={[["−", "r"], "z"]} />
      {/* field of view: the two edge rays and the angle between them */}
      <line x1={ox} y1={oy} x2={planeX} y2={top} stroke={GRAY} strokeWidth="0.8" strokeDasharray="2 2" />
      <line x1={ox} y1={oy} x2={planeX} y2={bottom} stroke={GRAY} strokeWidth="0.8" strokeDasharray="2 2" />
      <path
        d={`M${ox + fovR * Math.cos(aTop)} ${oy + fovR * Math.sin(aTop)} A${fovR} ${fovR} 0 0 1 ${ox + fovR * Math.cos(aBot)} ${oy + fovR * Math.sin(aBot)}`}
        fill="none"
        stroke={GRAY}
      />
      <text x={ox + fovR + 4} y={oy - 5} fontSize="11" fill={GRAY}>fov</text>
      {/* image plane with its pixels */}
      <line x1={planeX} y1={top} x2={planeX} y2={bottom} stroke={GRAY} strokeWidth="2" />
      {Array.from({ length: nPix + 1 }, (_, k) => (
        <line key={k} x1={planeX - 4} y1={top + k * pix} x2={planeX + 4} y2={top + k * pix} stroke={GRAY} strokeWidth="1" />
      ))}
      <rect x={planeX - 4} y={top + i * pix} width="8" height={pix} fill={AMBER} />
      <text x={planeX + 7} y={top + 4} fontSize="11" fill={GRAY}>0</text>
      <MathLabel x={planeX + 7} y={bottom} size={11} runs={["W"]} />
      <MathLabel x={planeX + 8} y={oy - 4} size={11} runs={["c", ["x", "_"]]} />
      {/* the pixel's offset from the principal point */}
      <path d={`M${planeX + 34} ${py} H${planeX + 38} V${oy} H${planeX + 34}`} fill="none" stroke={AMBER} />
      <MathLabel x={planeX + 42} y={(py + oy) / 2 + 8} size={11} fill={AMBER} runs={["i", [" + ½ − ", "r"], "c", ["x", "_"]]} />
      {/* half the image width */}
      <path d={`M${planeX - 8} ${oy + 2} H${planeX - 12} V${bottom} H${planeX - 8}`} fill="none" stroke={GRAY} />
      <MathLabel x={planeX - 15} y={146} anchor="end" size={11} runs={["W", ["/2", "r"]]} />
      {/* focal length */}
      <path d={`M${ox} ${oy + 6} V${oy + 10} H${planeX} V${oy + 6}`} fill="none" stroke={GRAY} />
      <MathLabel x={(ox + planeX) / 2 + 14} y={oy + 24} anchor="middle" size={13} runs={["f"]} />
      {/* the ray through the pixel centre */}
      <line x1={ox} y1={oy} x2={endX} y2={oy + slope * (endX - ox)} stroke={AMBER} strokeWidth="1.8" markerEnd="url(#rays-p-a)" />
      <MathLabel x={endX + 4} y={oy + slope * (endX - ox) + 14} size={13} fill={AMBER} runs={[["d", "b"]]} />
    </svg>
  );
}
