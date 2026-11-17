/**
 * Coding Skills ▸ States, models and rollouts (#/skills/models[/<section>]): real excerpts of the book's Python models
 * (python/wm/); the demos run the same models, ported to TypeScript (src/models/).
 */
import { SKILLS_OUTLINES } from "../../curriculum.ts";
import { CartpoleTrajectory } from "../../demos/CartpoleDemo.tsx";
import { GridworldTypes } from "../../demos/GridworldDemo.tsx";
import RolloutLossDemo from "../../demos/RolloutLossDemo.tsx";
import cartpoleSrc from "../../../python/wm/cartpole.py?raw";
import ensembleSrc from "../../../python/wm/ensemble.py?raw";
import gridworldSrc from "../../../python/wm/gridworld.py?raw";
import lossesSrc from "../../../python/wm/losses.py?raw";
import { GaussianNllPicture, KlPicture } from "../../demos/pictures/ModelsPictures.tsx";
import { Callout, Figure, HistoryLinks, List, P, Page, Pictured, Py, pyRegion, Section, SiteLink, Sources } from "../kit.tsx";

const OUTLINE = SKILLS_OUTLINES.find((o) => o.id === "models")!;
const PAGE = "models";

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
      <Py title="python/wm/gridworld.py" code={pyRegion(gridworldSrc, "types")} />
      <Figure caption={["Hover over (or tab to) a field of the state to see which cells it describes.", "把滑鼠移到（或用 Tab 鍵選取）狀態的某個欄位，看看它描述的是哪些格子。"]}>
        <GridworldTypes />
      </Figure>
      <P
        t={[
          "The **observation** is a different type from the state on purpose. Here it is a picture, one symbol per cell, made by an observation function; a learned world model usually only ever sees this side, and has to infer the state from it. Keeping the two apart in code keeps you honest about what an agent can actually know.",
          "**觀測**刻意和狀態用不同的型別。這裡它是一張圖，每個格子一個符號，由觀測函式產生；學習而來的世界模型通常只看得到這一側，必須從中推斷狀態。在程式碼裡把兩者分開，能讓你誠實面對智能體實際上能知道什麼。",
        ]}
      />
      <Py title="python/wm/gridworld.py" code={pyRegion(gridworldSrc, "observe")} />
      <P
        t={[
          "Cart-pole needs fewer words: its state is four numbers, $(x, \\dot x, \\theta, \\dot\\theta)$, and a comment documents their order and units. The action is one number, the force in newtons.",
          "倒單擺小車需要的說明更少：它的狀態是四個數字 $(x, \\dot x, \\theta, \\dot\\theta)$，用一行註解記下它們的順序與單位。動作是一個數字：以牛頓為單位的推力。",
        ]}
      />
      <Py title="python/wm/cartpole.py" code={pyRegion(cartpoleSrc, "state")} />
      <P
        t={[
          "**Randomness is part of the interface.** Every model in this book takes its random numbers from a seeded generator, `np.random.default_rng(seed)`, created once and passed along, so a test and a figure in the text see the same \"random\" run every time. Never call the global `np.random.rand()` inside a model: a test that fails one time in a hundred is worse than no test.",
          "**隨機性是介面的一部分。**本書的每個模型都從帶種子的產生器 `np.random.default_rng(seed)` 取得亂數，產生器只建立一次並一路傳下去，所以測試與文中的圖每次看到的都是同一次「隨機」執行。絕對不要在模型裡呼叫全域的 `np.random.rand()`：一百次裡失敗一次的測試，比沒有測試還糟。",
        ]}
      />
      <Py
        title="python/wm/ensemble.py"
        code={pyRegion(ensembleSrc, "dataset")}
        note={[
          "The demos run the same models, ported to TypeScript, with their own seeded generator (mulberry32), so their random draws differ from numpy's; the tests compare the two ports on given inputs instead.",
          "示範執行的是移植到 TypeScript 的同一批模型，用它們自己的帶種子產生器（mulberry32），所以抽出的亂數和 numpy 的不同；測試改為在給定的輸入上比對兩個版本。",
        ]}
      />
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
      <Py title="python/wm/cartpole.py" code={pyRegion(cartpoleSrc, "step")} />
      <P
        t={[
          "A rollout does not care whether the step is the true simulator or a learned approximation: both are a `Model`, a function of a state and a force. That is the point: you can swap one for the other and compare.",
          "推演並不在乎那一步是真實模擬器還是學到的近似：兩者都是 `Model`：一個以狀態與推力為輸入的函式。重點就在這裡：你可以把其中一個換成另一個來比較。",
        ]}
      />
      <Py title="python/wm/cartpole.py" code={pyRegion(cartpoleSrc, "rollout")} />
      <Figure caption={["`rollout(step, [0, 0, 0.1, 0], forces)` with alternating ±5 N pushes: the slider sets how many forces, and so how many states, there are.", "`rollout(step, [0, 0, 0.1, 0], forces)`，推力交替為 ±5 N：滑桿決定有幾個推力，也就決定有幾個狀態。"]}>
        <CartpoleTrajectory />
      </Figure>
      <P
        t={[
          "The learned model of Concepts ▸ Dynamics and rollouts is fitted, not hand-written. The data are 2000 random states near upright with random forces, each stepped once by the true simulator (fixed seed); the fit is ordinary least squares, all four outputs in one solve.",
          "「概念 ▸ 動態與推演」裡學到的模型是擬合出來的，不是手寫的。資料是 2000 個接近直立的隨機狀態與隨機推力，各用真實模擬器推進一步（固定種子）；擬合用的是普通最小平方法，四個輸出一次解完。",
        ]}
      />
      <Py title="python/wm/cartpole.py" code={`${pyRegion(cartpoleSrc, "data")}\n\n\n${pyRegion(cartpoleSrc, "fit")}`} />
      <Callout kind="tip" title={["Fit offline, run online", "離線擬合，線上執行"]}>
        <P
          t={[
            "The book never trains in the browser. Small fits like this one run once, deterministically; larger models are trained by scripts and shipped as fixed weights. The demo, the same model ported to TypeScript, only ever calls `learned(s, f)`.",
            "本書從不在瀏覽器裡訓練。像這樣的小型擬合只執行一次，而且結果確定；較大的模型由腳本訓練，以固定權重的形式發布。示範（移植到 TypeScript 的同一個模型）只會呼叫 `learned(s, f)`。",
          ]}
        />
      </Callout>
      <P
        t={[
          "**Losses.** A learned world model is trained by making some number small. Three kinds cover most of the field. A **reconstruction** loss compares a decoded observation $\\hat x$ with the real one $x$; mean squared error is the negative log-likelihood of a Gaussian decoder, up to scale and a constant:",
          "**損失函數。**學習而來的世界模型，是靠把某個數字變小來訓練的。三種損失涵蓋了這個領域的大部分。**重建**損失比較解碼出來的觀測 $\\hat x$ 與真實觀測 $x$；均方誤差就是高斯解碼器的負對數似然，只差一個比例與常數：",
        ]}
      />
      <Pictured
        tex={"-\\log \\mathcal N(x;\\, \\hat x,\\, \\sigma^2 I) = \\frac{1}{2\\sigma^2}\\|x - \\hat x\\|^2 + \\frac{n}{2}\\log(2\\pi\\sigma^2)"}
        caption={[
          "Above: the decoder predicts a Gaussian of width $\\sigma$ around $\\hat x$; the real $x$ lands off-centre. Below: $-\\log \\mathcal N$ is a bowl. Its floor, the constant $\\tfrac n2\\log 2\\pi\\sigma^2$, does not depend on $\\hat x$; the loss above the floor is the squared distance over $2\\sigma^2$, which is why minimising it is minimising squared error.",
          "上：解碼器以 $\\hat x$ 為中心預測一個寬度 $\\sigma$ 的高斯分布；真實的 $x$ 落在偏離中心的地方。下：$-\\log \\mathcal N$ 是一個碗。碗底的常數 $\\tfrac n2\\log 2\\pi\\sigma^2$ 與 $\\hat x$ 無關；高出碗底的部分是距離平方除以 $2\\sigma^2$，所以最小化它就是最小化平方誤差。",
        ]}
      >
        <GaussianNllPicture />
      </Pictured>
      <Py title="python/wm/losses.py" code={pyRegion(lossesSrc, "reconstruction")} />
      <P
        t={[
          "A **KL** term measures how far the encoder's distribution $q$ over latents is from a prior $p$. In a VAE the prior is $\\mathcal N(0, I)$ and the KL keeps the latent space tidy; in an RSSM the prior is the dynamics model's *prediction* of the next latent, so this same term is what trains the model to predict. For diagonal Gaussians it has a closed form:",
          "**KL** 項衡量編碼器在潛在變數上的分布 $q$ 離先驗 $p$ 有多遠。在 VAE 中，先驗是 $\\mathcal N(0, I)$，KL 讓潛在空間保持整齊；在 RSSM 中，先驗是動態模型對下一個潛在狀態的*預測*，所以同一項正是訓練模型去預測的東西。對角高斯分布的 KL 有封閉形式：",
        ]}
      />
      <Pictured
        tex={"\\mathrm{KL}(q \\,\\|\\, p) = \\sum_i \\log\\frac{\\sigma_{p,i}}{\\sigma_{q,i}} + \\frac{\\sigma_{q,i}^2 + (\\mu_{q,i} - \\mu_{p,i})^2}{2\\sigma_{p,i}^2} - \\frac12"}
        caption={[
          "One latent dimension. Blue dashed: the prior $p$; amber: the posterior $q$. The KL grows with the gap $\\mu_q - \\mu_p$ measured in units of $\\sigma_p$, and with the mismatch of widths $\\sigma_q$ and $\\sigma_p$; the shaded part is where $q$ puts mass that $p$ thinks unlikely. It is zero only when the two curves coincide.",
          "一個潛在維度。藍色虛線：先驗 $p$；琥珀色：後驗 $q$。KL 隨平均值差距 $\\mu_q - \\mu_p$（以 $\\sigma_p$ 為單位）增大，也隨寬度 $\\sigma_q$ 與 $\\sigma_p$ 的不一致增大；陰影部分是 $q$ 放了機率、而 $p$ 認為不太可能的地方。只有兩條曲線重合時它才是零。",
        ]}
      >
        <KlPicture />
      </Pictured>
      <Py title="python/wm/losses.py" code={pyRegion(lossesSrc, "kl")} />
      <Figure caption={["Drag the posterior's mean and spread: the KL is zero only when $q$ and $p$ coincide. With the RSSM prior, the model is rewarded for predicting where the encoder will put the next latent. One latent dimension; real models use tens to thousands.", "拖動後驗的平均與分散程度：只有當 $q$ 與 $p$ 重合時，KL 才是零。使用 RSSM 先驗時，模型若能預測編碼器會把下一個潛在狀態放在哪裡，就會得到獎勵。這裡只有一個潛在維度；真實模型用的是幾十到幾千個。"]}>
        <RolloutLossDemo />
      </Figure>
      <P
        t={[
          "A **latent prediction** loss skips pixels entirely: predict the embedding of what happened next and compare it with the embedding the encoder actually produces (the JEPA idea). Its trap is visible in the code: if the encoder maps every input to the same vector, the loss is zero. Training must prevent that collapse, for example by holding the target fixed and updating it slowly, or by adding a term that keeps embeddings spread out.",
          "**潛在預測**損失完全跳過像素：預測接下來發生之事的嵌入，並和編碼器實際產生的嵌入比較（JEPA 的想法）。它的陷阱在程式碼裡就看得到：如果編碼器把每個輸入都映射到同一個向量，損失就是零。訓練必須防止這種塌縮，例如固定目標並緩慢更新它，或加上一項讓嵌入保持分散的損失。",
        ]}
      />
      <Py title="python/wm/losses.py" code={pyRegion(lossesSrc, "latent")} />
      <List
        items={[
          ["`vae_loss` = reconstruction + β · KL to $\\mathcal N(0, I)$: the loss of the V in Ha & Schmidhuber's World Models.", "`vae_loss` = 重建 + β · 對 $\\mathcal N(0, I)$ 的 KL：Ha 與 Schmidhuber 的 World Models 中 V 的損失。"],
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
