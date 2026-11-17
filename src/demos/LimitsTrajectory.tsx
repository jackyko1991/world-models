/**
 * Concepts ▸ Scope ▸ physics: a drawn illustration (not model output) of three ways a generated clip can look
 * plausible frame by frame and still break a physical rule. Left: what physics requires (gray, "true"); right: a
 * typical failure (amber, "model"). Earlier frames are fainter; the reader picks the rule with buttons.
 */
import { useLang } from "@learnkit/web";
import { useState } from "react";
import { DemoButton, type L } from "../pages/kit.tsx";

const AMBER = "#b45309";
const GRAY = "#374151";
const FLOOR = 140;
const R = 9;

interface Ball {
  x: number;
  /** centre height (defaults to resting on the floor) */
  y?: number;
  /** radius (defaults to R) */
  r?: number;
  /** behind an occluder: drawn as a dashed outline */
  hidden?: boolean;
}

interface Scenario {
  id: string;
  label: L;
  law: L;
  failure: L;
  /** scenery behind the balls: "wall" or "screen" */
  prop?: "wall" | "screen";
  right: Ball[];
  wrong: Ball[];
  /** where the ball should have been, but is not (wrong panel only) */
  missing?: number[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "wall",
    label: ["Through a wall", "穿牆而過"],
    law: ["Solid objects do not pass through each other.", "固體不會彼此穿透。"],
    failure: ["The ball goes on through the wall, unchanged.", "球直接穿過牆，毫無改變。"],
    prop: "wall",
    right: [{ x: 30, y: 50 }, { x: 80, y: 57 }, { x: 130, y: 70 }, { x: 180, y: 90 }, { x: 223, y: 116 }, { x: 185 }, { x: 145 }],
    wrong: [{ x: 30, y: 50 }, { x: 80, y: 57 }, { x: 130, y: 70 }, { x: 180, y: 90 }, { x: 239, y: 118 }, { x: 285 }],
  },
  {
    id: "permanence",
    label: ["Behind a screen", "躲到屏幕後"],
    law: ["Objects keep existing when hidden (object permanence).", "物體被遮住時仍然存在（物體恆存）。"],
    failure: ["The ball goes behind the screen and never comes out.", "球走到屏幕後面，就再也沒出來。"],
    prop: "screen",
    right: [{ x: 30 }, { x: 72 }, { x: 114 }, { x: 156, hidden: true }, { x: 198, hidden: true }, { x: 240 }, { x: 280 }],
    wrong: [{ x: 30 }, { x: 72 }, { x: 114 }, { x: 156, hidden: true }],
    missing: [240, 280],
  },
  {
    id: "size",
    label: ["Changing size", "大小改變"],
    law: ["A rigid ball keeps its size (its mass is conserved).", "剛性的球大小不變（質量守恆）。"],
    failure: ["The ball swells as it rolls, as if matter were being added.", "球邊滾邊脹大，彷彿憑空多出了物質。"],
    right: [{ x: 35 }, { x: 80 }, { x: 125 }, { x: 170 }, { x: 215 }, { x: 260 }],
    wrong: [{ x: 35 }, { x: 80, r: 10.5 }, { x: 125, r: 12.5 }, { x: 170, r: 15 }, { x: 215, r: 18 }, { x: 260, r: 21 }],
  },
];

function Panel({ s, wrong }: { s: Scenario; wrong: boolean }) {
  const { pick } = useLang();
  const balls = wrong ? s.wrong : s.right;
  const colour = wrong ? AMBER : GRAY;
  const title: L = wrong ? ["A physically wrong clip", "違反物理的片段"] : ["What physics requires", "物理要求的結果"];
  const last = balls.length - 1;
  return (
    <svg
      viewBox="0 0 310 172"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={`${pick(title)}: ${pick(wrong ? s.failure : s.law)}`}
    >
      <text x={8} y={18} className="text-[13px] font-semibold" fill={colour}>
        {pick(title)}
      </text>
      {/* floor */}
      <line x1={8} x2={302} y1={FLOOR} y2={FLOOR} stroke="#9ca3af" strokeWidth={1.5} />
      {s.prop === "wall" && <rect x={232} y={58} width={14} height={FLOOR - 58} fill="#d1d5db" stroke="#6b7280" />}
      {/* balls, earliest faintest; hidden ones drawn dashed and the screen drawn over them */}
      {balls.map((b, i) => (
        <circle
          key={i}
          cx={b.x}
          cy={b.y ?? FLOOR - (b.r ?? R)}
          r={b.r ?? R}
          fill={b.hidden ? "none" : colour}
          fillOpacity={0.15 + (0.85 * i) / Math.max(1, last)}
          stroke={colour}
          strokeWidth={1.2}
          strokeDasharray={b.hidden ? "3 3" : undefined}
        />
      ))}
      {s.prop === "screen" && <rect x={135} y={70} width={84} height={FLOOR - 70} fill="#e5e7eb" fillOpacity={0.85} stroke="#6b7280" />}
      {wrong &&
        s.missing?.map((x) => (
          <g key={x}>
            <circle cx={x} cy={FLOOR - R} r={R} fill="none" stroke={AMBER} strokeWidth={1.2} strokeDasharray="2 3" />
            <text x={x} y={FLOOR - R + 4} textAnchor="middle" className="text-[11px] font-semibold" fill={AMBER}>
              ?
            </text>
          </g>
        ))}
      {/* frame numbers above the balls */}
      {balls.map((b, i) => (
        <text key={i} x={b.x} y={(b.y ?? FLOOR - (b.r ?? R)) - (b.r ?? R) - 4} textAnchor="middle" className="text-[10px]" fill="#6b7280">
          {i}
        </text>
      ))}
      {wrong && s.id === "wall" && (
        <text x={239} y={48} textAnchor="middle" className="text-[16px] font-bold" fill={AMBER}>
          ✕
        </text>
      )}
      <text x={8} y={162} className="text-[11px]" fill="#4b5563">
        {pick(["frame", "影格"])} 0 → {last}
      </text>
    </svg>
  );
}

/** Two panels, consistent and wrong, for the scenario picked with the buttons. Illustration, drawn by hand. */
export default function LimitsTrajectory() {
  const { pick } = useLang();
  const [id, setId] = useState(SCENARIOS[0].id);
  const s = SCENARIOS.find((x) => x.id === id)!;
  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={pick(["Choose a rule", "選擇一條規則"])}>
        {SCENARIOS.map((x) => (
          <DemoButton key={x.id} onClick={() => setId(x.id)} active={x.id === id}>
            {pick(x.label)}
          </DemoButton>
        ))}
      </div>
      <div className="grid justify-items-center gap-3 sm:grid-cols-2">
        <Panel s={s} wrong={false} />
        <Panel s={s} wrong />
      </div>
      <dl className="mx-auto grid max-w-2xl gap-1 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-3">
        <dt className="font-semibold text-gray-700">{pick(["Rule", "規則"])}</dt>
        <dd className="text-gray-700">{pick(s.law)}</dd>
        <dt className="font-semibold" style={{ color: AMBER }}>
          {pick(["Violation", "違反之處"])}
        </dt>
        <dd className="text-gray-700">{pick(s.failure)}</dd>
      </dl>
    </div>
  );
}
