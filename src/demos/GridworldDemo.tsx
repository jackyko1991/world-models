/**
 * The gridworld demo (Concepts ▸ What is a world model? ▸ loop): the reader moves with the arrow keys or the buttons;
 * the world takes the true step, the learned model predicts it from the same state, and the two next frames are drawn
 * side by side with the cells where they differ outlined. Also `GridworldTypes` (Coding Skills ▸ types): the State
 * fields beside the map, each highlighting what it stores.
 */
import { useLang } from "@learnkit/web";
import { useState, type KeyboardEvent } from "react";
import { COLS, diffCells, learnedStep, observe, ROWS, start, trueStep, type Action, type Frame, type State } from "../models/gridworld.ts";
import { DemoButton } from "../pages/kit.tsx";
import { COLOR } from "./RolloutPlot.tsx";

const CELL = 34;

/** One frame of the gridworld as SVG. `agent` colours the agent; `marked` cells get an outline; `band` tints cells. */
export function GridSvg({
  frame,
  agent,
  marked = [],
  band,
  label,
}: {
  frame: Frame;
  agent: string;
  marked?: [number, number][];
  band?: (r: number, c: number) => boolean;
  label: string;
}) {
  return (
    <svg viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`} className="h-auto w-full max-w-[280px]" role="img" aria-label={label}>
      {frame.map((line, r) =>
        line.map((ch, c) => {
          const x = c * CELL;
          const y = r * CELL;
          const cx = x + CELL / 2;
          const cy = y + CELL / 2;
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                fill={ch === "#" ? "#4b5563" : ch === "~" ? "#e0f2fe" : ch === "G" ? "#d1fae5" : "#ffffff"}
                stroke="#e5e7eb"
              />
              {ch === "~" && (
                <path d={`M${x + 7},${cy - 3} q5,-5 10,0 t10,0 M${x + 7},${cy + 5} q5,-5 10,0 t10,0`} fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
              )}
              {ch === "G" && (
                <g stroke="#047857" strokeWidth="2" fill="#10b981">
                  <line x1={cx - 6} y1={cy + 10} x2={cx - 6} y2={cy - 10} />
                  <path d={`M${cx - 6},${cy - 10} l13,4 l-13,4 z`} />
                </g>
              )}
              {ch === "K" && (
                <g stroke="#374151" strokeWidth="2" fill="none">
                  <circle cx={cx - 5} cy={cy} r="4.5" />
                  <path d={`M${cx - 0.5},${cy} h11 m-3,0 v4 m-4,-4 v3`} />
                </g>
              )}
              {ch === "D" && (
                <g>
                  <rect x={x + 4} y={y + 2} width={CELL - 8} height={CELL - 4} fill="#78716c" stroke="#44403c" />
                  <circle cx={x + CELL - 10} cy={cy} r="2" fill="#e7e5e4" />
                </g>
              )}
              {band?.(r, c) && <rect x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2} fill={COLOR.second} opacity="0.22" />}
              {ch === "A" && <circle cx={cx} cy={cy} r={CELL * 0.3} fill={agent} />}
            </g>
          );
        }),
      )}
      {marked.map(([r, c]) => (
        <rect key={`m${r}-${c}`} x={c * CELL + 2} y={r * CELL + 2} width={CELL - 4} height={CELL - 4} fill="none" stroke={COLOR.diff} strokeWidth="3" strokeDasharray="5 3" />
      ))}
    </svg>
  );
}

const ARROWS: Record<string, Action> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
const ARROW_GLYPH: Record<Action, string> = { up: "↑", down: "↓", left: "←", right: "→" };

/** Arrow buttons in a cross, so the demo works by touch and by keyboard tabbing. */
export function MovePad({ onMove }: { onMove: (a: Action) => void }) {
  const { pick } = useLang();
  const names: Record<Action, [string, string]> = { up: ["Up", "上"], down: ["Down", "下"], left: ["Left", "左"], right: ["Right", "右"] };
  const b = (a: Action) => (
    <button
      onClick={() => onMove(a)}
      aria-label={pick(names[a])}
      className="h-9 w-9 rounded-md border border-gray-300 bg-white text-base text-gray-700 hover:bg-gray-50"
    >
      {ARROW_GLYPH[a]}
    </button>
  );
  return (
    <div className="grid grid-cols-3 gap-1" role="group" aria-label={pick(["Move the agent", "移動智能體"])}>
      <span />
      {b("up")}
      <span />
      {b("left")}
      {b("down")}
      {b("right")}
    </div>
  );
}

interface Last {
  from: State;
  action: Action;
  truth: State;
  predicted: State;
  rewardTrue: number;
  rewardPred: number;
}

export default function GridworldDemo() {
  const { pick } = useLang();
  const [state, setState] = useState<State>(start);
  const [last, setLast] = useState<Last | null>(null);
  const [tally, setTally] = useState({ steps: 0, wrong: 0 });

  const move = (a: Action) => {
    const t = trueStep(state, a);
    const m = learnedStep(state, a);
    const wrong = JSON.stringify(t) !== JSON.stringify(m);
    setLast({ from: state, action: a, truth: t.next, predicted: m.next, rewardTrue: t.reward, rewardPred: m.reward });
    setTally((x) => ({ steps: x.steps + 1, wrong: x.wrong + (wrong ? 1 : 0) }));
    setState(t.next);
  };
  const reset = () => {
    setState(start());
    setLast(null);
    setTally({ steps: 0, wrong: 0 });
  };
  const onKey = (e: KeyboardEvent) => {
    const a = ARROWS[e.key];
    if (a) {
      e.preventDefault();
      move(a);
    }
  };

  const trueFrame = observe(last ? last.truth : state);
  const predFrame = observe(last ? last.predicted : state);
  const diff = diffCells(trueFrame, predFrame);

  let why: [string, string];
  if (!last) why = ["Press an arrow key (click the map first) or use the buttons. Try the ice on the top row, and the door on the right once you hold the key.", "按方向鍵（先點一下地圖）或使用按鈕。試試上排的冰面；拿到鑰匙後，再試試右邊的門。"];
  else if (diff.length === 0) why = ["The model's prediction matches the world exactly.", "模型的預測與世界完全一致。"];
  else if (last.truth.doorOpen && !last.from.doorOpen)
    why = ["The world opened the door, because you hold the key. The model never saw a door open, so it predicts that you bump into it.", "你拿著鑰匙，所以世界打開了門。模型從沒看過門被打開，所以預測你會撞上它。"];
  else why = ["The world slid you across the ice. The model never saw ice in its training data, so it predicts an ordinary one-cell move.", "世界讓你在冰面上滑過去。模型的訓練資料裡從沒出現冰面，所以它預測普通的一格移動。"];

  return (
    <div className="w-full space-y-3 outline-none" tabIndex={0} onKeyDown={onKey} aria-label={pick(["Gridworld: use the arrow keys to move", "格子世界：用方向鍵移動"])}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-semibold" style={{ color: COLOR.model }}>
            {pick(["Model's predicted next frame", "模型預測的下一個畫面"])}
          </p>
          <GridSvg frame={predFrame} agent={COLOR.model} marked={diff} label={pick(["Predicted frame", "預測的畫面"])} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-semibold" style={{ color: COLOR.truth }}>
            {pick(["True next frame", "真實的下一個畫面"])}
          </p>
          <GridSvg frame={trueFrame} agent={COLOR.truth} marked={diff} label={pick(["True frame", "真實的畫面"])} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <MovePad onMove={move} />
        <div className="space-y-1 text-xs text-gray-600">
          <p>
            {pick(["Steps", "步數"])}: <span className="font-mono">{tally.steps}</span> · {pick(["mispredicted", "預測錯誤"])}:{" "}
            <span className="font-mono">{tally.wrong}</span>
          </p>
          <p>
            {pick(["Holding the key", "持有鑰匙"])}: {state.hasKey ? pick(["yes", "是"]) : pick(["no", "否"])}
            {last && (
              <>
                {" "}
                · {pick(["reward (true / predicted)", "獎勵（真實／預測）"])}: <span className="font-mono">{last.rewardTrue} / {last.rewardPred}</span>
              </>
            )}
          </p>
          <DemoButton onClick={reset}>{pick(["Reset", "重設"])}</DemoButton>
        </div>
      </div>
      <p className="min-h-10 text-center text-xs text-gray-700" aria-live="polite">
        {last && (
          <span className="font-mono">
            {ARROW_GLYPH[last.action]}{" "}
          </span>
        )}
        {pick(why)}
        {diff.length > 0 && (
          <span style={{ color: COLOR.diff }}>
            {" "}
            {pick([`(${diff.length} cells differ, outlined.)`, `（${diff.length} 個格子不同，已用框線標出。）`])}
          </span>
        )}
      </p>
    </div>
  );
}

/** Coding Skills ▸ types: the State fields; hovering or focusing one tints the cells it describes. */
export function GridworldTypes() {
  const { pick } = useLang();
  const s: State = { row: 2, col: 6, hasKey: true, doorOpen: false };
  const [field, setField] = useState<string | null>(null);
  const fields: { key: string; value: string; note: [string, string]; band: (r: number, c: number) => boolean }[] = [
    { key: "row", value: String(s.row), note: ["which row the agent is on (0 at the top)", "智能體在第幾列（最上面是 0）"], band: (r) => r === s.row },
    { key: "col", value: String(s.col), note: ["which column (0 at the left)", "第幾行（最左邊是 0）"], band: (_, c) => c === s.col },
    { key: "hasKey", value: String(s.hasKey), note: ["the key has been picked up, so its cell now draws as floor", "鑰匙已被撿起，所以它的格子畫成地板"], band: (r, c) => r === 3 && c === 1 },
    { key: "doorOpen", value: String(s.doorOpen), note: ["the door is still shut: the next move down opens it", "門還關著：再往下走一步就會打開它"], band: (r, c) => r === 3 && c === 6 },
  ];
  const active = fields.find((f) => f.key === field);
  return (
    <div className="grid w-full items-center gap-4 sm:grid-cols-2">
      <div className="flex justify-center">
        <GridSvg frame={observe(s)} agent={COLOR.truth} band={active?.band} label={pick(["The gridworld in the state shown", "所示狀態下的格子世界"])} />
      </div>
      <div className="font-mono text-xs">
        <p className="text-gray-500">const s: State = {"{"}</p>
        {fields.map((f) => (
          <button
            key={f.key}
            onMouseEnter={() => setField(f.key)}
            onMouseLeave={() => setField(null)}
            onFocus={() => setField(f.key)}
            onBlur={() => setField(null)}
            className={`block w-full rounded px-3 py-0.5 text-left ${field === f.key ? "bg-sky-100" : "hover:bg-gray-100"}`}
          >
            {f.key}: <span className="text-amber-800">{f.value}</span>,
          </button>
        ))}
        <p className="text-gray-500">{"};"}</p>
        <p className="mt-2 min-h-8 font-sans text-gray-600" aria-live="polite">
          {active ? pick(active.note) : pick(["Hover over or tab to a field.", "把滑鼠移到欄位上，或用 Tab 鍵選取。"])}
        </p>
      </div>
    </div>
  );
}
