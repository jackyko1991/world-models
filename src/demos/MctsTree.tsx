/**
 * Monte Carlo tree search on a tic-tac-toe position, one phase at a time (Concepts ▸ Planning and imagination ▸
 * muzero): selection, expansion, simulation, backup. The root's children are drawn as small boards with their visit
 * count N and mean result Q (for X); their children as circles with N. Deeper nodes exist but are only counted.
 */
import { useLang } from "@learnkit/web";
import { useRef, useState } from "react";
import { backup, expand, legal, newNode, select, simulate, winner, type Board, type MctsNode } from "../models/mcts.ts";
import { rng, type Rng } from "../models/rng.ts";
import { DemoButton } from "../pages/kit.tsx";

const AMBER = "#b45309";
const TRUE = "#374151";
const SEED = 5;
/** X to move: X can win at 6 (left column); O threatens 5 (right column). */
export const MCTS_POSITION: Board = [1, 0, -1, 1, 0, 0, 0, 0, -1];

type Phase = "idle" | "selected" | "expanded" | "simulated" | "backed";

interface Step {
  path: MctsNode[];
  added: MctsNode | null;
  end: Board | null;
}

function MiniBoard({ b, x, y, size, mark, stroke }: { b: Board; x: number; y: number; size: number; mark?: number; stroke?: string }) {
  const c = size / 3;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2})`}>
      <rect width={size} height={size} rx={3} className="fill-white" stroke={stroke ?? "#d1d5db"} strokeWidth={stroke ? 2 : 1} />
      {[1, 2].map((i) => (
        <g key={i}>
          <line x1={i * c} x2={i * c} y1={2} y2={size - 2} className="stroke-gray-200" />
          <line y1={i * c} y2={i * c} x1={2} x2={size - 2} className="stroke-gray-200" />
        </g>
      ))}
      {b.map((v, i) =>
        v === 0 ? null : (
          <text
            key={i}
            x={(i % 3) * c + c / 2}
            y={Math.floor(i / 3) * c + c / 2 + c * 0.3}
            textAnchor="middle"
            fontSize={c * 0.85}
            fontWeight={i === mark ? 700 : 400}
            fill={i === mark ? AMBER : v === 1 ? TRUE : "#6b7280"}
          >
            {v === 1 ? "X" : "O"}
          </text>
        ),
      )}
    </g>
  );
}

const count = (n: MctsNode): number => 1 + n.children.reduce((s, c) => s + count(c), 0);

export default function MctsTree() {
  const { pick } = useLang();
  const root = useRef<MctsNode>(newNode(MCTS_POSITION));
  const r = useRef<Rng>(rng(SEED));
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState<Step>({ path: [], added: null, end: null });
  const [iters, setIters] = useState(0);

  const nextPhase = () => {
    if (phase === "idle" || phase === "backed") {
      setStep({ path: select(root.current), added: null, end: null });
      setPhase("selected");
    } else if (phase === "selected") {
      const leaf = step.path[step.path.length - 1];
      const child = expand(leaf, r.current);
      setStep({ ...step, path: child === leaf ? step.path : [...step.path, child], added: child === leaf ? null : child });
      setPhase("expanded");
    } else if (phase === "expanded") {
      setStep({ ...step, end: simulate(step.path[step.path.length - 1].board, r.current) });
      setPhase("simulated");
    } else if (phase === "simulated" && step.end) {
      backup(step.path, winner(step.end)!);
      setIters((i) => i + 1);
      setPhase("backed");
    }
  };
  const run = (k: number) => {
    // finish the iteration in progress, then run k more
    let done = 0;
    let s = step;
    let ph = phase;
    if (ph !== "idle" && ph !== "backed") {
      if (ph === "selected") {
        const leaf = s.path[s.path.length - 1];
        const child = expand(leaf, r.current);
        s = { ...s, path: child === leaf ? s.path : [...s.path, child], added: child === leaf ? null : child };
        ph = "expanded";
      }
      if (ph === "expanded") s = { ...s, end: simulate(s.path[s.path.length - 1].board, r.current) };
      backup(s.path, winner(s.end!)!);
      done++;
      k--;
    }
    for (let i = 0; i < k; i++) {
      const path = select(root.current);
      const leaf = path[path.length - 1];
      const child = expand(leaf, r.current);
      if (child !== leaf) path.push(child);
      const end = simulate(child.board, r.current);
      backup(path, winner(end)!);
      s = { path, added: child === leaf ? null : child, end };
      done++;
    }
    setStep(s);
    setIters((i) => i + done);
    setPhase("backed");
  };
  const reset = () => {
    root.current = newNode(MCTS_POSITION);
    r.current = rng(SEED);
    setStep({ path: [], added: null, end: null });
    setIters(0);
    setPhase("idle");
  };

  const W = 640;
  const rootMoves = legal(MCTS_POSITION);
  const slot = W / rootMoves.length;
  const x1 = (i: number) => slot * (i + 0.5);
  const onPath = new Set(step.path);
  const R = root.current;
  const kids = new Map(R.children.map((c) => [c.move, c]));
  const deeper = R.children.reduce((s, c) => s + c.children.reduce((t, g) => t + count(g) - 1, 0), 0);
  const top = R.children.length ? R.children.reduce((a, b) => (b.n > a.n ? b : a)) : null;
  const result = step.end ? winner(step.end) : null;

  const phaseText: Record<Phase, [string, string]> = {
    idle: ["X to move. Press Next phase to start the first iteration.", "輪到 X。按「下一步」開始第一輪。"],
    selected: [
      "1 · Selection: from the root, follow the child with the highest UCT score while every move of a node has been tried (amber path).",
      "1 · 選擇：從根出發，只要節點的每個走法都試過，就沿著 UCT 分數最高的子節點往下走（琥珀色路徑）。",
    ],
    expanded: ["2 · Expansion: add one untried move as a new node (filled amber).", "2 · 擴展：把一個還沒試過的走法加成新節點（實心琥珀色）。"],
    simulated: [
      `3 · Simulation: random moves from the new node to the end of the game: ${result === 1 ? "X wins" : result === -1 ? "O wins" : "a draw"}.`,
      `3 · 模擬：從新節點隨機下到終局：${result === 1 ? "X 勝" : result === -1 ? "O 勝" : "和局"}。`,
    ],
    backed: [
      "4 · Backup: every node on the path gets one more visit and the result (+1 win, 0 draw, −1 loss for the player who moved into it).",
      "4 · 回傳：路徑上每個節點的造訪次數加一，並加上結果（對走進該節點的一方：勝 +1、和 0、負 −1）。",
    ],
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-start justify-center gap-3">
        <svg viewBox={`0 0 ${W} 300`} className="h-auto w-full max-w-[600px]" role="img" aria-label={pick(["Search tree", "搜尋樹"])}>
          <MiniBoard b={MCTS_POSITION} x={W / 2} y={34} size={54} stroke={onPath.has(R) ? AMBER : TRUE} />
          <text x={W / 2 + 36} y={30} className="fill-gray-700 text-[11px]">
            N = {R.n}
          </text>
          {rootMoves.map((mv, i) => {
            const c = kids.get(mv);
            const x = x1(i);
            const grand = c ? legal(c.board) : [];
            const gs = 26;
            return (
              <g key={mv}>
                <line x1={W / 2} y1={61} x2={x} y2={112} stroke={c && onPath.has(c) ? AMBER : "#d1d5db"} strokeWidth={c && onPath.has(c) ? 2.5 : 1} strokeDasharray={c ? undefined : "3 3"} />
                {c ? (
                  <MiniBoard b={c.board} x={x} y={136} size={46} mark={mv} stroke={c === step.added ? AMBER : onPath.has(c) ? AMBER : undefined} />
                ) : (
                  <rect x={x - 23} y={113} width={46} height={46} rx={3} fill="none" className="stroke-gray-300" strokeDasharray="3 3" />
                )}
                {c === step.added && <rect x={x - 23} y={113} width={46} height={46} rx={3} fill={AMBER} fillOpacity={0.15} />}
                <text x={x} y={174} textAnchor="middle" className="fill-gray-700 text-[10px] tabular-nums">
                  {c ? `N ${c.n} · Q ${c.n ? (c.w / c.n).toFixed(2) : "–"}` : pick([`square ${mv}`, `第 ${mv} 格`])}
                </text>
                {c &&
                  grand.map((g, j) => {
                    const gc = c.children.find((k) => k.move === g);
                    const gx = x + (j - (grand.length - 1) / 2) * gs;
                    const hot = gc && onPath.has(gc);
                    return (
                      <g key={g}>
                        <line x1={x} y1={180} x2={gx} y2={222} stroke={hot ? AMBER : "#e5e7eb"} strokeWidth={hot ? 2.2 : 1} strokeDasharray={gc ? undefined : "2 3"} />
                        <circle cx={gx} cy={234} r={11} fill={gc === step.added ? AMBER : "white"} fillOpacity={gc === step.added ? 0.25 : 1} stroke={hot ? AMBER : gc ? "#9ca3af" : "#e5e7eb"} strokeWidth={hot ? 2 : 1} strokeDasharray={gc ? undefined : "2 2"} />
                        {gc && (
                          <text x={gx} y={238} textAnchor="middle" className="fill-gray-700 text-[9px] tabular-nums">
                            {gc.n}
                          </text>
                        )}
                        <text x={gx} y={258} textAnchor="middle" className="fill-gray-400 text-[8px]">
                          O{g}
                        </text>
                      </g>
                    );
                  })}
              </g>
            );
          })}
          <text x={W / 2} y={288} textAnchor="middle" className="fill-gray-500 text-[10px]">
            {pick([`${deeper} deeper nodes not drawn · squares numbered 0–8, row by row`, `另有 ${deeper} 個更深的節點未畫出 · 格子依列編號 0–8`])}
          </text>
        </svg>
        {step.end && (phase === "simulated" || phase === "backed") && (
          <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 70 70" className="h-auto w-[70px]" role="img" aria-label={pick(["Random playout", "隨機下完的棋局"])}>
              <MiniBoard b={step.end} x={35} y={35} size={64} />
            </svg>
            <p className="text-[11px] text-gray-600">{pick(["playout", "隨機下完"])}</p>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-gray-700" aria-live="polite">
        {pick(phaseText[phase])}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <DemoButton onClick={nextPhase} active>
          {pick(["Next phase", "下一步"])}
        </DemoButton>
        <DemoButton onClick={() => run(1)}>{pick(["1 iteration", "1 輪"])}</DemoButton>
        <DemoButton onClick={() => run(100)}>{pick(["100 iterations", "100 輪"])}</DemoButton>
        <DemoButton onClick={reset}>{pick(["Reset", "重設"])}</DemoButton>
      </div>
      <p className="text-center text-[11px] text-gray-600 tabular-nums">
        {pick([
          `Iterations: ${iters}. ${top ? `Most visited move so far: square ${top.move} (N = ${top.n}).` : ""}`,
          `已跑 ${iters} 輪。${top ? `目前造訪最多的走法：第 ${top.move} 格（N = ${top.n}）。` : ""}`,
        ])}
      </p>
    </div>
  );
}
