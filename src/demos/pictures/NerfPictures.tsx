/**
 * Static pictures for the NeRF equations (Concepts ▸ 3D scene models ▸ NeRF): the field F_Θ(x, d) → (σ, c) with the
 * photometric loss, and the positional encoding γ(p).
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_LIGHT, Arrowhead, CameraIcon, GRAY, MathLabel, SVG_CLASS } from "./VolumePictures.tsx";

/** F_Θ : (x, d) ↦ (σ, c) and the loss: a point on a ray and its view direction go into the network, a density and a
 * colour come out; rendered into a pixel, it is compared with the photo's pixel. */
export function NerfFieldPicture() {
  const { pick } = useLang();
  const layers = [3, 4, 4, 2];
  const box = { x: 140, y: 24, w: 74, h: 70 };
  const nodes = layers.map((n, l) =>
    Array.from({ length: n }, (_, k) => [box.x + 12 + l * 16.5, box.y + box.h / 2 + (k - (n - 1) / 2) * 14] as const),
  );
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "A camera ray with one point x on it and the viewing direction d. The pair goes into a small network F_Θ, which returns a density σ (a gauge) and a colour c (a swatch). The volume sum along the ray turns these into a predicted pixel Ĉ_Θ(r), which is compared with the same pixel of the photo, C_photo(r); the squared difference is the loss.",
        "一條相機光線，上面有一點 x 與觀看方向 d。這一對輸入小網路 F_Θ，網路回傳一個密度 σ（量表）和一個顏色 c（色塊）。沿光線的體積總和把它們變成預測像素 Ĉ_Θ(r)，再與照片中同一個像素 C_photo(r) 比較；差的平方就是損失。",
      ])}
    >
      <defs>
        <Arrowhead id="nerf-f-a" fill={AMBER} />
        <Arrowhead id="nerf-f-g" fill={GRAY} />
      </defs>
      {/* the ray, the point x and the direction d */}
      <CameraIcon x={30} y={58} />
      <line x1="32" y1="58" x2="124" y2="58" stroke={GRAY} strokeWidth="1.2" strokeDasharray="4 3" />
      <line x1="40" y1="44" x2="70" y2="44" stroke={GRAY} strokeWidth="1.6" markerEnd="url(#nerf-f-g)" />
      <MathLabel x={55} y={38} anchor="middle" runs={[["d", "b"]]} />
      <circle cx="96" cy="58" r="4.5" fill="#fff" stroke={GRAY} strokeWidth="1.6" />
      <MathLabel x={96} y={78} anchor="middle" runs={[["x", "b"]]} />
      <line x1="102" y1="58" x2={box.x - 2} y2="58" stroke={GRAY} strokeWidth="1.2" markerEnd="url(#nerf-f-g)" />
      {/* the network */}
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" fill="#fff" stroke={AMBER} strokeWidth="1.4" />
      {nodes.slice(1).map((col, l) =>
        col.map(([x, y], k) =>
          nodes[l].map(([px, py], j) => (
            <line key={`${l}-${k}-${j}`} x1={px} y1={py} x2={x} y2={y} stroke={AMBER_LIGHT} strokeWidth="0.6" opacity="0.7" />
          )),
        ),
      )}
      {nodes.flat().map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r="3.2" fill={AMBER_LIGHT} stroke={AMBER} strokeWidth="0.8" />
      ))}
      <MathLabel x={box.x + box.w / 2} y={16} anchor="middle" size={13} fill={AMBER} runs={["F", ["Θ", "_"]]} />
      {/* outputs: density σ (a gauge) and colour c (a swatch) */}
      <line x1={box.x + box.w} y1="46" x2="236" y2="36" stroke={AMBER} strokeWidth="1.2" markerEnd="url(#nerf-f-a)" />
      <rect x="240" y="16" width="10" height="36" fill="#fff" stroke={GRAY} />
      <rect x="240" y="30" width="10" height="22" fill={GRAY} opacity="0.7" />
      <MathLabel x={258} y={40} size={13} runs={["σ"]} />
      <line x1={box.x + box.w} y1="72" x2="236" y2="80" stroke={AMBER} strokeWidth="1.2" markerEnd="url(#nerf-f-a)" />
      <rect x="238" y="70" width="14" height="14" fill={AMBER_LIGHT} stroke={AMBER} />
      <MathLabel x={258} y={82} size={13} runs={[["c", "b"]]} />
      {/* rendering, then the comparison with the photo */}
      <line x1="270" y1="90" x2="270" y2="114" stroke={AMBER} strokeWidth="1.2" markerEnd="url(#nerf-f-a)" />
      <text x="276" y="106" fontSize="11" fill={AMBER}>Σ</text>
      <rect x="258" y="118" width="24" height="24" fill={AMBER_LIGHT} stroke={AMBER} strokeWidth="1.4" />
      <MathLabel x={270} y={160} anchor="middle" fill={AMBER} runs={["Ĉ", ["Θ", "_"], ["(", "r"], ["r", "b"], [")", "r"]]} />
      <rect x="40" y="112" width="70" height="46" fill="#fff" stroke={GRAY} />
      <path d="M40 158 L62 132 L76 146 L88 128 L110 152 V158 Z" fill={GRAY} opacity="0.2" />
      <rect x="78" y="124" width="12" height="12" fill={GRAY} opacity="0.85" />
      <line x1="90" y1="130" x2="118" y2="130" stroke={GRAY} strokeWidth="0.8" strokeDasharray="2 2" />
      <rect x="120" y="118" width="24" height="24" fill={GRAY} opacity="0.85" />
      <MathLabel x={78} y={174} anchor="middle" runs={["C", ["photo", "_"], ["(", "r"], ["r", "b"], [")", "r"]]} />
      <line x1="148" y1="130" x2="254" y2="130" stroke={GRAY} strokeWidth="1.2" markerStart="url(#nerf-f-g)" markerEnd="url(#nerf-f-g)" />
      <MathLabel x={200} y={122} anchor="middle" runs={[["‖ · ‖", "r"], ["2", "^"]]} />
      <text x="200" y="148" fontSize="11" textAnchor="middle" fill={GRAY}>
        {pick(["loss", "損失"])}
      </text>
    </svg>
  );
}

/** γ(p): one coordinate p read off by sines and cosines of doubling frequency, giving a feature vector. */
export function NerfEncodingPicture() {
  const { pick } = useLang();
  const L = 4;
  const x0 = 44;
  const x1 = 236;
  const p0 = 0.3;
  const xOf = (p: number) => x0 + ((p + 1) / 2) * (x1 - x0);
  const rowY = (k: number) => 30 + k * 34;
  const amp = 12;
  const wave = (k: number, f: (u: number) => number) => {
    const pts: string[] = [];
    for (let s = 0; s <= 240; s++) {
      const p = -1 + (2 * s) / 240;
      pts.push(`${xOf(p).toFixed(1)} ${(rowY(k) - amp * f(2 ** k * Math.PI * p)).toFixed(1)}`);
    }
    return `M${pts.join(" L")}`;
  };
  const barX = 286;
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "A coordinate p on a line from −1 to 1. Above it, four rows of waves, sin and cos of 2^k π p for k = 0 to 3, each twice as fast as the row before. A vertical line at p crosses every wave; the values it hits, shown as bars on the right, are the entries of γ(p).",
        "一條從 −1 到 1 的直線上的座標 p。上方有四列波，k = 0 到 3 的 sin 與 cos(2^k π p)，每一列的頻率是前一列的兩倍。在 p 的垂直線穿過每一條波；它碰到的值，畫在右側成為長條，就是 γ(p) 的各個分量。",
      ])}
    >
      {Array.from({ length: L }, (_, k) => (
        <g key={k}>
          <line x1={x0} y1={rowY(k)} x2={x1} y2={rowY(k)} stroke={GRAY} strokeWidth="0.4" opacity="0.5" />
          <path d={wave(k, Math.cos)} fill="none" stroke={AMBER_LIGHT} strokeWidth="1.2" strokeDasharray="3 2" />
          <path d={wave(k, Math.sin)} fill="none" stroke={AMBER} strokeWidth="1.4" />
          <MathLabel x={4} y={rowY(k) + 4} size={11} runs={[["2", "r"], [String(k), "^"], "π"]} />
          <circle cx={xOf(p0)} cy={rowY(k) - amp * Math.sin(2 ** k * Math.PI * p0)} r="2.6" fill={AMBER} />
          <circle cx={xOf(p0)} cy={rowY(k) - amp * Math.cos(2 ** k * Math.PI * p0)} r="2.6" fill="#fff" stroke={AMBER_LIGHT} strokeWidth="1.2" />
          {/* the two features this row contributes */}
          <line x1={barX} y1={rowY(k) - 9} x2={barX} y2={rowY(k) + 9} stroke={GRAY} strokeWidth="0.6" />
          <rect
            x={Math.min(barX, barX + 22 * Math.sin(2 ** k * Math.PI * p0))}
            y={rowY(k) - 7}
            width={Math.abs(22 * Math.sin(2 ** k * Math.PI * p0))}
            height="5"
            fill={AMBER}
          />
          <rect
            x={Math.min(barX, barX + 22 * Math.cos(2 ** k * Math.PI * p0))}
            y={rowY(k) + 2}
            width={Math.abs(22 * Math.cos(2 ** k * Math.PI * p0))}
            height="5"
            fill={AMBER_LIGHT}
          />
          <line x1={xOf(p0) + 4} y1={rowY(k)} x2={barX - 24} y2={rowY(k)} stroke={GRAY} strokeWidth="0.5" strokeDasharray="1 3" />
        </g>
      ))}
      <MathLabel x={barX} y={12} anchor="middle" runs={["γ", ["(", "r"], "p", [")", "r"]]} />
      <line x1={xOf(p0)} y1="12" x2={xOf(p0)} y2="158" stroke={GRAY} strokeWidth="1" strokeDasharray="3 3" />
      <line x1={x0} y1="160" x2={x1} y2="160" stroke={GRAY} strokeWidth="1" />
      <circle cx={xOf(p0)} cy="160" r="3.5" fill={GRAY} />
      <MathLabel x={xOf(p0)} y={176} anchor="middle" size={13} runs={["p"]} />
      <text x={x0} y="174" fontSize="11" textAnchor="middle" fill={GRAY}>−1</text>
      <text x={x1} y="174" fontSize="11" textAnchor="middle" fill={GRAY}>1</text>
      <g fontSize="11" fill={GRAY}>
        <line x1="250" y1="166" x2="262" y2="166" stroke={AMBER} strokeWidth="1.4" />
        <text x="265" y="170">sin</text>
        <line x1="250" y1="178" x2="262" y2="178" stroke={AMBER_LIGHT} strokeWidth="1.2" strokeDasharray="3 2" />
        <text x="265" y="181">cos</text>
      </g>
    </svg>
  );
}
