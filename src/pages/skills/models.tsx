/** Coding Skills ▸ States, models and rollouts (#/skills/models[/<section>]): real excerpts of the book's model files. */
import { SKILLS_OUTLINES } from "../../curriculum.ts";
import { CartpoleTrajectory } from "../../demos/CartpoleDemo.tsx";
import { GridworldTypes } from "../../demos/GridworldDemo.tsx";
import RolloutLossDemo from "../../demos/RolloutLossDemo.tsx";
import cartpoleSrc from "../../models/cartpole.ts?raw";
import gridworldSrc from "../../models/gridworld.ts?raw";
import lossesSrc from "../../models/losses.ts?raw";
import rngSrc from "../../models/rng.ts?raw";
import { Callout, Code, Eq, Figure, HistoryLinks, List, P, Page, Section, SiteLink, Sources } from "../kit.tsx";

const OUTLINE = SKILLS_OUTLINES.find((o) => o.id === "models")!;
const PAGE = "models";

/** The text between `// #region name` and `// #endregion name` in a source file (markers removed). */
function region(src: string, name: string): string {
  const m = src.match(new RegExp(`// #region ${name}\\n([\\s\\S]*?)// #endregion ${name}`));
  if (!m) throw new Error(`no region ${name}`);
  return m[1].trimEnd();
}

/** `count` lines of `src`, starting at the first line containing `marker` (all the rest if count is omitted). */
const lines = (src: string, marker: string, count?: number) => {
  const all = src.split("\n");
  const i = all.findIndex((l) => l.includes(marker));
  if (i < 0) throw new Error(`no line with ${marker}`);
  return all.slice(i, count === undefined ? undefined : i + count).join("\n");
};

export default function Models({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <Types />
      <Rollout />
    </Page>
  );
}

function Types() {
  return (
    <Section page={PAGE} id="types" n={1} title={["States, actions and observations", "狀態、動作與觀測"]}>
      <P
        t={[
          "Before a program can step a world, you have to decide what the world *is*. The rule of thumb: the **state** holds exactly what the next step needs, and nothing that can be recomputed. In the gridworld of Concepts ▸ What is a world model?, the map never changes, so it is a constant; the state holds only the agent's cell and two facts that change over an episode: whether the key has been taken and whether the door is open.",
          "程式要能推進一個世界之前，你得先決定這個世界*是*什麼。經驗法則是：**狀態**恰好保存下一步所需要的東西，不保存任何能重新計算出來的東西。在「概念 ▸ 什麼是世界模型？」的格子世界裡，地圖永遠不變，所以它是常數；狀態只保存智能體所在的格子，以及在一回合中會改變的兩件事：鑰匙是否已被拿走、門是否已打開。",
        ]}
      />
      <Code title="src/models/gridworld.ts" code={region(gridworldSrc, "types")} />
      <Figure caption={["Hover over (or tab to) a field of the state to see which cells it describes.", "把滑鼠移到（或用 Tab 鍵選取）狀態的某個欄位，看看它描述的是哪些格子。"]}>
        <GridworldTypes />
      </Figure>
      <P
        t={[
          "The **observation** is a different type from the state on purpose. Here it is a picture, one symbol per cell, made by an observation function; a learned world model usually only ever sees this side, and has to infer the state from it. Keeping the two apart in code keeps you honest about what an agent can actually know.",
          "**觀測**刻意和狀態用不同的型別。這裡它是一張圖，每個格子一個符號，由觀測函式產生；學習而來的世界模型通常只看得到這一側，必須從中推斷狀態。在程式碼裡把兩者分開，能讓你誠實面對智能體實際上能知道什麼。",
        ]}
      />
      <Code title="src/models/gridworld.ts" code={region(gridworldSrc, "observe")} />
      <P
        t={[
          "Cart-pole needs fewer words: its state is four numbers, $(x, \\dot x, \\theta, \\dot\\theta)$, and a tuple type documents their order and units. The action is one number, the force in newtons.",
          "倒單擺小車需要的說明更少：它的狀態是四個數字 $(x, \\dot x, \\theta, \\dot\\theta)$，用一個元組型別記下它們的順序與單位。動作是一個數字：以牛頓為單位的推力。",
        ]}
      />
      <Code title="src/models/cartpole.ts" code={lines(region(cartpoleSrc, "step"), "export type CartState", 2)} />
      <P
        t={[
          "**Randomness is part of the interface.** Every model in this book takes its random numbers from one seeded generator, so a demo, a test and a figure in the text all see the same \"random\" run. Never call `Math.random()` inside a model: a test that fails one time in a hundred is worse than no test.",
          "**隨機性是介面的一部分。**本書的每個模型都從同一個帶種子的產生器取得亂數，所以示範、測試與文中的圖看到的是同一次「隨機」執行。絕對不要在模型裡呼叫 `Math.random()`：一百次裡失敗一次的測試，比沒有測試還糟。",
        ]}
      />
      <Code title="src/models/rng.ts" code={lines(rngSrc, "export function rng", 10)} note={["mulberry32: a 32-bit state, fast and good enough for demos (not for cryptography).", "mulberry32：32 位元的狀態，速度快，用於示範已足夠（不適用於密碼學）。"]} />
      <Sources
        items={[
          { label: "Sutton & Barto (2018), Reinforcement Learning: An Introduction, ch. 3 (states, actions, rewards)", url: "http://incompleteideas.net/book/the-book-2nd.html" },
          { label: "Gymnasium: the Env API (reset, step, observation and action spaces)", url: "https://gymnasium.farama.org/api/env/" },
        ]}
      />
    </Section>
  );
}

function Rollout() {
  return (
    <Section page={PAGE} id="rollout" n={2} title={["A one-step model and a rollout", "單步模型與推演"]}>
      <P
        t={[
          "A world model in code is one function: **state and action in, next state out**. Everything else, prediction over a horizon, planning, imagined training data, is that function called in a loop. Here is the true cart-pole step: the equations of motion as a derivative function, and one Runge–Kutta step that samples it four times.",
          "程式裡的世界模型就是一個函式：**輸入狀態與動作，輸出下一個狀態**。其他的一切：多步預測、規劃、想像出來的訓練資料，都是在迴圈中呼叫這個函式。下面是真實的倒單擺一步：運動方程寫成導數函式，再用一次龍格–庫塔步驟對它取樣四次。",
        ]}
      />
      <Code title="src/models/cartpole.ts" code={lines(region(cartpoleSrc, "step"), "export const G")} />
      <P
        t={[
          "A rollout does not care whether the step is the true simulator or a learned approximation: both have the type `Model`. That is the point: you can swap one for the other and compare.",
          "推演並不在乎那一步是真實模擬器還是學到的近似：兩者的型別都是 `Model`。重點就在這裡：你可以把其中一個換成另一個來比較。",
        ]}
      />
      <Code title="src/models/cartpole.ts" code={region(cartpoleSrc, "rollout")} />
      <Figure caption={["`rollout(step, [0, 0, 0.1, 0], forces)` with alternating ±5 N pushes: the slider sets how many forces, and so how many states, there are.", "`rollout(step, [0, 0, 0.1, 0], forces)`，推力交替為 ±5 N：滑桿決定有幾個推力，也就決定有幾個狀態。"]}>
        <CartpoleTrajectory />
      </Figure>
      <P
        t={[
          "The learned model of Concepts ▸ Dynamics and rollouts is fitted, not hand-written. The data are 2000 random states near upright with random forces, each stepped once by the true simulator (fixed seed); the fit is ordinary least squares, one output at a time.",
          "「概念 ▸ 動態與推演」裡學到的模型是擬合出來的，不是手寫的。資料是 2000 個接近直立的隨機狀態與隨機推力，各用真實模擬器推進一步（固定種子）；擬合用的是普通最小平方法，一次處理一個輸出。",
        ]}
      />
      <Code title="src/models/cartpole.ts" code={`${region(cartpoleSrc, "data")}\n\n${region(cartpoleSrc, "fit")}`} />
      <Callout kind="tip" title={["Fit offline, run online", "離線擬合，線上執行"]}>
        <P
          t={[
            "The book never trains in the browser. Small fits like this one run once, deterministically; larger models are trained by scripts and shipped as fixed weights. The demo only ever calls `learned(s, f)`.",
            "本書從不在瀏覽器裡訓練。像這樣的小型擬合只執行一次，而且結果確定；較大的模型由腳本訓練，以固定權重的形式發布。示範只會呼叫 `learned(s, f)`。",
          ]}
        />
      </Callout>
      <P
        t={[
          "**Losses.** A learned world model is trained by making some number small. Three kinds cover most of the field. A **reconstruction** loss compares a decoded observation $\\hat x$ with the real one $x$; mean squared error is the negative log-likelihood of a Gaussian decoder, up to scale and a constant:",
          "**損失函數。**學習而來的世界模型，是靠把某個數字變小來訓練的。三種損失涵蓋了這個領域的大部分。**重建**損失比較解碼出來的觀測 $\\hat x$ 與真實觀測 $x$；均方誤差就是高斯解碼器的負對數似然，只差一個比例與常數：",
        ]}
      />
      <Eq tex={"-\\log \\mathcal N(x;\\, \\hat x,\\, \\sigma^2 I) = \\frac{1}{2\\sigma^2}\\|x - \\hat x\\|^2 + \\frac{n}{2}\\log(2\\pi\\sigma^2)"} />
      <Code title="src/models/losses.ts" code={region(lossesSrc, "reconstruction")} />
      <P
        t={[
          "A **KL** term measures how far the encoder's distribution $q$ over latents is from a prior $p$. In a VAE the prior is $\\mathcal N(0, I)$ and the KL keeps the latent space tidy; in an RSSM the prior is the dynamics model's *prediction* of the next latent, so this same term is what trains the model to predict. For diagonal Gaussians it has a closed form:",
          "**KL** 項衡量編碼器在潛在變數上的分布 $q$ 離先驗 $p$ 有多遠。在 VAE 中，先驗是 $\\mathcal N(0, I)$，KL 讓潛在空間保持整齊；在 RSSM 中，先驗是動態模型對下一個潛在狀態的*預測*，所以同一項正是訓練模型去預測的東西。對角高斯分布的 KL 有封閉形式：",
        ]}
      />
      <Eq tex={"\\mathrm{KL}(q \\,\\|\\, p) = \\sum_i \\log\\frac{\\sigma_{p,i}}{\\sigma_{q,i}} + \\frac{\\sigma_{q,i}^2 + (\\mu_{q,i} - \\mu_{p,i})^2}{2\\sigma_{p,i}^2} - \\frac12"} />
      <Code title="src/models/losses.ts" code={region(lossesSrc, "kl")} />
      <Figure caption={["Drag the posterior's mean and spread: the KL is zero only when $q$ and $p$ coincide. With the RSSM prior, the model is rewarded for predicting where the encoder will put the next latent. One latent dimension; real models use tens to thousands.", "拖動後驗的平均與分散程度：只有當 $q$ 與 $p$ 重合時，KL 才是零。使用 RSSM 先驗時，模型若能預測編碼器會把下一個潛在狀態放在哪裡，就會得到獎勵。這裡只有一個潛在維度；真實模型用的是幾十到幾千個。"]}>
        <RolloutLossDemo />
      </Figure>
      <P
        t={[
          "A **latent prediction** loss skips pixels entirely: predict the embedding of what happened next and compare it with the embedding the encoder actually produces (the JEPA idea). Its trap is visible in the code: if the encoder maps every input to the same vector, the loss is zero. Training must prevent that collapse, for example by holding the target fixed and updating it slowly, or by adding a term that keeps embeddings spread out.",
          "**潛在預測**損失完全跳過像素：預測接下來發生之事的嵌入，並和編碼器實際產生的嵌入比較（JEPA 的想法）。它的陷阱在程式碼裡就看得到：如果編碼器把每個輸入都映射到同一個向量，損失就是零。訓練必須防止這種塌縮，例如固定目標並緩慢更新它，或加上一項讓嵌入保持分散的損失。",
        ]}
      />
      <Code title="src/models/losses.ts" code={region(lossesSrc, "latent")} />
      <List
        items={[
          ["`vaeLoss` = reconstruction + β · KL to $\\mathcal N(0, I)$: the loss of the V in Ha & Schmidhuber's World Models.", "`vaeLoss` = 重建 + β · 對 $\\mathcal N(0, I)$ 的 KL：Ha 與 Schmidhuber 的 World Models 中 V 的損失。"],
          ["PlaNet and Dreamer: reconstruction (and reward) + KL between posterior and predicted prior, summed over time.", "PlaNet 與 Dreamer：重建（以及獎勵）+ 後驗與預測先驗之間的 KL，在時間上加總。"],
          ["JEPA-style models: latent prediction, plus an anti-collapse mechanism.", "JEPA 類模型：潛在預測，加上防塌縮機制。"],
        ]}
      />
      <p>
        <SiteLink to={["skills", "checking", "tests"]} label={["How the tests check these files", "測試如何檢查這些檔案"]} />
      </p>
      <Sources
        items={[
          { label: "Kingma & Welling (2014), Auto-Encoding Variational Bayes", url: "https://arxiv.org/abs/1312.6114" },
          { label: "Hafner et al. (2019), Learning Latent Dynamics for Planning from Pixels (PlaNet)", url: "https://arxiv.org/abs/1811.04551" },
          { label: "Ha & Schmidhuber (2018), World Models", url: "https://arxiv.org/abs/1803.10122" },
          { label: "Assran et al. (2023), Self-Supervised Learning from Images with a Joint-Embedding Predictive Architecture (I-JEPA)", url: "https://arxiv.org/abs/2301.08243" },
          { label: "Florian (2007), Correct equations for the dynamics of the cart-pole system (PDF)", url: "https://coneural.org/florian/papers/05_cart_pole.pdf" },
        ]}
      />
      <HistoryLinks ids={["dreamer", "world-models"]} />
    </Section>
  );
}
