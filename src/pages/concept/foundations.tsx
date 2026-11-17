/** Concepts ▸ What is a world model? (#/concept/foundations[/<section>]): the loop, rollouts, uncertainty. */
import { useLang } from "@learnkit/web";
import { CONCEPT_OUTLINES } from "../../curriculum.ts";
import CartpoleDemo from "../../demos/CartpoleDemo.tsx";
import GridworldDemo from "../../demos/GridworldDemo.tsx";
import RolloutFan from "../../demos/RolloutFan.tsx";
import { COLOR } from "../../demos/RolloutPlot.tsx";
import { Callout, Eq, Figure, HistoryLinks, List, P, Page, Section, SiteLink, Sources, Table } from "../kit.tsx";

const OUTLINE = CONCEPT_OUTLINES.find((o) => o.id === "foundations")!;
const PAGE = "foundations";

/** The predict–act–plan loop: the world sends observations and rewards; inside the agent a model and a planner talk. */
function LoopDiagram() {
  const { pick } = useLang();
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, stroke: string, fill: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={fill} stroke={stroke} strokeWidth="1.6" />
      <text x={x + w / 2} y={y + h / 2 - 3} textAnchor="middle" fontSize="12" fontWeight="600" fill="#111827">
        {title}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize="9.5" fill="#4b5563">
        {sub}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 400 190" className="h-auto w-full max-w-[460px]" role="img" aria-label={pick(["The predict, act and plan loop", "預測、行動、規劃的循環"])}>
      <defs>
        <marker id="wm-loop-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#6b7280" />
        </marker>
      </defs>
      <rect x="170" y="8" width="222" height="174" rx="12" fill="none" stroke="#d1d5db" strokeDasharray="5 4" />
      <text x="384" y="176" textAnchor="end" fontSize="9.5" fill="#6b7280">
        {pick(["the agent", "智能體"])}
      </text>
      {box(8, 62, 112, 66, pick(["World", "世界"]), pick(["the true dynamics", "真實的動態"]), COLOR.truth, "#f3f4f6")}
      {box(196, 22, 170, 54, pick(["Model", "模型"]), pick(["predicts s′, o′, r from s, a", "由 s、a 預測 s′、o′、r"]), COLOR.model, "#fffbeb")}
      {box(196, 110, 170, 54, pick(["Planner", "規劃器"]), pick(["tries actions in imagination", "在想像中試動作"]), COLOR.second, "#f0f9ff")}
      <line x1="120" y1="78" x2="194" y2="52" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#wm-loop-arrow)" />
      <text x="150" y="55" textAnchor="middle" fontSize="10" fill="#374151" fontStyle="italic">
        o, r
      </text>
      <line x1="194" y1="138" x2="122" y2="112" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#wm-loop-arrow)" />
      <text x="152" y="140" textAnchor="middle" fontSize="10" fill="#374151" fontStyle="italic">
        a
      </text>
      <line x1="250" y1="78" x2="250" y2="108" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#wm-loop-arrow)" />
      <line x1="312" y1="108" x2="312" y2="78" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#wm-loop-arrow)" />
      <text x="246" y="97" textAnchor="end" fontSize="9" fill="#4b5563">
        {pick(["imagined futures", "想像的未來"])}
      </text>
      <text x="316" y="97" fontSize="9" fill="#4b5563">
        {pick(["candidate actions", "候選動作"])}
      </text>
    </svg>
  );
}

export default function Foundations({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <Loop />
      <Rollouts />
      <Uncertainty />
    </Page>
  );
}

function Loop() {
  return (
    <Section page={PAGE} id="loop" n={1} title={["Predict, act, plan", "預測、行動、規劃"]}>
      <P
        t={[
          "In 1943 the psychologist Kenneth Craik suggested that a mind carries a \"small-scale model\" of the world and of its own possible actions. With it, you can try alternatives in your head, see which turns out best, and react to a situation before it arises. That is still the whole idea: **a world model is something you can ask \"what happens if I do this?\" without doing it.**",
          "1943 年，心理學家肯尼斯·克雷克提出：心智裡帶著一個關於世界、以及自身可能行動的「小尺度模型」。有了它，你可以在腦中試試不同的選擇，看哪一個結果最好，並在情況發生之前就做出反應。這至今仍是全部的核心想法：**世界模型就是一個你可以問「如果我這樣做，會發生什麼？」而不必真的去做的東西。**",
        ]}
      />
      <Figure caption={["The loop. The world sends an observation $o$ and a reward $r$; inside the agent, a planner proposes actions, the model predicts what each would lead to, and the best action $a$ goes back to the world.", "循環。世界送出觀測 $o$ 與獎勵 $r$；在智能體內部，規劃器提出動作，模型預測每個動作的後果，最好的動作 $a$ 再送回世界。"]}>
        <LoopDiagram />
      </Figure>
      <P
        t={[
          "Machine learning makes this precise. The world has a **state** $s_t$ at time $t$; the agent takes an **action** $a_t$. A world model has up to three parts:",
          "機器學習把這件事說得更精確。世界在時間 $t$ 有一個**狀態** $s_t$；智能體採取一個**動作** $a_t$。世界模型最多有三個部分：",
        ]}
      />
      <Eq tex={"s_{t+1} \\sim p(s_{t+1} \\mid s_t, a_t), \\qquad o_t \\sim p(o_t \\mid s_t), \\qquad r_t = r(s_t, a_t)"} />
      <List
        items={[
          ["the **transition model** $p(s' \\mid s, a)$: a probability distribution over the next state $s'$ given the state and action (a point mass if the world is deterministic);", "**轉移模型** $p(s' \\mid s, a)$：給定狀態與動作時，下一個狀態 $s'$ 的機率分布（若世界是確定性的，它就是單一點上的機率質量）；"],
          ["the **observation model** $p(o \\mid s)$: what the agent sees, such as an image, in that state;", "**觀測模型** $p(o \\mid s)$：在那個狀態下智能體看到什麼，例如一張影像；"],
          ["the **reward model** $r(s, a)$: how good the step was for the task.", "**獎勵模型** $r(s, a)$：這一步對任務來說有多好。"],
        ]}
      />
      <P
        t={[
          "Real agents rarely see the state; they see pixels. So most learned world models put an **encoder** first: it compresses the observation into a short **latent state** $z_t$, and the transition model predicts the next latent, $\\hat z_{t+1} = f(z_t, a_t)$, not the next image. Predicting every pixel is expensive and wastes effort on detail that does not matter for acting (the texture of a wall). A decoder back to pixels is optional: useful for training and for showing a human what the model thinks, but not needed to plan.",
          "真實的智能體很少直接看到狀態；它看到的是像素。所以大多數學習而來的世界模型先放一個**編碼器**：把觀測壓縮成一個短的**潛在狀態** $z_t$，轉移模型再預測下一個潛在狀態 $\\hat z_{t+1} = f(z_t, a_t)$，而不是下一張影像。預測每一個像素代價很高，而且把力氣浪費在對行動無關緊要的細節上（例如牆面的紋理）。解碼回像素的解碼器是可有可無的：它對訓練、以及讓人看見模型在想什麼很有用，但規劃時並不需要。",
        ]}
      />
      <P
        t={[
          "Below, the state is small enough to draw directly: the agent's cell, whether it holds the key, whether the door is open. The **world** applies the true step; the **model** predicts the step from the same state. The model was learned from logged moves in which nobody walked on ice or carried the key to the door, so it has two blind spots.",
          "下面的狀態小到可以直接畫出來：智能體所在的格子、是否拿著鑰匙、門是否已打開。**世界**執行真實的一步；**模型**從同一個狀態預測這一步。這個模型是從記錄下來的移動學來的，而那些記錄裡沒有人走過冰面、也沒有人帶著鑰匙走到門口，所以它有兩個盲點。",
        ]}
      />
      <Figure
        caption={[
          "A toy: the \"learned\" model is a fixed rule set standing in for a model fitted to those logs (it learned walls, floor, the key and the reward, but believes ice is floor and doors never open). Differing cells are outlined in red; the agent is amber where predicted, gray where real.",
          "玩具示範：這個「學到的」模型是一組固定規則，代表用那些記錄擬合出來的模型（它學會了牆、地板、鑰匙與獎勵，卻以為冰面就是地板、門永遠打不開）。不同的格子以紅框標出；預測的智能體是琥珀色，真實的是灰色。",
        ]}
      >
        <GridworldDemo />
      </Figure>
      <P t={["What to notice:", "請留意："]} />
      <List
        items={[
          ["On ordinary floor the model is exactly right, step after step. A model can be perfect where it has data and wrong only at the edges of its experience.", "在普通地板上，模型一步接一步都完全正確。模型可以在有資料的地方完美無缺，只在經驗的邊緣出錯。"],
          ["Its mistakes are not random: they come from what was missing in its training data. That is the usual way a learned model fails.", "它的錯誤並非隨機，而是來自訓練資料裡缺少的東西。這正是學習而來的模型最常見的失敗方式。"],
          ["A planner using this model would never try the door, because the model says it cannot open, and would misjudge every path across the ice.", "使用這個模型的規劃器永遠不會去試那扇門，因為模型說它打不開；而且會誤判每一條穿過冰面的路徑。"],
        ]}
      />
      <P
        t={[
          "What is a model for? Three uses run through this book. **Planning**: search over action sequences inside the model and act on the best one (Concepts ▸ Planning). **Learning in imagination**: generate practice experience from the model to train a policy, as in Sutton's Dyna (1990) and Dreamer. **Simulation**: a model good enough to stand in for the world, for testing or training other systems.",
          "模型拿來做什麼？本書有三種用途貫穿全篇。**規劃**：在模型裡搜尋動作序列，然後執行最好的那一個（概念 ▸ 規劃）。**在想像中學習**：用模型產生練習用的經驗來訓練策略，例如薩頓的 Dyna（1990）與 Dreamer。**模擬**：一個好到足以取代世界的模型，用來測試或訓練其他系統。",
        ]}
      />
      <p>
        <SiteLink to={["concept", "planning", "cem"]} label={["Planning with a model", "用模型規劃"]} />
      </p>
      <Sources
        items={[
          { label: "Craik (1943), The Nature of Explanation (Wikipedia: Kenneth Craik)", url: "https://en.wikipedia.org/wiki/Kenneth_Craik" },
          { label: "Sutton & Barto (2018), Reinforcement Learning: An Introduction, 2nd ed., ch. 3 and 8 (free online)", url: "http://incompleteideas.net/book/the-book-2nd.html" },
          { label: "Ha & Schmidhuber (2018), World Models", url: "https://arxiv.org/abs/1803.10122" },
          { label: "Hafner et al. (2019), Learning Latent Dynamics for Planning from Pixels (PlaNet)", url: "https://arxiv.org/abs/1811.04551" },
        ]}
      />
      <HistoryLinks ids={["craik", "dyna"]} />
    </Section>
  );
}

function Rollouts() {
  return (
    <Section page={PAGE} id="rollouts" n={2} title={["Dynamics and rollouts", "動態與推演"]}>
      <P
        t={[
          "A model that predicts one step is useful; a model that predicts fifty is what planning needs. To look $H$ steps ahead, you call the one-step model in a loop and feed each prediction back in as the next input. That loop is a **rollout**:",
          "能預測一步的模型很有用；能預測五十步的模型，才是規劃所需要的。要往前看 $H$ 步，就在迴圈中呼叫單步模型，並把每次的預測當成下一次的輸入餵回去。這個迴圈就是**推演**（rollout）：",
        ]}
      />
      <Eq tex={"\\hat s_0 = s_0, \\qquad \\hat s_{t+1} = \\hat f(\\hat s_t, a_t), \\quad t = 0, 1, \\dots, H-1"} />
      <P
        t={[
          "Here $\\hat f$ is the learned model and $f$ the true dynamics. The catch is in the hats: after the first step the model never sees a true state again. Write the error as $e_t = \\hat s_t - s_t$ and split one step of it in two:",
          "這裡 $\\hat f$ 是學到的模型，$f$ 是真實的動態。關鍵在那些「帽子」：第一步之後，模型再也看不到真實的狀態。把誤差寫成 $e_t = \\hat s_t - s_t$，並把其中一步拆成兩部分：",
        ]}
      />
      <Eq tex={"e_{t+1} = \\underbrace{\\hat f(\\hat s_t, a_t) - \\hat f(s_t, a_t)}_{\\text{old error, carried forward}} + \\underbrace{\\hat f(s_t, a_t) - f(s_t, a_t)}_{\\text{new one-step error}}"} />
      <P
        t={[
          "If the model's one-step error is at most $\\varepsilon$ and it stretches distances by at most a factor $L$ per step (its Lipschitz constant), then $\\|e_{t+1}\\| \\le L\\|e_t\\| + \\varepsilon$, and so",
          "如果模型的單步誤差最多是 $\\varepsilon$，而且每一步最多把距離拉長 $L$ 倍（它的利普希茨常數），那麼 $\\|e_{t+1}\\| \\le L\\|e_t\\| + \\varepsilon$，因此",
        ]}
      />
      <Eq tex={"\\|e_H\\| \\le \\varepsilon\\,(1 + L + \\dots + L^{H-1}) = \\varepsilon\\,\\frac{L^H - 1}{L - 1}"} />
      <P
        t={[
          "With $L < 1$ (a system that forgets) the error levels off near $\\varepsilon/(1-L)$. With $L = 1$ it grows in proportion to $H$. With $L > 1$, an unstable system such as a pole balanced upright, it grows **exponentially**: the model is fed its own mistakes, and the dynamics amplify them. This is **compounding error**, and it is why a small one-step loss does not guarantee a useful long-horizon model.",
          "若 $L < 1$（會「遺忘」的系統），誤差會穩定在 $\\varepsilon/(1-L)$ 附近。若 $L = 1$，誤差與 $H$ 成正比增長。若 $L > 1$，也就是像直立擺桿這樣的不穩定系統，誤差會**指數**增長：模型被餵入自己的錯誤，而動態又把錯誤放大。這就是**誤差累積**（compounding error），也是為什麼單步損失很小，並不保證長步數的模型好用。",
        ]}
      />
      <P
        t={[
          "The demo uses **cart-pole**: a cart on a rail with a pole hinged on top, the classic control benchmark. With cart mass $m_c = 1$ kg, pole mass $m = 0.1$ kg, pole half-length $l = 0.5$ m, force $F$ and $M = m_c + m$, the frictionless equations of motion are",
          "示範使用**倒單擺小車**（cart-pole）：一台在軌道上的小車，頂上鉸接一根擺桿，是經典的控制基準問題。小車質量 $m_c = 1$ kg、擺桿質量 $m = 0.1$ kg、擺桿半長 $l = 0.5$ m、推力 $F$、$M = m_c + m$，無摩擦的運動方程為",
        ]}
      />
      <Eq tex={"\\ddot\\theta = \\frac{g\\sin\\theta - \\cos\\theta\\,\\dfrac{F + m l \\dot\\theta^2 \\sin\\theta}{M}}{l\\left(\\tfrac43 - \\dfrac{m\\cos^2\\theta}{M}\\right)}, \\qquad \\ddot x = \\frac{F + m l(\\dot\\theta^2\\sin\\theta - \\ddot\\theta\\cos\\theta)}{M}"} />
      <P
        t={[
          "The true simulator integrates these with fourth-order Runge–Kutta at $\\Delta t = 0.02$ s. The learned model is **linear**, $\\hat s' = A s + B F + c$ with $s = (x, \\dot x, \\theta, \\dot\\theta)$, its weights fitted once by least squares to 2000 simulated steps from states near upright. Its one-step error there is about $10^{-5}$. Around upright the pole's small deviations grow by about $e^{3.97\\,\\Delta t} \\approx 1.08$ per step (from linearising the equation above), so even that tiny error roughly doubles every nine steps.",
          "真實模擬器以四階龍格–庫塔法、時間步長 $\\Delta t = 0.02$ 秒積分這些方程。學到的模型是**線性的**：$\\hat s' = A s + B F + c$，其中 $s = (x, \\dot x, \\theta, \\dot\\theta)$，權重用最小平方法，從接近直立的狀態出發的 2000 個模擬步驟一次擬合而成。它在那裡的單步誤差約為 $10^{-5}$。在直立附近，擺桿的小偏差每一步大約放大 $e^{3.97\\,\\Delta t} \\approx 1.08$ 倍（由上式線性化而得），所以即使這麼小的誤差，大約每九步也會翻倍。",
        ]}
      />
      <Figure
        caption={[
          "Gray: the true simulator; amber dashed: the learned linear model, from the same start and the same forces. Right: the mean error over 40 random starts, log scale: open-loop rollout (amber) against restarting the model from the true state at every step (blue). A toy: four state numbers, no noise, no learning in the browser; the weights are fitted once from a fixed seed.",
          "灰色：真實模擬器；琥珀色虛線：學到的線性模型，兩者起點與推力相同。右圖：40 個隨機起點的平均誤差（對數刻度）：開迴路推演（琥珀色）對比每一步都從真實狀態重新開始（藍色）。玩具示範：狀態只有四個數字、沒有雜訊、瀏覽器裡不做訓練；權重以固定種子一次擬合而成。",
        ]}
      >
        <CartpoleDemo />
      </Figure>
      <P t={["What to notice:", "請留意："]} />
      <List
        items={[
          ["For the first dozen steps the two cart-poles overlap: one-step accuracy is excellent.", "前十幾步，兩台小車幾乎重疊：單步準確度非常好。"],
          ["The blue one-step curve stays low, while the amber rollout curve climbs in a straight line on the log scale: exponential growth, as the bound predicts for $L > 1$.", "藍色的單步曲線一直很低，而琥珀色的推演曲線在對數刻度上呈直線上升：正是上界在 $L > 1$ 時所預測的指數增長。"],
          ["Once the pole is far from upright, a second problem joins in: the model was fitted only near $\\theta = 0$, and a linear model cannot represent a pole that falls and swings below the rail. The true angle settles into a swing about $\\theta = \\pi$; the model's keeps growing.", "一旦擺桿遠離直立，第二個問題也加入了：模型只在 $\\theta = 0$ 附近擬合，而線性模型無法表示擺桿倒下並在軌道下方擺盪。真實的角度最後繞著 $\\theta = \\pi$ 擺動；模型的角度卻一直增長。"],
        ]}
      />
      <P
        t={[
          "How do real systems keep this under control? The oldest answer is not to roll out blind for long: **predict, then correct** with each new observation. The Kalman filter (1960) does exactly this for a linear model $x_{t+1} = A x_t + B u_t + w_t$ observed as $y_t = H x_t + v_t$, with process noise covariance $Q$ and measurement noise covariance $R$. It keeps a mean $\\hat x$ and a covariance $P$:",
          "真實系統怎麼控制這個問題？最古老的答案是：不要長時間盲目推演，而是每來一個新觀測就**先預測、再修正**。卡爾曼濾波器（1960）正是為線性模型 $x_{t+1} = A x_t + B u_t + w_t$ 做這件事，其觀測為 $y_t = H x_t + v_t$，過程雜訊共變異數為 $Q$、量測雜訊共變異數為 $R$。它維護一個平均值 $\\hat x$ 與一個共變異數 $P$：",
        ]}
      />
      <Eq tex={"\\text{predict:}\\quad \\hat x_{t\\mid t-1} = A\\hat x_{t-1\\mid t-1} + B u_{t-1}, \\qquad P_{t\\mid t-1} = A P_{t-1\\mid t-1} A^\\top + Q"} />
      <Eq tex={"\\text{correct:}\\quad K_t = P_{t\\mid t-1} H^\\top (H P_{t\\mid t-1} H^\\top + R)^{-1}, \\quad \\hat x_{t\\mid t} = \\hat x_{t\\mid t-1} + K_t\\,(y_t - H\\hat x_{t\\mid t-1}), \\quad P_{t\\mid t} = (I - K_t H) P_{t\\mid t-1}"} />
      <P
        t={[
          "The prediction step is a one-step rollout that also tracks how uncertain it is; the correction pulls the estimate toward the measurement, weighted by the **Kalman gain** $K_t$, which is large when the prediction is uncertain and small when the sensor is noisy. Learned latent world models keep the same two steps: a **prior** over the next latent predicted from the past, and a **posterior** corrected by the new observation. When the model imagines the future for planning, there is no observation to correct it, which is exactly the situation in the demo above.",
          "預測步驟就是一步推演，同時追蹤它有多不確定；修正步驟則把估計拉向量測值，權重是**卡爾曼增益** $K_t$：預測越不確定，增益越大；感測器雜訊越大，增益越小。學習而來的潛在世界模型保留了同樣的兩步：由過去預測下一個潛在狀態的**先驗**，以及由新觀測修正後的**後驗**。當模型為了規劃而想像未來時，並沒有觀測可以修正它，這正是上面示範的情況。",
        ]}
      />
      <Callout kind="note" title={["Why not just train on long rollouts?", "為什麼不直接用長推演來訓練？"]}>
        <P
          t={[
            "Some methods do: they train the model on multi-step predictions so it learns to correct its own drift, or they keep imagined rollouts short and branch them from real states (as MBPO does). The trade-off between model error and horizon is a central design choice of model-based reinforcement learning.",
            "有些方法確實這麼做：用多步預測訓練模型，讓它學會修正自己的漂移；或者讓想像的推演保持很短，並從真實狀態分岔出去（例如 MBPO）。模型誤差與步數之間的取捨，是以模型為基礎的強化學習的核心設計選擇之一。",
          ]}
        />
      </Callout>
      <Sources
        items={[
          { label: "Kalman (1960), A New Approach to Linear Filtering and Prediction Problems", url: "https://doi.org/10.1115/1.3662552" },
          { label: "Barto, Sutton & Anderson (1983), Neuronlike adaptive elements that can solve difficult learning control problems", url: "https://doi.org/10.1109/TSMC.1983.6313077" },
          { label: "Florian (2007), Correct equations for the dynamics of the cart-pole system (PDF)", url: "https://coneural.org/florian/papers/05_cart_pole.pdf" },
          { label: "Janner et al. (2019), When to Trust Your Model: Model-Based Policy Optimization (MBPO)", url: "https://arxiv.org/abs/1906.08253" },
          { label: "Deisenroth & Rasmussen (2011), PILCO, ICML (PDF)", url: "https://mlg.eng.cam.ac.uk/pub/pdf/DeiRas11.pdf" },
        ]}
      />
      <HistoryLinks ids={["kalman", "pilco"]} />
    </Section>
  );
}

function Uncertainty() {
  return (
    <Section page={PAGE} id="uncertainty" n={3} title={["Stochasticity and uncertainty", "隨機性與不確定性"]}>
      <P
        t={[
          "A model that always gives one confident answer is dangerous to plan with. A planner is an optimiser, and an optimiser searches for whatever the model scores highly, including the places where the model is **wrong in its favour**. The defence is a model that says how sure it is. There are two different things to be unsure about.",
          "一個總是給出單一、篤定答案的模型，拿來規劃是很危險的。規劃器是一個最佳化器，而最佳化器會去找模型評分高的地方，其中包括模型**錯得對它有利**的地方。防禦方法是讓模型說出它有多確定。而值得不確定的，有兩種不同的東西。",
        ]}
      />
      <Table
        head={[["Kind", "種類"], ["Where it comes from", "從哪裡來"], ["More data helps?", "更多資料有用嗎？"]]}
        rows={[
          [["**Aleatoric**", "**偶然性**（aleatoric）"], ["Noise in the world itself: a die roll, a gust of wind, a sensor's jitter.", "世界本身的雜訊：擲骰子、一陣風、感測器的抖動。"], ["No: it is a property of the world.", "沒有用：它是世界的性質。"]],
          [["**Epistemic**", "**認知性**（epistemic）"], ["Gaps in the model's knowledge: states it has never seen.", "模型知識的缺口：它從沒見過的狀態。"], ["Yes: it shrinks where data is collected.", "有用：在收集到資料的地方會縮小。"]],
        ]}
      />
      <P
        t={[
          "If $m$ indexes the possible models (say, the members of an ensemble), the law of total variance splits a prediction's variance exactly into these two parts:",
          "若用 $m$ 表示可能的模型（例如集成中的各個成員），全變異數定律會把一個預測的變異數恰好拆成這兩部分：",
        ]}
      />
      <Eq tex={"\\operatorname{Var}[s'] = \\underbrace{\\mathbb{E}_m\\big[\\operatorname{Var}[s' \\mid m]\\big]}_{\\text{aleatoric: each model's noise}} + \\underbrace{\\operatorname{Var}_m\\big[\\mathbb{E}[s' \\mid m]\\big]}_{\\text{epistemic: models disagree}}"} />
      <P
        t={[
          "Three kinds of model, in increasing honesty. A **deterministic** model predicts one next state. A **stochastic** model predicts a distribution, here a Gaussian $\\mathcal N(\\hat f(s, a), \\hat\\sigma^2)$, and so represents aleatoric noise; but it is still one model, as sure of itself far from its data as on it. An **ensemble** trains $K$ models on resampled data with different random initialisations. Where the data constrains them they agree; beyond it each extrapolates its own way, and their **disagreement** marks the edge of the data. PETS (Chua et al., 2018) combined both: an ensemble of probabilistic networks, with each imagined trajectory following one member (\"trajectory sampling\"), and planned with the cross-entropy method.",
          "三種模型，誠實程度逐漸提高。**確定性**模型預測單一的下一個狀態。**隨機**模型預測一個分布，這裡是高斯分布 $\\mathcal N(\\hat f(s, a), \\hat\\sigma^2)$，因此能表示偶然性雜訊；但它仍然只是一個模型，在遠離資料的地方和在資料上一樣有把握。**集成**模型用重抽樣的資料、不同的隨機初始化訓練 $K$ 個模型。在資料約束得到的地方它們一致；超出資料後，每個模型各自外推，它們的**分歧**就標出了資料的邊界。PETS（Chua 等人，2018）把兩者結合起來：一個由機率神經網路組成的集成，每條想像的軌跡跟隨其中一個成員（「軌跡取樣」），並以交叉熵方法規劃。",
        ]}
      />
      <P
        t={[
          "The demo's world is one number $x$ that drifts upward with a wobble and noise, $x' = x + \\Delta(x) + \\sigma\\varepsilon$ with $\\sigma = 0.05$. The models saw transitions only for $x$ between 0 and 3 (the shaded band). Each member is a small random-feature regression fitted to a bootstrap resample of those transitions.",
          "示範中的世界只是一個數字 $x$，它帶著起伏和雜訊往上漂移：$x' = x + \\Delta(x) + \\sigma\\varepsilon$，$\\sigma = 0.05$。模型只看過 $x$ 介於 0 到 3 之間的轉移（陰影帶）。每個成員都是一個小型的隨機特徵迴歸，擬合在這些轉移的一份自助重抽樣（bootstrap）上。",
        ]}
      />
      <Figure
        caption={[
          "Left: rollouts of 25 steps from $x_0 = 0.5$; gray paths are the true world. Right: each model's predicted change $\\hat\\Delta(x)$ against the true one, with the training data as blue dots. A toy: one dimension, five members, linear-in-features models fitted by ridge regression with a fixed seed.",
          "左圖：從 $x_0 = 0.5$ 出發的 25 步推演；灰色路徑是真實世界。右圖：每個模型預測的變化量 $\\hat\\Delta(x)$ 與真實值的對照，藍點是訓練資料。玩具示範：一維、五個成員，以固定種子用嶺迴歸擬合的特徵線性模型。",
        ]}
      >
        <RolloutFan />
      </Figure>
      <P t={["What to notice:", "請留意："]} />
      <List
        items={[
          ["Inside the shaded band all three kinds of model track the true world well, and the ensemble's members lie on top of each other.", "在陰影帶內，三種模型都很貼近真實世界，集成的各成員也幾乎重疊。"],
          ["Beyond $x = 3$ the single model stalls where its fitted $\\hat\\Delta$ crosses zero. The stochastic version adds the right amount of *noise*, so its fan stays narrow: confidently wrong.", "超過 $x = 3$ 之後，單一模型在它擬合的 $\\hat\\Delta$ 穿過零的地方停住。隨機版本加上了正確份量的*雜訊*，所以它的扇形仍然很窄：錯得很有把握。"],
          ["The ensemble's fan opens up exactly where the members' curves part company on the right: disagreement is a usable signal of \"I have not seen this\". It is not a guarantee: members can agree and still all be wrong.", "集成的扇形恰好在右圖各成員曲線分開的地方張開：分歧是「我沒見過這個」的可用訊號。但這不是保證：成員可能彼此一致，卻全都錯了。"],
        ]}
      />
      <P
        t={[
          "A planner can use this signal in several ways: average its score over the members (PETS), penalise disagreement, or seek it out to explore. PILCO (2011) made the same point earlier with a Gaussian process, which gives a mean and a variance at every state, and used it to learn to swing up and balance a real cart-pole with 17.5 s of interaction.",
          "規劃器可以用好幾種方式使用這個訊號：把評分在各成員上取平均（PETS）、懲罰分歧，或者刻意去找分歧大的地方來探索。PILCO（2011）更早就用高斯過程表達了同樣的觀點：高斯過程在每個狀態都給出平均值與變異數，並用它只靠 17.5 秒的互動，就學會把真實的倒單擺甩上來並保持平衡。",
        ]}
      />
      <P
        t={[
          "Latent world models build uncertainty into the state itself. The **recurrent state-space model** (RSSM) of PlaNet and Dreamer splits the state into a deterministic memory $h_t$ and a stochastic latent $z_t$:",
          "潛在世界模型把不確定性直接放進狀態裡。PlaNet 與 Dreamer 的**遞迴狀態空間模型**（RSSM）把狀態分成確定性的記憶 $h_t$ 與隨機的潛在變數 $z_t$：",
        ]}
      />
      <Eq tex={"h_t = f(h_{t-1}, z_{t-1}, a_{t-1}), \\qquad \\text{prior } \\hat z_t \\sim p(\\hat z_t \\mid h_t), \\qquad \\text{posterior } z_t \\sim q(z_t \\mid h_t, o_t)"} />
      <P
        t={[
          "The deterministic path carries information reliably over many steps; the stochastic latent lets the model represent several possible futures. The prior and posterior are the Kalman filter's predict and correct, learned; while imagining, only the prior is available. The PlaNet paper's experiments found both paths crucial for successful planning: dropping either one did worse.",
          "確定性路徑能可靠地把資訊帶過很多步；隨機潛在變數讓模型能表示好幾種可能的未來。先驗與後驗就是學習而來的卡爾曼「預測」與「修正」；在想像時，只有先驗可用。PlaNet 論文的實驗發現兩條路徑對成功規劃都不可或缺：拿掉任何一條，表現都變差。",
        ]}
      />
      <p>
        <SiteLink to={["concept", "planning", "cem"]} label={["How a planner uses these rollouts", "規劃器如何使用這些推演"]} />
      </p>
      <Sources
        items={[
          { label: "Chua et al. (2018), Deep Reinforcement Learning in a Handful of Trials using Probabilistic Dynamics Models (PETS)", url: "https://arxiv.org/abs/1805.12114" },
          { label: "Hafner et al. (2019), Learning Latent Dynamics for Planning from Pixels (PlaNet)", url: "https://arxiv.org/abs/1811.04551" },
          { label: "Hafner et al. (2020), Dream to Control (Dreamer)", url: "https://arxiv.org/abs/1912.01603" },
          { label: "Lakshminarayanan et al. (2017), Simple and Scalable Predictive Uncertainty Estimation using Deep Ensembles", url: "https://arxiv.org/abs/1612.01474" },
          { label: "Kendall & Gal (2017), What Uncertainties Do We Need in Bayesian Deep Learning for Computer Vision?", url: "https://arxiv.org/abs/1703.04977" },
          { label: "Deisenroth & Rasmussen (2011), PILCO, ICML (PDF)", url: "https://mlg.eng.cam.ac.uk/pub/pdf/DeiRas11.pdf" },
        ]}
      />
      <HistoryLinks ids={["pilco", "dreamer"]} />
    </Section>
  );
}
