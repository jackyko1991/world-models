/** Picture for the calibration equation of Coding Skills ▸ Checking a world model (#/skills/checking). Static SVG. */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, AMBER_L, GRAY, MUTED, SVG_CLASS, Tx, line } from "./FoundationsPictures.tsx";

/** coverage(p) and calibration error: eight predicted intervals with the true outcomes, and the reliability plot. */
export function CoveragePicture() {
  const { pick } = useLang();
  // test cases: predicted mean, interval half-width z_p·s_n, true outcome (px, y down)
  const cases = [
    { mu: 82, h: 26, y: 72 },
    { mu: 96, h: 20, y: 102 },
    { mu: 72, h: 26, y: 112 },
    { mu: 100, h: 24, y: 88 },
    { mu: 86, h: 18, y: 80 },
    { mu: 108, h: 24, y: 64 },
    { mu: 90, h: 22, y: 106 },
    { mu: 76, h: 28, y: 96 },
  ];
  const inside = cases.filter((c) => Math.abs(c.y - c.mu) <= c.h).length;
  // reliability plot
  const ox = 196;
  const oy = 150;
  const S = 108;
  const px = (p: number) => ox + p * S;
  const py = (c: number) => oy - c * S;
  const curve: [number, number][] = [
    [0, 0],
    [0.1, 0.05],
    [0.3, 0.19],
    [0.5, 0.35],
    [0.7, 0.53],
    [0.9, inside / cases.length],
    [1, 0.88],
  ];
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        `Left: eight predicted 90 % intervals with the true outcomes; ${inside} of 8 fall inside, so coverage(0.9) = ${(inside / 8).toFixed(2)}. Right: coverage against the nominal p; the curve sits below the diagonal, and the gaps to it are the calibration error.`,
        `左：八個預測的 90% 區間與真實結果；8 個中有 ${inside} 個落在區間內，所以 coverage(0.9) = ${(inside / 8).toFixed(2)}。右：覆蓋率對標稱機率 p 的圖；曲線位於對角線下方，與對角線的差距就是校準誤差。`,
      ])}
    >
      {/* left: intervals */}
      <Tx x={88} y={16} t="μ_n ± z_p s_n" size={13} fill={AMBER} />
      <Tx x={88} y={32} t="p = 0.9" size={11} fill={MUTED} word />
      {cases.map((c, n) => {
        const x = 22 + n * 19;
        const ok = Math.abs(c.y - c.mu) <= c.h;
        return (
          <g key={n}>
            <rect x={x - 4} y={c.mu - c.h} width="8" height={2 * c.h} rx="2" fill={AMBER_FILL} stroke={AMBER} strokeWidth="1" />
            <line x1={x - 5} y1={c.mu} x2={x + 5} y2={c.mu} stroke={AMBER} strokeWidth="1.6" />
            <circle cx={x} cy={c.y} r="3.6" fill={ok ? GRAY : "#fff"} stroke={GRAY} strokeWidth="1.6" />
          </g>
        );
      })}
      <Tx x={88} y={150} t="y_n" size={13} fill={GRAY} />
      <Tx x={88} y={170} t={pick([`${inside} of 8 inside`, `8 個中 ${inside} 個在內`])} size={11} fill={GRAY} word />
      {/* right: reliability */}
      <line x1={ox} y1={oy} x2={ox + S} y2={oy} stroke={GRAY} strokeWidth="1" />
      <line x1={ox} y1={oy} x2={ox} y2={oy - S} stroke={GRAY} strokeWidth="1" />
      <line x1={ox} y1={oy} x2={ox + S} y2={oy - S} stroke={MUTED} strokeWidth="1" strokeDasharray="4 3" />
      {curve.slice(1, -1).map(([p, c]) => (
        <line key={p} x1={px(p)} y1={py(c)} x2={px(p)} y2={py(p)} stroke={AMBER_L} strokeWidth="3" strokeOpacity="0.6" />
      ))}
      <path d={line(curve.map(([p, c]) => [px(p), py(c)]))} fill="none" stroke={AMBER} strokeWidth="2" />
      {curve.slice(1, -1).map(([p, c]) => (
        <circle key={p} cx={px(p)} cy={py(c)} r={p === 0.9 ? 4.5 : 3} fill={AMBER} />
      ))}
      <line x1={ox} y1={py(inside / 8)} x2={px(0.9)} y2={py(inside / 8)} stroke={AMBER} strokeWidth="1" strokeDasharray="2 2" />
      <Tx x={ox - 4} y={py(inside / 8) + 4} t={(inside / 8).toFixed(2)} size={11} fill={AMBER} anchor="end" word />
      <Tx x={ox + S} y={oy + 16} t="p" size={13} fill={GRAY} anchor="end" />
      <Tx x={ox} y={oy + 16} t="0" size={11} fill={MUTED} word />
      <Tx x={ox - 6} y={oy - S + 4} t="1" size={11} fill={MUTED} anchor="end" word />
      <Tx x={ox + 4} y={oy - S - 6} t="coverage(p)" size={11} fill={GRAY} anchor="start" word />
    </svg>
  );
}
