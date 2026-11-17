/**
 * Latent actions (src/models/latentActions.ts). Left: every unlabelled frame pair as a dot at "how the player-coloured
 * pixels moved", coloured by the code k-means gave it. Click a code to play it on the frame below and to see example
 * pairs it was given. The keys that were really pressed are hidden; "Reveal the keys" grades the codes against them.
 */
import { useLang } from "@learnkit/web";
import { useMemo, useState } from "react";
import { applyCode, confusion, feature, framePairs, learnLatentActions, purity } from "../models/latentActions.ts";
import { rng } from "../models/rng.ts";
import { ACTIONS, render, START, type Frame } from "../models/tinyGame.ts";
import { DemoButton, Slider } from "../pages/kit.tsx";
import TinyGameGrid, { TONE } from "./TinyGameGrid.tsx";

/** categorical colours for codes (only the code's identity, no meaning) */
const CODE = ["#b45309", "#0284c7", "#15803d", "#7c3aed", "#db2777", "#0f766e", "#a16207", "#4b5563"];
const N = 400;
const LIM = 1.6;
const VB = 200;
const at = (v: number) => ((v + LIM) / (2 * LIM)) * VB;

export default function LatentAction() {
  const { pick } = useLang();
  const [k, setK] = useState(5);
  const [walls, setWalls] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [frame, setFrame] = useState<Frame>(() => render(START));
  const [prev, setPrev] = useState<Frame | null>(null);

  const pairs = useMemo(() => framePairs(N, 3, !walls), [walls]);
  const learned = useMemo(() => learnLatentActions(pairs, k), [pairs, k]);
  const pts = useMemo(() => {
    const r = rng(17); // display jitter only, so stacked dots show as a cloud
    return pairs.map((p) => {
      const [x, y] = feature(p);
      return [x + (r() - 0.5) * 0.35, y + (r() - 0.5) * 0.35] as const;
    });
  }, [pairs]);
  const m = useMemo(() => confusion(pairs, learned.codes, k), [pairs, learned, k]);
  const used = m.map((row) => row.reduce((a, b) => a + b, 0));

  const play = (j: number) => {
    setChosen(j);
    setPrev(frame);
    setFrame(applyCode(frame, learned.centroids[j]));
  };
  const examples = chosen === null ? [] : pairs.filter((_, i) => learned.codes[i] === chosen).slice(0, 2);

  return (
    <div className="w-full max-w-xl space-y-3 text-xs text-gray-700">
      <div className="flex flex-wrap items-center gap-3">
        <Slider label={["Codes $k$", "代碼數 $k$"]} value={k} min={3} max={8} onChange={(v) => { setK(v); setChosen(null); }} />
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={walls} onChange={(e) => { setWalls(e.target.checked); setChosen(null); }} className="accent-(--lk-accent)" />
          {pick(["Let the player bump into walls", "讓玩家撞牆"])}
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <figure className="space-y-1">
          <svg viewBox={`0 0 ${VB} ${VB}`} className="mx-auto h-auto w-full max-w-[220px]" role="img" aria-label={pick(["Frame pairs placed by how the player moved, coloured by code", "依玩家移動位置排列的畫面對，以代碼著色"])}>
            <rect width={VB} height={VB} fill="white" stroke="#e5e7eb" />
            <line x1={at(0)} y1={0} x2={at(0)} y2={VB} stroke="#e5e7eb" />
            <line x1={0} y1={at(0)} x2={VB} y2={at(0)} stroke="#e5e7eb" />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={at(x)} cy={at(y)} r={2} fill={CODE[learned.codes[i]]} fillOpacity={chosen === null || chosen === learned.codes[i] ? 0.7 : 0.12} />
            ))}
            {learned.centroids.map((c, j) =>
              used[j] ? (
                <g key={j}>
                  <circle cx={at(c[0])} cy={at(c[1])} r={9} fill="white" stroke={CODE[j]} strokeWidth={2} />
                  <text x={at(c[0])} y={at(c[1]) + 3.5} textAnchor="middle" fontSize={10} fontWeight={600} fill={CODE[j]}>
                    {j}
                  </text>
                </g>
              ) : null,
            )}
            <text x={VB - 4} y={at(0) - 4} textAnchor="end" fontSize={9} fill="#6b7280">Δx</text>
            <text x={at(0) + 4} y={10} fontSize={9} fill="#6b7280">Δy</text>
          </svg>
          <figcaption className="text-center text-[11px] text-gray-500">
            {pick([`${N} unlabelled frame pairs, placed by how the player-coloured pixels moved (with a little jitter so stacked dots show).`, `${N} 個無標籤的畫面對，依玩家顏色像素的移動擺放（稍加抖動，讓疊在一起的點看得見）。`])}
          </figcaption>
        </figure>
        <div className="space-y-2">
          <p>{pick(["Play a latent action:", "執行一個潛在動作："])}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={pick(["Latent actions", "潛在動作"])}>
            {learned.centroids.map((_, j) => (
              <button
                key={j}
                onClick={() => play(j)}
                aria-pressed={chosen === j}
                className="rounded-md border-2 bg-white px-2.5 py-1 font-mono font-semibold disabled:opacity-40"
                style={{ borderColor: CODE[j], color: CODE[j], background: chosen === j ? `${CODE[j]}22` : "white" }}
                disabled={!used[j]}
              >
                z={j}
              </button>
            ))}
            <DemoButton onClick={() => { setFrame(render(START)); setPrev(null); setChosen(null); }}>{pick(["Reset", "重設"])}</DemoButton>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-gray-500">{pick(["before", "之前"])}</p>
              <TinyGameGrid frame={prev ?? frame} tone={TONE.truth} label={pick(["Frame before", "之前的畫面"])} />
            </div>
            <div>
              <p style={{ color: TONE.model }}>{chosen === null ? pick(["after", "之後"]) : `${pick(["after", "之後"])} z=${chosen}`}</p>
              <TinyGameGrid frame={frame} tone={TONE.model} label={pick(["Frame after the latent action", "執行潛在動作之後的畫面"])} />
            </div>
          </div>
          {chosen !== null && (
            <p aria-live="polite">
              {pick([
                `Code ${chosen} was given ${used[chosen]} of the ${N} pairs; it stands for a move of (${learned.centroids[chosen].map((v) => v.toFixed(2)).join(", ")}) cells. Two of its pairs:`,
                `代碼 ${chosen} 分到 ${N} 對中的 ${used[chosen]} 對；它代表移動 (${learned.centroids[chosen].map((v) => v.toFixed(2)).join(", ")}) 格。其中兩對：`,
              ])}
            </p>
          )}
          {examples.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {examples.map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <TinyGameGrid frame={p.before} tone={TONE.truth} label="before" size="max-w-[80px]" />
                  <span className="text-gray-400">→</span>
                  <TinyGameGrid frame={p.after} tone={TONE.truth} label="after" size="max-w-[80px]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <DemoButton onClick={() => setReveal((r) => !r)} active={reveal}>
          {reveal ? pick(["Hide the keys", "隱藏按鍵"]) : pick(["Reveal the keys (grading only)", "揭曉按鍵（只用來評分）"])}
        </DemoButton>
        {reveal && (
          <div className="overflow-x-auto">
            <table className="mx-auto text-center font-mono text-[11px]">
              <thead>
                <tr>
                  <th className="px-2 text-gray-500">{pick(["code \\ key", "代碼 \\ 按鍵"])}</th>
                  {ACTIONS.map((a) => <th key={a} className="px-2 font-normal text-gray-500">{a}</th>)}
                </tr>
              </thead>
              <tbody>
                {m.map((row, j) =>
                  used[j] ? (
                    <tr key={j}>
                      <td className="px-2 font-semibold" style={{ color: CODE[j] }}>z={j}</td>
                      {row.map((c, a) => <td key={a} className={`px-2 ${c ? "text-gray-900" : "text-gray-300"}`}>{c}</td>)}
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
            <p className="mt-1 text-center">
              {pick([`Purity ${(purity(m) * 100).toFixed(0)}%: the share of pairs whose code's most common key is their own key.`, `純度 ${(purity(m) * 100).toFixed(0)}%：代碼中最常見的按鍵正好是自己按鍵的畫面對比例。`])}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
