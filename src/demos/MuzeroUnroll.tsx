/**
 * A static diagram of MuZero's learned model unrolled for two steps (Concepts ▸ Planning and imagination ▸ muzero):
 * h turns observations into a hidden state, g steps it with an action and predicts a reward, f predicts a policy
 * and a value. The learned functions are amber; the only things compared with real data are r, p and v.
 */
import { useLang } from "@learnkit/web";

const AMBER = "#b45309";
const SUP = ["⁰", "¹", "²"];

export default function MuzeroUnroll() {
  const { pick } = useLang();
  const box = (x: number, y: number, label: string, learned = false) => (
    <g>
      <rect x={x - 18} y={y - 14} width={36} height={28} rx={6} fill={learned ? "#fffbeb" : "white"} stroke={learned ? AMBER : "#9ca3af"} strokeWidth={1.5} />
      <text x={x} y={y + 5} textAnchor="middle" className="text-[13px] font-semibold" fill={learned ? AMBER : "#374151"} fontStyle="italic">
        {label}
      </text>
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-gray-400" strokeWidth={1.3} markerEnd="url(#wm-mz-arrow)" />
  );
  const state = (x: number, k: number) => (
    <g>
      <circle cx={x} cy={70} r={15} className="fill-white stroke-gray-500" strokeWidth={1.5} />
      <text x={x} y={75} textAnchor="middle" className="fill-gray-800 text-[12px]" fontStyle="italic">
        s{SUP[k]}
      </text>
    </g>
  );
  const outputs = (x: number, k: number) => (
    <g>
      {arrow(x, 86, x, 108)}
      {box(x, 124, "f", true)}
      {arrow(x, 139, x, 160)}
      <text x={x} y={176} textAnchor="middle" className="fill-gray-700 text-[11px]" fontStyle="italic">
        p{SUP[k]}, v{SUP[k]}
      </text>
    </g>
  );
  const xs = [150, 300, 450];
  return (
    <svg viewBox="0 0 560 200" className="h-auto w-full max-w-[560px]" role="img" aria-label={pick(["MuZero's model unrolled two steps", "MuZero 的模型展開兩步"])}>
      <defs>
        <marker id="wm-mz-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="fill-gray-400" />
        </marker>
      </defs>
      <text x={4} y={74} className="fill-gray-700 text-[11px]" fontStyle="italic">
        o₁…oₜ
      </text>
      {arrow(40, 70, 60, 70)}
      {box(80, 70, "h", true)}
      {arrow(98, 70, xs[0] - 17, 70)}
      {xs.map((x, k) => (
        <g key={k}>
          {state(x, k)}
          {outputs(x, k)}
        </g>
      ))}
      {[0, 1].map((k) => {
        const mid = (xs[k] + xs[k + 1]) / 2;
        return (
          <g key={k}>
            {arrow(xs[k] + 16, 70, mid - 19, 70)}
            {box(mid, 70, "g", true)}
            {arrow(mid + 19, 70, xs[k + 1] - 17, 70)}
            <text x={mid} y={34} textAnchor="middle" className="fill-gray-700 text-[11px]" fontStyle="italic">
              a{SUP[k + 1]}
            </text>
            {arrow(mid, 38, mid, 55)}
            {arrow(mid, 85, mid, 104)}
            <text x={mid} y={118} textAnchor="middle" className="fill-gray-700 text-[11px]" fontStyle="italic">
              r{SUP[k + 1]}
            </text>
          </g>
        );
      })}
      <text x={520} y={74} textAnchor="end" className="fill-gray-400 text-[11px]">
        …
      </text>
    </svg>
  );
}
