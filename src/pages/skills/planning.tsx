/**
 * Coding Skills ▸ Planning in code (#/skills/planning[/cem|dyna]): the real cem.ts and dyna.ts, cut at their
 * `// #region` markers (imported raw, so the page always shows the code the demos run), beside the demos, with a
 * note on each line. The CEM notes light up as the demo moves through its phases.
 */
import { RichText, useLang } from "@learnkit/web";
import { useState } from "react";
import { SKILLS_OUTLINES } from "../../curriculum.ts";
import CemPlanner, { type CemPhase } from "../../demos/CemPlanner.tsx";
import DynaCurves from "../../demos/DynaCurves.tsx";
import cemSource from "../../models/cem.ts?raw";
import dynaSource from "../../models/dyna.ts?raw";
import { Code, Figure, HistoryLinks, P, Page, Section, SiteLink, Sources, type L } from "../kit.tsx";

const OUTLINE = SKILLS_OUTLINES.find((o) => o.id === "planning")!;
const PAGE = "planning";
const title = (id: string) => OUTLINE.sections.find((s) => s.id === id)!.title;

/** The lines between `// #region <name>` and the next `// #endregion` of a source file. */
function region(src: string, name: string): string {
  const lines = src.split("\n");
  const start = lines.findIndex((l) => l.trim() === `// #region ${name}`);
  const end = lines.findIndex((l, i) => i > start && l.trim() === "// #endregion");
  if (start < 0 || end < 0) throw new Error(`region ${name} not found`);
  return lines.slice(start + 1, end).join("\n");
}

/** A note on one line of an excerpt: the line is found by a fragment of its text, so the note names it by number. */
interface LineNote {
  find: string;
  note: L;
  phases?: CemPhase[];
}

function LineNotes({ code, notes, active }: { code: string; notes: LineNote[]; active?: CemPhase }) {
  const { pick } = useLang();
  const lines = code.split("\n");
  return (
    <ol className="space-y-1 text-xs">
      {notes.map((n) => {
        const i = lines.findIndex((l) => l.includes(n.find));
        if (i < 0) throw new Error(`LineNotes: no line containing ${n.find}`);
        const on = active !== undefined && n.phases?.includes(active);
        return (
          <li key={n.find} className={`rounded-md px-2 py-1 ${on ? "bg-amber-100 ring-1 ring-amber-300" : "bg-gray-50"}`}>
            <span className="mr-2 font-mono text-[11px] text-gray-500">{pick(["line", "第"])} {i + 1}{pick(["", " 行"])}</span>
            <code className="mr-2 rounded bg-white px-1 font-mono text-[11px] text-gray-800">{lines[i].trim().slice(0, 60)}</code>
            <RichText text={pick(n.note)} />
          </li>
        );
      })}
    </ol>
  );
}

const CEM_CODE = region(cemSource, "cem");
const MPC_CODE = region(cemSource, "mpc");
const DYNA_CODE = region(dynaSource, "dyna");

const CEM_NOTES: LineNote[] = [
  { find: "export function cemIteration", note: ["A plan is a flat `number[]` of actions; `cost` rolls it through the model and returns $J$.", "計畫是一個扁平的動作陣列 `number[]`；`cost` 把它在模型中推演，回傳 $J$。"] },
  { find: "mean[d] + std[d] * gaussian(r)", note: ["Sample: one Gaussian draw per action, clipped to the actuator's range.", "取樣：每個動作抽一次高斯，再截到致動器的範圍內。"], phases: ["sampled"] },
  { find: "const costs = plans.map(cost)", note: ["Score: one model rollout per plan. This is where all the time goes, and it parallelises perfectly.", "評分：每個計畫一次模型推演。時間幾乎都花在這裡，而且完全可以平行化。"], phases: ["sampled"] },
  { find: ".slice(0, o.elites)", note: ["Elites: sort indices by cost and keep the first $K$.", "菁英：依成本排序索引，留下前 $K$ 個。"], phases: ["elites"] },
  { find: "nextMean[d] += plans[i][d]", note: ["Refit the mean: the average elite plan.", "重新擬合平均：菁英計畫的平均。"], phases: ["refit"] },
  { find: "nextStd[d] = Math.max(o.minStd", note: ["Refit the spread, with a floor: without `minStd` the Gaussian can collapse onto a poor plan and stop searching.", "重新擬合分散程度，並設下限：沒有 `minStd`，高斯分布可能塌縮到一個差的計畫上就不再搜尋。"], phases: ["refit"] },
  { find: "for (let k = 0; k < iters; k++)", note: ["`cem` just repeats the iteration, remembering the best plan ever seen.", "`cem` 只是重複這個迭代，並記住見過的最佳計畫。"] },
];

const MPC_NOTES: LineNote[] = [
  { find: "const plan = cem(planCost(state)", note: ["Plan from the state you are really in, with a fresh spread.", "從實際所在的狀態規劃，分散程度重設。"], phases: ["act"] },
  { find: "state = act(state, plan.best.slice(0, actionDim))", note: ["Carry out only the first action on the real system.", "在真實系統上只執行第一個動作。"], phases: ["act"] },
  { find: "mean = [...plan.mean.slice(actionDim)", note: ["Warm start: the rest of the old plan, shifted one step, is the next round's mean.", "暖啟動：舊計畫剩下的部分平移一步，成為下一輪的平均。"], phases: ["act"] },
];

const DYNA_NOTES: LineNote[] = [
  { find: "const model = new Map", note: ["The whole world model: a table from (state, action) to what happened last time. The maze is deterministic, so that is exact.", "整個世界模型：一張從（狀態, 動作）對應到上一次結果的表。迷宮是確定性的，所以它是精確的。"] },
  { find: "const update = (s: number", note: ["One Q-learning update, shared by real and imagined steps. At the goal there is no future, so the target is just $r$.", "一次 Q 學習更新，真實與想像的步驟共用。到達目標後沒有未來，所以目標就是 $r$。"] },
  { find: "const a = r() < o.epsilon", note: ["ε-greedy: mostly the best known action, sometimes a random one.", "ε-貪婪：多半選已知最好的動作，偶爾隨機。"] },
  { find: "update(s, a, reward, next);", note: ["Direct learning from the real step. Stop here and you have Q-learning.", "從真實步驟直接學習。到這裡為止就是 Q 學習。"] },
  { find: "model.set(s * 4 + a", note: ["Model learning: remember the transition.", "模型學習：記住這次轉移。"] },
  { find: "for (let k = 0; k < o.n; k++)", note: ["Planning: $n$ imagined steps. This loop and the two model lines above are all that Dyna adds to Q-learning.", "規劃：$n$ 個想像的步驟。Dyna 在 Q 學習之上加的，就只有這個迴圈和上面兩行模型程式碼。"] },
  { find: "const key = seen[randInt(ri", note: ["Pick a previously seen (state, action) at random (its own random stream, so changing $n$ leaves the real actions of the first episode unchanged).", "隨機挑一個見過的（狀態, 動作）（用獨立的亂數流，所以改變 $n$ 不會改變第一回合的真實動作）。"] },
  { find: "update(Math.floor(key / 4)", note: ["Apply the same update to the imagined transition.", "對想像的轉移套用同一個更新。"] },
];

function CemSection({ n }: { n: number }) {
  const [phase, setPhase] = useState<CemPhase>("start");
  return (
    <Section page={PAGE} id="cem" n={n} title={title("cem")}>
      <P
        t={[
          "The planner of the Concepts page is one function of about 30 lines plus a loop. It knows nothing about point masses: it optimises any `cost(plan)`, and the model hides inside that function. Step the demo and the notes for the lines it just ran light up.",
          "概念頁面上的規劃器就是一個大約 30 行的函式加上一個迴圈。它對質點一無所知：它優化任何 `cost(plan)`，模型就藏在這個函式裡。逐步執行示範，剛執行過的程式行的註解就會亮起。",
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Code code={CEM_CODE} title="src/models/cem.ts" />
        <div className="space-y-3">
          <Figure caption={["The same demo as on the Concepts page.", "與概念頁面相同的示範。"]}>
            <CemPlanner onPhase={setPhase} />
          </Figure>
          <LineNotes code={CEM_CODE} notes={CEM_NOTES} active={phase} />
        </div>
      </div>
      <P
        t={[
          "Model-predictive control wraps it. The generic `S` is the state type; `act` is the real system, `planCost(s)` builds the cost of a plan from `s` using the model. Press **Act** in the demo for these lines.",
          "模型預測控制把它包起來。泛型 `S` 是狀態的型別；`act` 是真實系統，`planCost(s)` 用模型建出從 `s` 出發的計畫成本。在示範中按 **行動** 就會執行這幾行。",
        ]}
      />
      <Code code={MPC_CODE} title="src/models/cem.ts" />
      <LineNotes code={MPC_CODE} notes={MPC_NOTES} active={phase} />
      <P
        t={[
          "The tests (`tests/cem.test.ts`) check real properties: CEM finds the minimum of a shifted quadratic to two decimals; it beats random shooting given the same number of samples on the point mass; and MPC drives the point mass to the goal without touching the obstacle.",
          "測試（`tests/cem.test.ts`）檢查真正的性質：CEM 找到一個平移二次函數的最小值，準確到小數點後兩位；在質點上，給相同樣本數時它勝過隨機射擊；MPC 能把質點帶到目標而不碰到障礙物。",
        ]}
      />
      <p>
        <SiteLink to={["concept", "planning", "cem"]} label={["Concepts: planning with a model", "概念：用模型規劃"]} />
      </p>
      <Sources
        items={[
          { label: "de Boer, Kroese, Mannor & Rubinstein (2005), A tutorial on the cross-entropy method", url: "https://doi.org/10.1007/s10479-005-5724-z" },
          { label: "Chua et al. (2018), PETS (arXiv 1805.12114)", url: "https://arxiv.org/abs/1805.12114" },
        ]}
      />
    </Section>
  );
}

function DynaSection({ n }: { n: number }) {
  return (
    <Section page={PAGE} id="dyna" n={n} title={title("dyna")}>
      <P
        t={[
          "Dyna-Q is Q-learning with a memory and a loop. Everything up to `update(s, a, reward, next)` is ordinary Q-learning; the table model and the inner `for` loop are the imagination.",
          "Dyna-Q 就是加上記憶與一個迴圈的 Q 學習。到 `update(s, a, reward, next)` 為止都是一般的 Q 學習；表格模型與內層的 `for` 迴圈就是想像。",
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Code code={DYNA_CODE} title="src/models/dyna.ts" />
        <div className="space-y-3">
          <LineNotes code={DYNA_CODE} notes={DYNA_NOTES} />
        </div>
      </div>
      <Figure caption={["The learning curves of the Concepts page, produced by `averageCurve`, which calls `dynaQ` above for each seed.", "概念頁面上的學習曲線，由 `averageCurve` 產生，它對每個種子呼叫上面的 `dynaQ`。"]}>
        <DynaCurves />
      </Figure>
      <P
        t={[
          "Two details matter more than they look. Ties in `greedy` are broken at random: with a fixed tie-break an untrained agent walks into the same wall forever. And the imagined updates use their own random stream, so runs with different $n$ share their first episode exactly: a fair comparison at equal real steps. `tests/dyna.test.ts` checks that Dyna-Q ($n = 5$) needs well under the real steps Q-learning needs to reach the goal five times (mean of 8 seeds), that $n = 50$ needs fewer still, and that after training the greedy path is the 14-step shortest path.",
          "有兩個細節比看起來重要。`greedy` 中的平手是隨機打破的：若固定平手的選法，未訓練的智能體會永遠撞同一面牆。而想像更新用的是獨立的亂數流，所以不同 $n$ 的執行共享完全相同的第一回合：在相同真實步數下公平比較。`tests/dyna.test.ts` 檢查 Dyna-Q（$n = 5$）到達目標五次所需的真實步數遠少於 Q 學習（8 個種子的平均），$n = 50$ 需要的更少，以及訓練後的貪婪路徑就是 14 步的最短路徑。",
        ]}
      />
      <p>
        <SiteLink to={["concept", "planning", "imagination"]} label={["Concepts: learning in imagination", "概念：在想像中學習"]} />
      </p>
      <Sources
        items={[
          { label: "Sutton (1991), Dyna, an integrated architecture for learning, planning, and reacting", url: "https://doi.org/10.1145/122344.122377" },
          { label: "Sutton & Barto (2018), Reinforcement Learning: An Introduction, §8.2 Dyna (free online)", url: "http://incompleteideas.net/book/the-book-2nd.html" },
        ]}
      />
      <HistoryLinks ids={["dyna"]} />
    </Section>
  );
}

export default function PlanningCode({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <CemSection n={1} />
      <DynaSection n={2} />
    </Page>
  );
}
