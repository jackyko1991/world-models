/**
 * Static pictures for the equations of Concepts ▸ Planning and imagination (#/concept/planning): what each
 * equation means physically. Used beside the equation by `Pictured`.
 * - PlanningObjectivePicture: J(a), the summed cost of an imagined H-step rollout; only a₀ is carried out.
 * - CemRefitPicture: CEM's refit, samples in plan space, the elites, the new (μ, σ) inside the old one.
 * - QUpdatePicture: the Q-learning / Dyna-Q update on two grid cells, with the step α towards r + γ max Q′.
 * - UctPicture: UCT scores of four moves, W/N plus an exploration bonus that shrinks with visits N.
 * - MuzeroLossPicture: MuZero's unrolled latent chain, predictions r, v, p against the real u, z, π.
 */
import { useLang } from "@learnkit/web";
import type { ReactNode } from "react";

const TRUE = "#374151";
const AMBER = "#b45309";
const AMBER_LIGHT = "#f59e0b";
const FAINT = "#9ca3af";
const SERIF = "Georgia, 'Times New Roman', serif";
const SVG_CLASS = "h-auto w-full max-w-[340px]";

/** A symbol label in serif italic. */
function Sym({ x, y, children, fill = TRUE, size = 13, anchor = "middle", weight }: {
  x: number;
  y: number;
  children: ReactNode;
  fill?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text x={x} y={y} fill={fill} fontSize={size} fontFamily={SERIF} fontStyle="italic" textAnchor={anchor} fontWeight={weight}>
      {children}
    </text>
  );
}

/** A plain (sans) note. */
function Note({ x, y, children, fill = "#6b7280", anchor = "middle" }: {
  x: number;
  y: number;
  children: ReactNode;
  fill?: string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text x={x} y={y} fill={fill} fontSize={11} textAnchor={anchor}>
      {children}
    </text>
  );
}

function Arrowheads({ id }: { id: string }) {
  return (
    <defs>
      {[
        ["t", TRUE],
        ["a", AMBER],
        ["f", FAINT],
      ].map(([k, c]) => (
        <marker key={k} id={`${id}-${k}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={c} />
        </marker>
      ))}
    </defs>
  );
}

/* ---------- J(a): an H-step imagined rollout, costs summed, first action executed ---------- */

export function PlanningObjectivePicture() {
  const { pick } = useLang();
  const goal = { x: 296, y: 46 };
  const s = { x: 66, y: 122 };
  const pred = [
    { x: 102, y: 108 },
    { x: 138, y: 94 },
    { x: 174, y: 82 },
    { x: 210, y: 72 },
    { x: 246, y: 64 },
  ];
  // Cost of each step: distance of ŝₜ₊₁ to the goal (scaled to a bar height).
  const cost = pred.map((p) => Math.hypot(goal.x - p.x, goal.y - p.y));
  const base = 152;
  const scale = 26 / cost[0];
  const path = [s, ...pred].map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "From the current state s, the model imagines H future states; each step's cost is a bar, and J is the sum of the bars. Only the first action a₀ is carried out in the real world.",
        "從目前狀態 s 出發，模型想像 H 個未來狀態；每一步的成本是一根長條，J 是長條的總和。只有第一個動作 a₀ 會在真實世界中執行。",
      ])}
    >
      <Arrowheads id="pobj" />
      {/* the planning window */}
      <rect x={58} y={22} width={206} height={132} rx={6} fill="#fef3c7" fillOpacity={0.55} stroke={AMBER_LIGHT} strokeDasharray="4 3" />
      <Note x={161} y={16} fill={AMBER}>
        {pick(["planning horizon", "規劃視野"])}{" "}
        <tspan fontFamily={SERIF} fontStyle="italic">H</tspan>
        {pick([" = 5 steps", " = 5 步"])}
      </Note>
      {/* goal */}
      <circle cx={goal.x} cy={goal.y} r={8} fill="none" stroke={TRUE} strokeWidth={1.5} />
      <circle cx={goal.x} cy={goal.y} r={3} fill={TRUE} />
      <Note x={goal.x} y={goal.y + 22} fill={TRUE}>{pick(["goal", "目標"])}</Note>
      {/* past, real trajectory */}
      <path d={`M14,150 L38,138 L${s.x},${s.y}`} fill="none" stroke={TRUE} strokeWidth={2} />
      <Note x={14} y={168} anchor="start">{pick(["past (real)", "過去（真實）"])}</Note>
      {/* imagined rollout */}
      <path d={path} fill="none" stroke={AMBER_LIGHT} strokeWidth={1.5} strokeDasharray="5 3" />
      {/* first action, executed for real */}
      <line x1={s.x} y1={s.y} x2={pred[0].x - 6} y2={pred[0].y + 2} stroke={TRUE} strokeWidth={2.5} markerEnd="url(#pobj-t)" />
      <Sym x={80} y={104} size={13}>
        a<tspan fontSize={10} dy={3}>0</tspan>
      </Sym>
      {pred.map((p, i) => (
        <g key={i}>
          {/* cost bar under each predicted state */}
          <rect x={p.x - 6} y={base - cost[i] * scale} width={12} height={cost[i] * scale} fill={AMBER_LIGHT} fillOpacity={0.75} />
          <line x1={p.x} y1={p.y + 5} x2={p.x} y2={base - cost[i] * scale - 2} stroke={AMBER_LIGHT} strokeWidth={0.75} strokeDasharray="2 2" />
          <circle cx={p.x} cy={p.y} r={4.5} fill="white" stroke={AMBER} strokeWidth={1.5} />
        </g>
      ))}
      <Sym x={pred[1].x + 2} y={pred[1].y - 10} fill={AMBER}>
        ŝ<tspan fontSize={10} dy={3}>2</tspan>
      </Sym>
      <Sym x={pred[4].x} y={pred[4].y - 10} fill={AMBER}>
        ŝ<tspan fontSize={10} dy={3}>H</tspan>
      </Sym>
      <circle cx={s.x} cy={s.y} r={5} fill={TRUE} />
      <Sym x={s.x - 2} y={s.y - 10}>s</Sym>
      <Sym x={161} y={170} fill={AMBER} size={12}>
        c(ŝ<tspan fontSize={9} dy={3}>t+1</tspan>
        <tspan dy={-3}>, a</tspan>
        <tspan fontSize={9} dy={3}>t</tspan>
        <tspan dy={-3}>)</tspan>
      </Sym>
      <Sym x={292} y={130} fill={AMBER} size={14}>J</Sym>
      <Note x={292} y={146} fill={AMBER}>{pick(["= Σ bars", "= 長條和"])}</Note>
    </svg>
  );
}

/* ---------- CEM: samples, elites, refit ---------- */

/** Deterministic standard normals (LCG + Box–Muller), so the picture is the same on every render. */
function normals(n: number, seed: number): number[] {
  let x = seed >>> 0;
  const u = () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return (x + 0.5) / 4294967296;
  };
  const out: number[] = [];
  while (out.length < n) {
    const r = Math.sqrt(-2 * Math.log(u()));
    const t = 2 * Math.PI * u();
    out.push(r * Math.cos(t), r * Math.sin(t));
  }
  return out.slice(0, n);
}

const CEM_OLD = { mx: 120, my: 108, sx: 40, sy: 26 };
const CHEAP = { x: 220, y: 64 };
const CEM_N = 24;
const CEM_K = 6;
const CEM_SAMPLES = (() => {
  const z = normals(2 * CEM_N, 7);
  return Array.from({ length: CEM_N }, (_, i) => ({
    x: Math.min(306, Math.max(14, CEM_OLD.mx + CEM_OLD.sx * z[2 * i])),
    y: Math.min(166, Math.max(30, CEM_OLD.my + CEM_OLD.sy * z[2 * i + 1])),
  }));
})();
const CEM_ELITES = new Set(
  CEM_SAMPLES.map((p, i) => ({ i, d: Math.hypot(p.x - CHEAP.x, p.y - CHEAP.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, CEM_K)
    .map((e) => e.i),
);
const CEM_NEW = (() => {
  const e = CEM_SAMPLES.filter((_, i) => CEM_ELITES.has(i));
  const mx = e.reduce((s, p) => s + p.x, 0) / e.length;
  const my = e.reduce((s, p) => s + p.y, 0) / e.length;
  const sx = Math.sqrt(e.reduce((s, p) => s + (p.x - mx) ** 2, 0) / e.length);
  const sy = Math.sqrt(e.reduce((s, p) => s + (p.y - my) ** 2, 0) / e.length);
  return { mx, my, sx, sy };
})();

export function CemRefitPicture() {
  const { pick } = useLang();
  const o = CEM_OLD;
  const n = CEM_NEW;
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        `Plan space: ${CEM_N} plans sampled from the old Gaussian (dashed ellipse). The ${CEM_K} cheapest, the elites, lie toward the low-cost region; the new mean μ and spread σ are fitted to them, a smaller ellipse shifted toward the cheap region.`,
        `計畫空間：從舊的高斯分布（虛線橢圓）取樣 ${CEM_N} 個計畫。最便宜的 ${CEM_K} 個（菁英）落在低成本區域那一側；新的平均 μ 與分散 σ 擬合到它們上，成為一個更小、移向便宜區域的橢圓。`,
      ])}
    >
      <Arrowheads id="cem" />
      {/* cost landscape: contours of J around the cheap region */}
      {[70, 48, 26].map((r, i) => (
        <circle key={r} cx={CHEAP.x} cy={CHEAP.y} r={r} fill="#e5e7eb" fillOpacity={0.35 + 0.15 * i} stroke="#d1d5db" />
      ))}
      <Note x={CHEAP.x + 38} y={20} fill={TRUE}>
        {pick(["low", "低"])} <tspan fontFamily={SERIF} fontStyle="italic">J</tspan>
      </Note>
      {/* old Gaussian */}
      <ellipse cx={o.mx} cy={o.my} rx={2 * o.sx} ry={2 * o.sy} fill="none" stroke={AMBER_LIGHT} strokeWidth={1.5} strokeDasharray="5 4" />
      <Note x={o.mx - 2 * o.sx + 4} y={o.my + 2 * o.sy + 12} fill={AMBER} anchor="start">
        {pick(["old", "舊"])}{" "}
        <tspan fontFamily={SERIF} fontStyle="italic">μ, σ</tspan>
      </Note>
      {/* samples */}
      {CEM_SAMPLES.map((p, i) =>
        CEM_ELITES.has(i) ? null : <circle key={i} cx={p.x} cy={p.y} r={3} fill="white" stroke={FAINT} strokeWidth={1.25} />,
      )}
      {/* new Gaussian, fitted to the elites */}
      <ellipse cx={n.mx} cy={n.my} rx={2 * n.sx} ry={2 * n.sy} fill={AMBER_LIGHT} fillOpacity={0.12} stroke={AMBER} strokeWidth={2} />
      {CEM_SAMPLES.map((p, i) =>
        CEM_ELITES.has(i) ? <circle key={i} cx={p.x} cy={p.y} r={3.8} fill={AMBER} /> : null,
      )}
      {/* mean moves */}
      {(() => {
        const d = Math.hypot(n.mx - o.mx, n.my - o.my);
        const t = (d - 9) / d;
        return <line x1={o.mx} y1={o.my} x2={o.mx + t * (n.mx - o.mx)} y2={o.my + t * (n.my - o.my)} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#cem-a)" />;
      })()}
      <path d={`M${o.mx - 5},${o.my - 5} l10,10 M${o.mx + 5},${o.my - 5} l-10,10`} stroke={AMBER_LIGHT} strokeWidth={1.5} />
      <path d={`M${n.mx - 5},${n.my - 5} l10,10 M${n.mx + 5},${n.my - 5} l-10,10`} stroke={AMBER} strokeWidth={2} />
      {/* σ: half-width of the new ellipse */}
      <line x1={n.mx} y1={n.my + 2 * n.sy + 6} x2={n.mx + 2 * n.sx} y2={n.my + 2 * n.sy + 6} stroke={AMBER} strokeWidth={1} />
      <Sym x={n.mx + n.sx} y={n.my + 2 * n.sy + 19} fill={AMBER} size={12}>2σ</Sym>
      <Sym x={n.mx + 4} y={n.my + 17} fill={AMBER} anchor="end" weight={700}>μ</Sym>
      {/* legend */}
      <circle cx={14} cy={14} r={3.8} fill={AMBER} />
      <Note x={22} y={18} anchor="start" fill={AMBER}>
        {pick([`elites E (K = ${CEM_K})`, `菁英 E（K = ${CEM_K}）`])}
      </Note>
      <circle cx={14} cy={30} r={3} fill="white" stroke={FAINT} strokeWidth={1.25} />
      <Note x={22} y={34} anchor="start">
        {pick([`other samples (N = ${CEM_N})`, `其他樣本（N = ${CEM_N}）`])}
      </Note>
    </svg>
  );
}

/* ---------- Q-learning / Dyna-Q: one update ---------- */

const Q_EX = { q: 2, r: 1, gamma: 0.9, alpha: 0.5, next: [5, 3.1, 2.4, 1.2] as const };

export function QUpdatePicture() {
  const { pick } = useLang();
  const { q, r, gamma, alpha } = Q_EX;
  const maxNext = Math.max(...Q_EX.next);
  const target = r + gamma * maxNext;
  const updated = q + alpha * (target - q);
  const vy = (v: number) => 160 - v * 21;
  const fmt = (v: number) => String(Math.round(v * 100) / 100);
  // s′'s four Q values: right (max), up, down, left
  const c2 = { x: 96, y: 34, w: 72 };
  const mid = { x: c2.x + c2.w / 2, y: c2.y + c2.w / 2 };
  const axis = 210;
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        `Two grid cells: action a moves from s to s′ with reward r = ${r}. The best action value in s′ is ${maxNext}, so the target is r + γ max Q′ = ${fmt(target)}. Q(s,a) = ${q} moves a fraction α = ${alpha} of the way toward the target, to ${fmt(updated)}.`,
        `兩個格子：動作 a 從 s 走到 s′，獎勵 r = ${r}。s′ 中最好的動作價值是 ${maxNext}，所以目標是 r + γ max Q′ = ${fmt(target)}。Q(s,a) = ${q} 朝目標移動 α = ${alpha} 的比例，變成 ${fmt(updated)}。`,
      ])}
    >
      <Arrowheads id="qup" />
      {/* cell s */}
      <rect x={16} y={c2.y} width={c2.w} height={c2.w} fill="white" stroke={TRUE} strokeWidth={1.5} />
      <Sym x={34} y={c2.y + 22} size={15}>s</Sym>
      <Sym x={52} y={c2.y + c2.w + 15} size={12}>Q(s,a) = {fmt(q)}</Sym>
      {/* cell s′ with its four action values */}
      <rect x={c2.x} y={c2.y} width={c2.w} height={c2.w} fill="white" stroke={TRUE} strokeWidth={1.5} />
      <path d={`M${c2.x},${c2.y} L${c2.x + c2.w},${c2.y + c2.w} M${c2.x + c2.w},${c2.y} L${c2.x},${c2.y + c2.w}`} stroke="#e5e7eb" />
      <path d={`M${c2.x + c2.w},${c2.y} L${mid.x},${mid.y} L${c2.x + c2.w},${c2.y + c2.w} z`} fill={AMBER_LIGHT} fillOpacity={0.3} />
      <Note x={c2.x + c2.w - 12} y={mid.y + 4} fill={AMBER}>{fmt(Q_EX.next[0])}</Note>
      <Note x={mid.x} y={c2.y + 15} fill={FAINT}>{fmt(Q_EX.next[1])}</Note>
      <Note x={mid.x} y={c2.y + c2.w - 6} fill={FAINT}>{fmt(Q_EX.next[2])}</Note>
      <Note x={c2.x + 13} y={mid.y + 4} fill={FAINT}>{fmt(Q_EX.next[3])}</Note>
      <Sym x={c2.x + c2.w / 2} y={c2.y - 6} size={14}>s′</Sym>
      {/* the move s → s′ */}
      <line x1={44} y1={mid.y} x2={c2.x - 2} y2={mid.y} stroke={TRUE} strokeWidth={2} markerEnd="url(#qup-t)" />
      <Sym x={60} y={mid.y - 6}>a</Sym>
      <Sym x={60} y={mid.y + 18} size={12}>r = {r}</Sym>
      <Note x={mid.x} y={c2.y + c2.w + 15} fill={AMBER}>
        <tspan fontFamily={SERIF} fontStyle="italic">max</tspan>{" "}
        <tspan fontFamily={SERIF} fontStyle="italic">Q′</tspan>
        {" = "}
        {fmt(maxNext)}
      </Note>
      <Note x={16} y={160} anchor="start" fill={TRUE}>
        <tspan fontFamily={SERIF} fontStyle="italic">γ</tspan> = {gamma},{"  "}
        <tspan fontFamily={SERIF} fontStyle="italic">α</tspan> = {alpha}
      </Note>
      <Note x={16} y={174} anchor="start">
        {pick(["target", "目標"])} = {r} + {gamma}·{fmt(maxNext)} = {fmt(target)}
      </Note>
      {/* value axis */}
      <line x1={axis} y1={vy(0)} x2={axis} y2={vy(6.6)} stroke={FAINT} />
      {[0, 2, 4, 6].map((v) => (
        <g key={v}>
          <line x1={axis - 3} x2={axis} y1={vy(v)} y2={vy(v)} stroke={FAINT} />
          <Note x={axis - 6} y={vy(v) + 4} anchor="end" fill={FAINT}>{v}</Note>
        </g>
      ))}
      {/* TD error bracket */}
      <line x1={axis + 6} y1={vy(q)} x2={axis + 6} y2={vy(target)} stroke={FAINT} strokeDasharray="2 2" />
      {/* current, target, updated */}
      <line x1={axis - 2} x2={axis + 14} y1={vy(q)} y2={vy(q)} stroke={TRUE} strokeWidth={2.5} />
      <Sym x={axis + 18} y={vy(q) + 4} anchor="start" size={12}>Q(s,a)</Sym>
      <line x1={axis - 2} x2={axis + 14} y1={vy(target)} y2={vy(target)} stroke={AMBER_LIGHT} strokeWidth={2.5} />
      <Sym x={axis + 18} y={vy(target) + 4} anchor="start" size={12} fill={AMBER}>r + γ max Q′</Sym>
      <line x1={axis + 6} y1={vy(q) - 2} x2={axis + 6} y2={vy(updated) + 3} stroke={AMBER} strokeWidth={2} markerEnd="url(#qup-a)" />
      <line x1={axis - 2} x2={axis + 14} y1={vy(updated)} y2={vy(updated)} stroke={AMBER} strokeWidth={1.5} strokeDasharray="3 2" />
      <Note x={axis + 18} y={vy(updated) + 4} anchor="start" fill={AMBER}>
        {pick(["new", "新值"])} = {fmt(updated)}
      </Note>
      <Note x={axis + 18} y={(vy(q) + vy(updated)) / 2 + 4} anchor="start" fill={AMBER}>
        <tspan fontFamily={SERIF} fontStyle="italic">α</tspan>
        {pick([" × gap", " × 差距"])}
      </Note>
    </svg>
  );
}

/* ---------- UCT: exploitation + exploration bonus ---------- */

const UCT_C = Math.SQRT2;
const UCT_MOVES = [
  { n: 40, w: 30 },
  { n: 12, w: 7.44 },
  { n: 6, w: 3.3 },
  { n: 3, w: 0.15 },
];

export function UctPicture() {
  const { pick } = useLang();
  const total = UCT_MOVES.reduce((s, m) => s + m.n, 0);
  const scored = UCT_MOVES.map((m) => {
    const q = m.w / m.n;
    const bonus = UCT_C * Math.sqrt(Math.log(total) / m.n);
    return { ...m, q, bonus, score: q + bonus };
  });
  const best = scored.reduce((b, m, i) => (m.score > scored[b].score ? i : b), 0);
  const xs = [52, 127, 202, 277];
  const base = 160;
  const k = 50;
  const root = { x: 164, y: 22 };
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        `Four moves from one node visited ${total} times. Each bar stacks the mean result W/N (gray) and the exploration bonus (amber), which is large for moves visited few times. The tallest total, the move visited ${scored[best].n} times, is selected.`,
        `從一個被造訪 ${total} 次的節點出發的四個走法。每根長條疊起平均結果 W/N（灰）與探索加成（琥珀），造訪次數少的走法加成大。總和最高的，也就是被造訪 ${scored[best].n} 次的走法，被選中。`,
      ])}
    >
      {/* legend */}
      <rect x={8} y={6} width={10} height={10} fill={TRUE} />
      <Sym x={24} y={15} anchor="start" size={12}>W/N</Sym>
      <Note x={58} y={15} anchor="start">{pick(["exploit", "利用"])}</Note>
      <rect x={8} y={22} width={10} height={10} fill={AMBER_LIGHT} />
      <Note x={24} y={31} anchor="start" fill={AMBER}>{pick(["explore bonus", "探索加成"])}</Note>
      {/* tree */}
      <circle cx={root.x} cy={root.y} r={8} fill="white" stroke={TRUE} strokeWidth={1.5} />
      <Sym x={root.x + 14} y={root.y + 4} anchor="start" size={12}>N(s) = {total}</Sym>
      {xs.map((x, i) => (
        <g key={x}>
          <line x1={root.x} y1={root.y + 8} x2={x} y2={52} stroke={i === best ? AMBER : FAINT} strokeWidth={i === best ? 2 : 1} />
          <circle cx={x} cy={56} r={5} fill="white" stroke={i === best ? AMBER : TRUE} strokeWidth={1.5} />
        </g>
      ))}
      {/* bars */}
      <line x1={10} x2={310} y1={base} y2={base} stroke={FAINT} />
      {scored.map((m, i) => {
        const hq = m.q * k;
        const hb = m.bonus * k;
        return (
          <g key={i}>
            <rect x={xs[i] - 17} y={base - hq} width={34} height={hq} fill={TRUE} />
            <rect x={xs[i] - 17} y={base - hq - hb} width={34} height={hb} fill={AMBER_LIGHT} fillOpacity={0.8} />
            {i === best && (
              <rect x={xs[i] - 19} y={base - hq - hb - 2} width={38} height={hq + hb + 2} fill="none" stroke={AMBER} strokeWidth={2} />
            )}
            <Sym x={xs[i]} y={174} size={12}>N = {m.n}</Sym>
          </g>
        );
      })}
      <Sym x={xs[best] + 10} y={52} anchor="start" fill={AMBER} weight={700}>a*</Sym>
    </svg>
  );
}

/* ---------- MuZero: unrolled latent chain and its loss ---------- */

export function MuzeroLossPicture() {
  const { pick } = useLang();
  const sx = [74, 174, 274];
  const sy = 34;
  const py = 78;
  const ry = 128;
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "MuZero's model unrolled two steps: h encodes the observation into s⁰, g steps the hidden state with each action and predicts a reward r, and f predicts a policy p and value v at each step. Every prediction is compared with a real target, the reward u, the search policy π and the return z; the hidden states themselves have no target.",
        "MuZero 的模型展開兩步：h 把觀測編碼成 s⁰，g 依每個動作推進隱藏狀態並預測獎勵 r，f 在每一步預測策略 p 與價值 v。每個預測都與真實目標比對：獎勵 u、搜尋策略 π 與回報 z；隱藏狀態本身沒有目標。",
      ])}
    >
      <Arrowheads id="mz" />
      {/* observation and h */}
      <rect x={4} y={sy - 12} width={28} height={24} rx={3} fill="white" stroke={TRUE} strokeWidth={1.5} />
      <Sym x={18} y={sy + 5}>o<tspan fontSize={9} dy={3}>t</tspan></Sym>
      <line x1={33} y1={sy} x2={sx[0] - 12} y2={sy} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#mz-a)" />
      <Sym x={48} y={sy - 6} fill={AMBER} size={12}>h</Sym>
      {/* latent chain */}
      {sx.map((x, k) => (
        <g key={x}>
          <circle cx={x} cy={sy} r={11} fill="#fef3c7" stroke={AMBER} strokeWidth={1.5} />
          <Sym x={x} y={sy + 5} fill={AMBER} size={12}>
            s<tspan fontSize={9} dy={-5}>{k}</tspan>
          </Sym>
          {/* f: p, v */}
          <line x1={x} y1={sy + 12} x2={x} y2={py - 14} stroke={AMBER} strokeWidth={1.25} markerEnd="url(#mz-a)" />
          <Sym x={x + 6} y={sy + 30} anchor="start" fill={AMBER} size={11}>f</Sym>
          <Sym x={x} y={py} fill={AMBER} size={13}>
            p<tspan fontSize={9} dy={-5}>{k}</tspan>
            <tspan dy={5}> v</tspan>
            <tspan fontSize={9} dy={-5}>{k}</tspan>
          </Sym>
          {/* real targets */}
          <line x1={x} y1={py + 6} x2={x} y2={ry - 14} stroke={FAINT} strokeDasharray="3 2" />
          <Note x={x + 4} y={(py + ry) / 2 + 2} anchor="start" fill={FAINT}>ℓ</Note>
          <Sym x={x} y={ry} size={13}>
            π<tspan fontSize={9} dy={3}>{k ? `t+${k}` : "t"}</tspan>
            <tspan dy={-3}> z</tspan>
            <tspan fontSize={9} dy={3}>{k ? `t+${k}` : "t"}</tspan>
          </Sym>
          {k > 0 && (
            <g>
              {/* g: step with action, predicts r */}
              <line x1={sx[k - 1] + 12} y1={sy} x2={x - 13} y2={sy} stroke={AMBER} strokeWidth={1.5} markerEnd="url(#mz-a)" />
              <Sym x={(sx[k - 1] + x) / 2} y={sy - 8} fill={AMBER} size={12}>
                g(·, a<tspan fontSize={9} dy={3}>{`t+${k}`}</tspan>
                <tspan dy={-3}>)</tspan>
              </Sym>
              <line x1={(sx[k - 1] + x) / 2} y1={sy + 2} x2={(sx[k - 1] + x) / 2} y2={py - 14} stroke={AMBER} strokeWidth={1.25} markerEnd="url(#mz-a)" />
              <Sym x={(sx[k - 1] + x) / 2} y={py} fill={AMBER} size={13}>
                r<tspan fontSize={9} dy={-5}>{k}</tspan>
              </Sym>
              <line x1={(sx[k - 1] + x) / 2} y1={py + 6} x2={(sx[k - 1] + x) / 2} y2={ry - 14} stroke={FAINT} strokeDasharray="3 2" />
              <Sym x={(sx[k - 1] + x) / 2} y={ry} size={13}>
                u<tspan fontSize={9} dy={3}>{`t+${k}`}</tspan>
              </Sym>
            </g>
          )}
        </g>
      ))}
      <Note x={4} y={py + 4} anchor="start" fill={AMBER}>{pick(["model", "模型"])}</Note>
      <Note x={4} y={ry + 4} anchor="start" fill={TRUE}>{pick(["real", "真實"])}</Note>
      <Note x={160} y={164}>
        {pick(["no target for the hidden states s", "隱藏狀態 s"])}
        <tspan fontFamily={SERIF} fontStyle="italic" fontSize={9} dy={-5}>k</tspan>
        <tspan dy={5}>{pick(["", " 沒有目標"])}</tspan>
      </Note>
    </svg>
  );
}
