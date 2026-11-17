/**
 * The tiny game beside its count-based generator (src/models/tinyGame.ts). The reader picks how much recorded play
 * the generator learned from, then presses keys: the true game steps, and the generator predicts the next frame's
 * tokens from its table. Where the (frame, key) was never seen, the generator can only copy the last frame; where the
 * coin is picked up, the hidden clock makes several outcomes possible. Red dashed cells: the generator's frame differs
 * from the truth.
 */
import { useLang } from "@learnkit/web";
import { useMemo, useState } from "react";
import { ACTIONS, coverage, decode, encode, predict, record, render, START, step, train, type Action, type GameState, type Prediction } from "../models/tinyGame.ts";
import { DemoButton } from "../pages/kit.tsx";
import TinyGameGrid, { TokenRow, TONE } from "./TinyGameGrid.tsx";

const DATA = [50, 200, 800, 3200];
const KEYS: { a: Action; glyph: string; name: [string, string] }[] = [
  { a: 1, glyph: "←", name: ["left", "左"] },
  { a: 3, glyph: "↑", name: ["up", "上"] },
  { a: 4, glyph: "↓", name: ["down", "下"] },
  { a: 2, glyph: "→", name: ["right", "右"] },
  { a: 0, glyph: "·", name: ["stay", "不動"] },
];

export default function TinyGame() {
  const { pick } = useLang();
  const [steps, setSteps] = useState(200);
  const gen = useMemo(() => train(record(steps)), [steps]);
  const cov = useMemo(() => coverage(gen), [gen]);
  const [truth, setTruth] = useState<GameState>(START);
  const [tokens, setTokens] = useState<number[]>(() => encode(render(START), gen.cb));
  const [last, setLast] = useState<{ a: Action; pred: Prediction } | null>(null);
  const [t, setT] = useState(0);

  const reset = (g = gen) => {
    setTruth(START);
    setTokens(encode(render(START), g.cb));
    setLast(null);
    setT(0);
  };
  const press = (a: Action) => {
    const pred = predict(gen, tokens, a);
    setTokens(pred.outcomes[0].tokens);
    setTruth((s) => step(s, a));
    setLast({ a, pred });
    setT((n) => n + 1);
  };
  const resync = () => {
    setTokens(encode(render(truth), gen.cb));
    setLast(null);
  };

  const trueFrame = render(truth);
  const trueTokens = encode(trueFrame, gen.cb);
  const genFrame = decode(tokens, gen.cb);
  const mark = genFrame.map((c, i) => c !== trueFrame[i]);
  const wrong = mark.filter(Boolean).length;

  let status: string;
  if (!last) status = pick(["Press a key. Both start from the same frame.", "按一個鍵。兩邊從同一幀開始。"]);
  else if (last.pred.seen === 0)
    status = pick([
      `Never seen this frame with “${ACTIONS[last.a]}” in the recorded play: the generator has no entry and copies the last frame.`,
      `錄下的遊玩中從沒見過這一幀配上「${ACTIONS[last.a]}」：生成器的表裡沒有這一列，只好照抄上一幀。`,
    ]);
  else if (last.pred.outcomes.length > 1)
    status = pick([
      `Seen ${last.pred.seen}×, with ${last.pred.outcomes.length} different next frames (p = ${last.pred.outcomes.map((o) => o.p.toFixed(2)).join(", ")}): the coin's new spot depends on a clock the frame does not show. It drew the most likely one.`,
      `見過 ${last.pred.seen} 次，接著出現過 ${last.pred.outcomes.length} 種不同的下一幀（p = ${last.pred.outcomes.map((o) => o.p.toFixed(2)).join("、")}）：硬幣的新位置取決於畫面上看不到的時鐘。它選了最可能的那一個。`,
    ]);
  else status = pick([`Seen ${last.pred.seen}×, always followed by the same frame (p = 1).`, `見過 ${last.pred.seen} 次，後面總是同一幀（p = 1）。`]);

  return (
    <div className="w-full max-w-xl space-y-3 text-xs text-gray-700">
      <div className="flex flex-wrap items-center gap-2">
        <span>{pick(["Recorded play to learn from:", "用來學習的錄下遊玩："])}</span>
        {DATA.map((n) => (
          <DemoButton
            key={n}
            active={n === steps}
            onClick={() => {
              setSteps(n);
              reset(train(record(n)));
            }}
          >
            {n} {pick(["steps", "步"])}
          </DemoButton>
        ))}
      </div>
      <p className="text-gray-500">
        {pick([
          `Codebook: ${gen.cb.patterns.length} patch tokens. The table covers ${cov.seen} of the ${cov.total} (state, key) pairs of the game.`,
          `碼本：${gen.cb.patterns.length} 種區塊詞元。表格涵蓋遊戲 ${cov.total} 個（狀態, 按鍵）組合中的 ${cov.seen} 個。`,
        ])}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 text-center">
          <p className="font-medium" style={{ color: TONE.truth }}>
            {pick(["True game", "真實的遊戲"])}
          </p>
          <TinyGameGrid frame={trueFrame} tone={TONE.truth} label={pick(["The true game's frame", "真實遊戲的畫面"])} />
          <TokenRow tokens={trueTokens} tone={TONE.truth} />
        </div>
        <div className="space-y-1 text-center">
          <p className="font-medium" style={{ color: TONE.model }}>
            {pick(["Generator", "生成器"])}
          </p>
          <TinyGameGrid frame={genFrame} tone={TONE.model} mark={mark} label={pick(["The generator's frame", "生成器的畫面"])} />
          <TokenRow tokens={tokens} tone={TONE.model} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label={pick(["Keys", "按鍵"])}>
        {KEYS.map((k) => (
          <button
            key={k.a}
            onClick={() => press(k.a)}
            aria-label={pick(k.name)}
            className="h-8 w-9 rounded-md border border-gray-300 bg-white text-base text-gray-800 hover:bg-gray-50"
          >
            {k.glyph}
          </button>
        ))}
        <span className="mx-1" />
        <DemoButton onClick={resync}>{pick(["Copy the true frame in", "把真實畫面複製進去"])}</DemoButton>
        <DemoButton onClick={() => reset()}>{pick(["Reset", "重設"])}</DemoButton>
      </div>
      <p className="min-h-10 rounded-md bg-white px-3 py-2" aria-live="polite">
        <span className="font-mono text-gray-500">t = {t} · </span>
        {status}{" "}
        {wrong > 0 && <span className="font-medium text-red-700">{pick([`${wrong} cells differ from the truth.`, `有 ${wrong} 格和真實畫面不同。`])}</span>}
      </p>
    </div>
  );
}
