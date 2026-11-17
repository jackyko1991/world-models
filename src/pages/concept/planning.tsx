/**
 * Concepts ▸ Planning and imagination (#/concept/planning[/cem|imagination|muzero]): three ways to use a model.
 * Search for a plan (random shooting, CEM, MPC), practise a policy on imagined experience (Dyna, World Models,
 * Dreamer), and search with a model that predicts only what the search needs (MCTS, MuZero).
 */
import { CONCEPT_OUTLINES } from "../../curriculum.ts";
import CemPlanner from "../../demos/CemPlanner.tsx";
import DynaCurves from "../../demos/DynaCurves.tsx";
import MctsTree from "../../demos/MctsTree.tsx";
import MuzeroUnroll from "../../demos/MuzeroUnroll.tsx";
import { CEM_DEFAULTS } from "../../models/cem.ts";
import { CemRefitPicture, MuzeroLossPicture, PlanningObjectivePicture, QUpdatePicture, UctPicture } from "../../demos/pictures/PlanningPictures.tsx";
import { Callout, Evidence, Figure, HistoryLinks, List, P, Page, Pictured, Section, SiteLink, Sources, Table } from "../kit.tsx";

const OUTLINE = CONCEPT_OUTLINES.find((o) => o.id === "planning")!;
const PAGE = "planning";
const title = (id: string) => OUTLINE.sections.find((s) => s.id === id)!.title;
const { samples: N, elites: K } = CEM_DEFAULTS;

function Cem({ n }: { n: number }) {
  return (
    <Section page={PAGE} id="cem" n={n} title={title("cem")}>
      <P
        t={[
          "A model answers \"what happens if I do this?\". A planner asks it many times. Pick a whole sequence of actions, run it through the model, add up the cost, and try again with a different sequence. Nothing is done in the real world until the planner has settled on something.",
          "模型回答「如果我這樣做，會發生什麼？」。規劃器則是反覆問它：選一整串動作，丟進模型推演，把成本加起來，再換一串試試。在規劃器拿定主意之前，真實世界裡什麼都還沒做。",
        ]}
      />
      <P
        t={[
          "Write a plan of $H$ actions as one vector $\\mathbf a = (a_0, \\dots, a_{H-1})$. Starting from the current state $s$, the model $\\hat f$ predicts the states $\\hat s_{t+1} = \\hat f(\\hat s_t, a_t)$, and a cost $c$ scores each step:",
          "把 $H$ 個動作組成的計畫寫成一個向量 $\\mathbf a = (a_0, \\dots, a_{H-1})$。從目前狀態 $s$ 出發，模型 $\\hat f$ 預測狀態 $\\hat s_{t+1} = \\hat f(\\hat s_t, a_t)$，再由成本 $c$ 為每一步評分：",
        ]}
      />
      <Pictured
        tex="J(\mathbf a) = \sum_{t=0}^{H-1} c(\hat s_{t+1}, a_t), \qquad \hat s_0 = s."
        caption={[
          "From the real state $s$ the model imagines $H$ steps ahead (amber). Each bar is one step's cost, here the distance still to go; $J$ is the total of the bars. Only the first action $a_0$ is ever carried out.",
          "模型從真實狀態 $s$ 往前想像 $H$ 步（琥珀色）。每根長條是一步的成本，這裡是離目標還有多遠；$J$ 是長條的總和。真正會執行的只有第一個動作 $a_0$。",
        ]}
      >
        <PlanningObjectivePicture />
      </Pictured>
      <P
        t={[
          "**Random shooting** draws $N$ plans at random and keeps the cheapest. It is simple and parallel, but in a long plan almost every random sequence is poor, so it wastes most of its samples.",
          "**隨機射擊**隨機抽 $N$ 個計畫，留下最便宜的那個。它簡單又容易平行化，但計畫一長，隨機序列幾乎都很差，大部分樣本都白費了。",
        ]}
      />
      <P
        t={[
          "The **cross-entropy method** (CEM; Rubinstein, 1999) learns where to sample. It keeps a Gaussian over plans, $\\mathcal N(\\boldsymbol\\mu, \\operatorname{diag}\\boldsymbol\\sigma^2)$, and repeats four steps: sample $N$ plans $\\mathbf a^{(i)}$; score each with $J$; keep the $K$ cheapest, the **elites** $E$; refit the Gaussian to them:",
          "**交叉熵法**（CEM；Rubinstein，1999）學會該往哪裡取樣。它維持一個計畫上的高斯分布 $\\mathcal N(\\boldsymbol\\mu, \\operatorname{diag}\\boldsymbol\\sigma^2)$，反覆四步：取樣 $N$ 個計畫 $\\mathbf a^{(i)}$；用 $J$ 評分；留下最便宜的 $K$ 個，即**菁英** $E$；把高斯分布重新擬合到菁英上：",
        ]}
      />
      <Pictured
        tex="\boldsymbol\mu \leftarrow \frac1K \sum_{i \in E} \mathbf a^{(i)}, \qquad \boldsymbol\sigma^2 \leftarrow \frac1K \sum_{i \in E} \big(\mathbf a^{(i)} - \boldsymbol\mu\big)^2."
        caption={[
          "Each dot is a whole plan, squashed to a point in two dimensions for the picture; the gray rings are cost $J$, lowest at the centre. Plans are sampled from the old Gaussian (dashed). The $K$ cheapest (filled) become the elites, and the new $\\boldsymbol\\mu$, $\\boldsymbol\\sigma$ are their mean and spread: the solid ellipse, smaller and moved toward low cost.",
          "每個點是一整個計畫，為了作圖壓成二維中的一點；灰色圓環是成本 $J$，中心最低。計畫從舊的高斯分布（虛線）取樣。最便宜的 $K$ 個（實心）成為菁英，新的 $\\boldsymbol\\mu$、$\\boldsymbol\\sigma$ 就是它們的平均與分散：實線橢圓，更小，並移向低成本處。",
        ]}
      >
        <CemRefitPicture />
      </Pictured>
      <P
        t={[
          "Each round the Gaussian moves toward the cheap region and narrows. After a few rounds most samples are good ones.",
          "每一輪，高斯分布都朝便宜的區域移動並變窄。幾輪之後，大部分樣本都是好的。",
        ]}
      />
      <Figure
        caption={[
          `CEM on a point mass that must reach the goal around an obstacle. Each plan is 25 force vectors (2.5 s); ${N} samples per round, ${K} elites. **Next phase** walks through sample → elites → refit; **Act** carries out the first action of the best plan and replans (MPC). Toy: the planner's model is the true dynamics, so there is no model error here.`,
          `CEM 讓一個質點繞過障礙物到達目標。每個計畫是 25 個力向量（2.5 秒）；每輪 ${N} 個樣本、${K} 個菁英。**下一步**依序走過取樣 → 菁英 → 重新擬合；**行動**執行最佳計畫的第一個動作並重新規劃（MPC）。這是玩具示範：規劃器的模型就是真實動力學，所以這裡沒有模型誤差。`,
        ]}
      >
        <CemPlanner />
      </Figure>
      <P
        t={[
          "What to notice: in the first round the faint paths spray in every direction and only a few slip past the obstacle. After the refit the ellipse on the right shrinks and moves, and the next round's samples bunch around a path that goes round. The table under the demo compares CEM's best cost with random shooting given the same number of samples.",
          "觀察重點：第一輪的淡色路徑四散，只有少數擦過障礙物。重新擬合後，右邊的橢圓縮小並移動，下一輪的樣本就集中在繞過障礙物的路徑附近。示範下方的表格比較 CEM 的最佳成本，以及給相同樣本數時隨機射擊的結果。",
        ]}
      />
      <P
        t={[
          "**Model-predictive control** (MPC) wraps the planner in a loop: plan $H$ steps ahead, carry out only the first action, observe where you really are, and plan again, starting from the previous plan shifted by one step. Replanning at every step corrects small model errors and surprises before they add up.",
          "**模型預測控制**（MPC）把規劃器包在一個迴圈裡：往前規劃 $H$ 步，只執行第一個動作，觀察實際到了哪裡，再從上一次的計畫平移一步開始重新規劃。每一步都重新規劃，能在小的模型誤差和意外累積之前就修正它們。",
        ]}
      />
      <Callout kind="warn" title={["A planner exploits its model's mistakes", "規劃器會鑽模型錯誤的漏洞"]}>
        <P
          t={[
            "An optimiser searches for the plan the model scores best, and a plan that looks too good is often one where the model is wrong. Predictions also drift further from the truth the further ahead they run (see Dynamics and rollouts). The usual answers: keep the horizon short and replan (MPC); model uncertainty and avoid where it is high, as PILCO did with a Gaussian process; or plan with an **ensemble** of models and score a plan on sampled members, as PETS did, so that a plan only one model likes does not win.",
            "優化器會去找模型評分最好的計畫，而一個好得不像話的計畫，往往正是模型出錯的地方。而且預測往前推得越遠，就離事實越遠（見「動力學與推演」）。常見的對策：縮短視野並不斷重新規劃（MPC）；替不確定性建模，避開不確定的地方，就像 PILCO 用高斯過程那樣；或像 PETS 那樣用一組**集成**模型規劃，以抽樣的成員為計畫評分，這樣只有一個模型喜歡的計畫就不會勝出。",
          ]}
        />
        <p>
          <SiteLink to={["concept", "foundations", "rollouts"]} label={["Dynamics and rollouts", "動力學與推演"]} />
        </p>
      </Callout>
      <P
        t={[
          "The same loop runs in learned latent spaces: PlaNet (2019) planned with CEM in the latent space of a model learned from pixels, and PETS (2018) used CEM with a probabilistic ensemble.",
          "同樣的迴圈也能在學出的潛在空間中運作：PlaNet（2019）在從像素學到的模型的潛在空間裡用 CEM 規劃，PETS（2018）則把 CEM 與機率集成模型結合。",
        ]}
      />
      <Sources
        items={[
          { label: "Rubinstein (1999), The cross-entropy method for combinatorial and continuous optimization", url: "https://doi.org/10.1023/A:1010091220143" },
          { label: "de Boer, Kroese, Mannor & Rubinstein (2005), A tutorial on the cross-entropy method", url: "https://doi.org/10.1007/s10479-005-5724-z" },
          { label: "Chua, Calandra, McAllister & Levine (2018), PETS: deep RL in a handful of trials (arXiv 1805.12114)", url: "https://arxiv.org/abs/1805.12114" },
          { label: "Hafner et al. (2019), PlaNet: Learning latent dynamics for planning from pixels (arXiv 1811.04551)", url: "https://arxiv.org/abs/1811.04551" },
          { label: "Deisenroth & Rasmussen (2011), PILCO, ICML (PDF)", url: "https://mlg.eng.cam.ac.uk/pub/pdf/DeiRas11.pdf" },
        ]}
      />
      <HistoryLinks ids={["pilco", "dreamer"]} />
    </Section>
  );
}

function Imagination({ n }: { n: number }) {
  return (
    <Section page={PAGE} id="imagination" n={n} title={title("imagination")}>
      <P
        t={[
          "Planning by search happens at decision time and is thrown away afterwards. The other way to use a model is to **learn** from it: let the agent practise on experience the model makes up, and keep what it learns in a value function or a policy. Real experience is expensive; imagined experience costs only computation.",
          "以搜尋來規劃，是在做決定的當下進行，用完就丟。使用模型的另一種方式是從它**學習**：讓智能體在模型編出來的經驗上練習，把學到的東西保存在價值函數或策略裡。真實經驗很昂貴；想像的經驗只花計算。",
        ]}
      />
      <P
        t={[
          "**Dyna** (Sutton, 1990) puts both in one loop. Q-learning keeps a table $Q(s, a)$, an estimate of the discounted reward still to come after taking action $a$ in state $s$, and after each step $(s, a, r, s')$ nudges it toward a target:",
          "**Dyna**（Sutton，1990）把兩者放進同一個迴圈。Q 學習維護一張表 $Q(s, a)$，估計在狀態 $s$ 採取動作 $a$ 之後還會得到的折扣獎勵；每走一步 $(s, a, r, s')$，就把它往目標推一點：",
        ]}
      />
      <Pictured
        tex="Q(s,a) \leftarrow Q(s,a) + \alpha\big[\,r + \gamma \max_{a'} Q(s',a') - Q(s,a)\big]."
        caption={[
          "One update, with made-up numbers. Action $a$ takes the agent from $s$ to $s'$ and pays $r$. The best value in $s'$, discounted by $\\gamma$ and added to $r$, is the target; $Q(s,a)$ moves a fraction $\\alpha$ of the gap toward it. Dyna-Q applies the same step to transitions replayed from its model.",
          "一次更新，數字是虛構的。動作 $a$ 把智能體從 $s$ 帶到 $s'$，得到 $r$。$s'$ 中最好的價值乘上 $\\gamma$ 再加上 $r$ 就是目標；$Q(s,a)$ 朝它移動差距的 $\\alpha$ 比例。Dyna-Q 對從模型重播的轉移套用同樣的一步。",
        ]}
      >
        <QUpdatePicture />
      </Pictured>
      <P
        t={[
          "Here $\\alpha$ is the step size and $\\gamma < 1$ the discount. Dyna-Q also stores each transition in a **model**, here just a table: \"from $s$, action $a$ led to $s'$ with reward $r$\". After every real step it replays $n$ remembered transitions from the model and applies the very same update to each. With $n = 0$ it is plain Q-learning.",
          "其中 $\\alpha$ 是步長，$\\gamma < 1$ 是折扣。Dyna-Q 還把每一次轉移存進一個**模型**，這裡就是一張表：「從 $s$ 採取 $a$，到了 $s'$，獎勵 $r$」。每走一步真實步驟，它就從模型重播 $n$ 個記住的轉移，對每一個套用完全相同的更新。$n = 0$ 時就是一般的 Q 學習。",
        ]}
      />
      <Figure
        caption={[
          "Dyna-Q against Q-learning on the maze of Sutton & Barto's Example 8.1 (reward 1 at G, $\\alpha = 0.1$, $\\gamma = 0.95$, $\\varepsilon = 0.1$), mean of 10 fixed seeds, computed in your browser when the page opened. Faint curves: the other values of $n$. Toy: the maze is deterministic, so a table model that remembers the last outcome is exact.",
          "在 Sutton 與 Barto 例 8.1 的迷宮上比較 Dyna-Q 與 Q 學習（到達 G 得獎勵 1，$\\alpha = 0.1$、$\\gamma = 0.95$、$\\varepsilon = 0.1$），取 10 個固定種子的平均，在頁面開啟時於你的瀏覽器中計算。淡色曲線：其他的 $n$。玩具示範：迷宮是確定性的，所以記住上一次結果的表格模型是精確的。",
        ]}
      >
        <DynaCurves />
      </Figure>
      <P
        t={[
          "What to notice: the curves are flat and identical at first. Until the goal is found every reward is zero, so imagining changes nothing and the first episode is the same random walk for every $n$. After that, Dyna-Q's curve turns steeply upward: each real step is replayed many times, and the value of the goal spreads back along the remembered path in one episode instead of one cell per episode. The mazes show it: a few steps into the second episode, Q-learning knows one cell next to the goal; Dyna-Q already knows a path. Going from $n = 0$ to $n = 5$ helps much more than going from 20 to 50.",
          "觀察重點：一開始各條曲線平坦而且重疊。找到目標之前每個獎勵都是零，想像什麼也改變不了，所以對每個 $n$，第一回合都是同一段隨機漫步。之後，Dyna-Q 的曲線急劇上升：每一個真實步驟都被重播許多次，目標的價值在一個回合內就沿著記住的路徑往回傳，而不是每回合只傳一格。迷宮圖顯示了這一點：第二回合才走幾步，Q 學習只知道目標旁的一格；Dyna-Q 已經知道一整條路。從 $n = 0$ 到 $n = 5$ 的幫助，比從 20 到 50 大得多。",
        ]}
      />
      <P
        t={[
          "The same idea scales up when the table becomes a neural network that predicts what happens next.",
          "當表格換成能預測下一步的神經網路，同樣的想法就能放大。",
        ]}
      />
      <Table
        head={[
          ["System", "系統"],
          ["Model", "模型"],
          ["What is imagined", "想像什麼"],
          ["How behaviour is learned", "行為如何學出"],
        ]}
        rows={[
          [
            ["Dyna-Q (Sutton 1990)", "Dyna-Q（Sutton 1990）"],
            ["a table of seen transitions", "已見轉移的表格"],
            ["single remembered steps", "單一個記住的步驟"],
            ["Q-learning on real and imagined steps alike", "對真實與想像的步驟同樣做 Q 學習"],
          ],
          [
            ["World Models (Ha & Schmidhuber 2018)", "World Models（Ha 與 Schmidhuber 2018）"],
            ["V: a VAE compresses frames to $z$; M: a recurrent network predicts the next $z$", "V：VAE 把畫面壓成 $z$；M：遞迴網路預測下一個 $z$"],
            ["whole episodes in latent space (the \"dream\")", "潛在空間中的整個回合（「夢」）"],
            ["a small linear controller C, tuned by an evolution strategy (CMA-ES)", "一個小小的線性控制器 C，以演化策略（CMA-ES）調整"],
          ],
          [
            ["Dreamer (Hafner et al. 2020)", "Dreamer（Hafner 等 2020）"],
            ["a recurrent state-space model learned from pixels", "從像素學到的遞迴狀態空間模型"],
            ["short latent trajectories from every remembered state", "從每個記住的狀態出發的短潛在軌跡"],
            ["actor–critic; value gradients flow back through the learned dynamics", "演員—評論家；價值的梯度沿學到的動力學反向傳回"],
          ],
          [
            ["DreamerV3 (Hafner et al. 2023, *Nature* 2025)", "DreamerV3（Hafner 等 2023，《自然》2025）"],
            ["the same kind of model, made robust", "同一類模型，變得更穩健"],
            ["as Dreamer", "同 Dreamer"],
            ["one fixed set of hyperparameters across more than 150 tasks", "一組固定超參數用於超過 150 個任務"],
          ],
        ]}
      />
      <P
        t={[
          "**World Models** trained its VizDoom controller entirely inside M's dream and then ran it in the real game. The dream had to be made *harder* than reality, by raising the sampling temperature of M, or the controller learned to exploit the model's flaws: the planner's problem from the previous section, now inside learning. **Dreamer** learns an actor and a critic on imagined latent rollouts and backpropagates the critic's values through the model. **DreamerV3** made that recipe work across domains without retuning, and was the first algorithm to collect diamonds in Minecraft from scratch, with no human data.",
          "**World Models** 完全在 M 的夢裡訓練它的 VizDoom 控制器，再拿到真實遊戲中執行。夢必須比現實*更難*（調高 M 的取樣溫度），否則控制器會學會鑽模型的漏洞：這正是上一節規劃器的問題，只是現在發生在學習之中。**Dreamer** 在想像的潛在推演上學習演員與評論家，並把評論家的價值透過模型反向傳播。**DreamerV3** 讓這套做法不用重新調參就能跨領域運作，並成為第一個從零開始、不用人類資料就在 Minecraft 裡收集到鑽石的演算法。",
        ]}
      />
      <div className="space-y-1">
        <Evidence level="established" />
      <P
        t={[
          "Learning from imagined experience reduces the real experience needed, on toy tasks (Dyna) and on benchmarks (Dreamer, DreamerV3); it is only as good as the model, and a policy trained in a flawed model learns the flaws.",
          "從想像的經驗中學習，能減少所需的真實經驗，在玩具任務（Dyna）與基準測試（Dreamer、DreamerV3）上皆然；但它只會和模型一樣好，在有缺陷的模型中訓練出的策略，也會學到那些缺陷。",
        ]}
      />
      </div>
      <Sources
        items={[
          { label: "Sutton (1990), Integrated architectures for learning, planning, and reacting based on approximating dynamic programming, ICML", url: "https://doi.org/10.1016/B978-1-55860-141-3.50030-4" },
          { label: "Sutton (1991), Dyna, an integrated architecture for learning, planning, and reacting", url: "https://doi.org/10.1145/122344.122377" },
          { label: "Sutton & Barto (2018), Reinforcement Learning: An Introduction, ch. 8 (free online)", url: "http://incompleteideas.net/book/the-book-2nd.html" },
          { label: "Ha & Schmidhuber (2018), World Models (arXiv 1803.10122)", url: "https://arxiv.org/abs/1803.10122" },
          { label: "Hafner et al. (2020), Dream to Control: learning behaviors by latent imagination (arXiv 1912.01603)", url: "https://arxiv.org/abs/1912.01603" },
          { label: "Hafner et al. (2023), Mastering diverse domains through world models (arXiv 2301.04104)", url: "https://arxiv.org/abs/2301.04104" },
          { label: "Hafner et al. (2025), Mastering diverse control tasks through world models, Nature", url: "https://doi.org/10.1038/s41586-025-08744-2" },
        ]}
      />
      <HistoryLinks ids={["dyna", "world-models", "dreamer", "dreamerv3"]} />
    </Section>
  );
}

function Muzero({ n }: { n: number }) {
  return (
    <Section page={PAGE} id="muzero" n={n} title={title("muzero")}>
      <P
        t={[
          "So far the model predicted the next state of the world. But a planner never looks at the state itself: it only needs to know which moves lead to reward. A model that gets rewards and values right can be useless as a picture of the world and still be perfect for planning. Such models are called **value-equivalent**.",
          "到目前為止，模型預測的是世界的下一個狀態。但規劃器從不看狀態本身：它只需要知道哪些動作會帶來獎勵。一個把獎勵和價值預測對的模型，作為世界的圖像可能毫無用處，卻仍然完全適合拿來規劃。這樣的模型稱為**價值等價**的模型。",
        ]}
      />
      <P
        t={[
          "First the search. **Monte Carlo tree search** grows a tree of positions one iteration at a time. *Selection* walks down from the root, choosing at each node the move with the highest UCT score (Kocsis & Szepesvári, 2006); *expansion* adds one new move as a leaf; *simulation* plays random moves to the end of the game; *backup* adds the result to every node on the path. With $N(s)$ visits to a node, $N(s,a)$ visits to its move $a$ and $W(s,a)$ their total result:",
          "先看搜尋。**蒙地卡羅樹搜尋**一次一輪地長出一棵局面樹。*選擇*從根往下走，在每個節點選 UCT 分數最高的走法（Kocsis 與 Szepesvári，2006）；*擴展*把一個新走法加成葉節點；*模擬*隨機下到終局；*回傳*把結果加到路徑上的每個節點。設節點被造訪 $N(s)$ 次，其走法 $a$ 被造訪 $N(s,a)$ 次，總結果為 $W(s,a)$：",
        ]}
      />
      <Pictured
        tex="a^\ast = \arg\max_a \left[\frac{W(s,a)}{N(s,a)} + c\sqrt{\frac{\ln N(s)}{N(s,a)}}\right]."
        caption={[
          "Four moves from one node, with made-up counts. Gray is the mean result $W/N$; amber is the exploration bonus, which shrinks as a move's visits $N(s,a)$ grow. Selection takes the tallest total: here not the move with the best mean, but a less-tried one that is still promising.",
          "從一個節點出發的四個走法，次數是虛構的。灰色是平均結果 $W/N$；琥珀色是探索加成，隨著走法的造訪次數 $N(s,a)$ 增加而縮小。選擇取總和最高者：這裡不是平均結果最好的走法，而是一個試得較少、仍有希望的走法。",
        ]}
      >
        <UctPicture />
      </Pictured>
      <P
        t={[
          "The first term exploits moves that have done well; the second, with $c = \\sqrt2$ here, keeps trying moves that have been tried little. After the search, the move with the most visits is played.",
          "第一項利用表現好的走法；第二項（這裡 $c = \\sqrt2$）則持續嘗試試得少的走法。搜尋結束後，下造訪次數最多的那一步。",
        ]}
      />
      <Figure
        caption={[
          "UCT on a tic-tac-toe position with X to move: X wins at once on square 6, while O threatens square 5. Each small board is a root move with its visits N and mean result Q for X; circles are O's replies with their visits. Toy: this search uses the real rules and random playouts; MuZero replaces both with learned functions.",
          "在一個輪到 X 的井字遊戲局面上執行 UCT：X 在第 6 格可立即獲勝，O 則威脅第 5 格。每個小棋盤是根的一個走法，標出造訪次數 N 與對 X 的平均結果 Q；圓圈是 O 的應對及其造訪次數。玩具示範：這個搜尋用的是真實規則與隨機下完；MuZero 把兩者都換成學到的函數。",
        ]}
      >
        <MctsTree />
      </Figure>
      <P
        t={[
          "What to notice: early on the visits spread over all five moves. Square 6 soon has a Q near 1 (every playout through it is an immediate win) and the UCT score keeps sending visits there; after a few hundred iterations it has most of them. Blocking on square 5 is the second choice, which is right: it is the only other move that does not lose at once.",
          "觀察重點：一開始造訪分散在全部五個走法上。第 6 格很快就有接近 1 的 Q（經過它的每次下完都是立即獲勝），UCT 分數於是不斷把造訪送到那裡；幾百輪之後，大部分造訪都在它身上。在第 5 格擋住是第二選擇，這是對的：那是唯一另一個不會馬上輸的走法。",
        ]}
      />
      <P
        t={[
          "**MuZero** (Schrittwieser et al., 2020) runs this kind of search without knowing the rules. It learns three functions:",
          "**MuZero**（Schrittwieser 等，2020）在不知道規則的情況下執行這種搜尋。它學習三個函數：",
        ]}
      />
      <List
        items={[
          ["$h$, **representation**: past observations $\\to$ a hidden state $s^0$.", "$h$，**表徵**：過去的觀測 $\\to$ 隱藏狀態 $s^0$。"],
          ["$g$, **dynamics**: $(s^{k-1}, a^k) \\to$ a reward $r^k$ and the next hidden state $s^k$.", "$g$，**動力學**：$(s^{k-1}, a^k) \\to$ 獎勵 $r^k$ 與下一個隱藏狀態 $s^k$。"],
          ["$f$, **prediction**: $s^k \\to$ a policy $p^k$ (a prior over moves) and a value $v^k$.", "$f$，**預測**：$s^k \\to$ 策略 $p^k$（走法的先驗）與價值 $v^k$。"],
        ]}
      />
      <Figure
        caption={[
          "MuZero's model unrolled for two actions. The learned functions are amber. Only $r$, $p$ and $v$ are trained against real data; the hidden states $s^k$ are free to mean whatever helps.",
          "MuZero 的模型沿兩個動作展開。學到的函數為琥珀色。只有 $r$、$p$、$v$ 以真實資料訓練；隱藏狀態 $s^k$ 可以自由地代表任何有幫助的東西。",
        ]}
      >
        <MuzeroUnroll />
      </Figure>
      <P
        t={[
          "In search, $g$ takes the place of the rules and $f$'s value takes the place of the random playout; the policy $p$ is a prior in the selection score, so the search tries promising moves first. Training unrolls the model $K$ steps along real trajectories and matches its predictions to the observed rewards $u$, to the search's own visit distributions $\\pi$, and to the returns $z$:",
          "在搜尋中，$g$ 取代了規則，$f$ 的價值取代了隨機下完；策略 $p$ 是選擇分數中的先驗，讓搜尋先試有希望的走法。訓練時把模型沿著真實軌跡展開 $K$ 步，讓它的預測去配合觀測到的獎勵 $u$、搜尋自己的造訪分布 $\\pi$ 以及回報 $z$：",
        ]}
      />
      <Pictured
        tex="\ell = \sum_{k=0}^{K} \Big[\ell^r(u_{t+k}, r^k) + \ell^v(z_{t+k}, v^k) + \ell^p(\pi_{t+k}, p^k)\Big]."
        caption={[
          "The model unrolled $K = 2$ steps from the observation $o_t$. Each amber prediction ($r^k$, $v^k$, $p^k$) is pulled toward the real quantity below it ($u$, $z$, $\\pi$); the hidden states $s^k$ are never compared with anything.",
          "模型從觀測 $o_t$ 展開 $K = 2$ 步。每個琥珀色預測（$r^k$、$v^k$、$p^k$）都被拉向它下方的真實量（$u$、$z$、$\\pi$）；隱藏狀態 $s^k$ 從不與任何東西比對。",
        ]}
      >
        <MuzeroLossPicture />
      </Pictured>
      <P
        t={[
          "There is no term for reconstructing the observation. With this, MuZero matched AlphaZero at Go, chess and shogi, which had been given the rules, and set a new state of the art on the Atari benchmark.",
          "其中沒有任何重建觀測的項。靠這樣，MuZero 在圍棋、西洋棋與將棋上追平了被告知規則的 AlphaZero，並在 Atari 基準上創下新紀錄。",
        ]}
      />
      <Table
        head={[
          ["Gained", "得到的"],
          ["Lost", "失去的"],
        ]}
        rows={[
          [
            ["All model capacity goes to what changes decisions; no pixels to predict.", "模型的全部容量都用在會改變決定的事上；不必預測像素。"],
            ["The hidden state means nothing to a person: you cannot look at a prediction and see that it is wrong.", "隱藏狀態對人沒有意義：你無法看著一個預測，看出它錯了。"],
          ],
          [
            ["Works where the rules are unknown or messy (Atari).", "在規則未知或雜亂的地方也能運作（Atari）。"],
            ["The model is tied to one reward: a new goal needs a new model, where a model of the world could be reused.", "模型綁定在一個獎勵上：換一個目標就要換一個模型，而世界模型本可以重複使用。"],
          ],
          [
            ["The learning signal is exactly the one planning uses.", "學習訊號正是規劃所用的那個。"],
            ["The model learns only from rewards, values and search policies, a thin signal; later work such as EfficientZero (2021) added a self-supervised consistency loss to learn from less data.", "模型只從獎勵、價值與搜尋策略中學習，訊號很稀薄；後來的研究如 EfficientZero（2021）加入自監督的一致性損失，以便用更少的資料學習。"],
          ],
        ]}
      />
      <P
        t={[
          "Grimm et al. (2020) made the idea precise: two models are value-equivalent if they give the same Bellman updates for a chosen set of policies and functions, and they argued that a model need only be right in that sense to be useful for planning.",
          "Grimm 等（2020）把這個想法說得更精確：若兩個模型對選定的一組策略與函數給出相同的貝爾曼更新，它們就是價值等價的；他們主張模型只要在這個意義下正確，就足以用來規劃。",
        ]}
      />
      <Sources
        items={[
          { label: "Kocsis & Szepesvári (2006), Bandit based Monte-Carlo planning, ECML", url: "https://doi.org/10.1007/11871842_29" },
          { label: "Browne et al. (2012), A survey of Monte Carlo tree search methods", url: "https://doi.org/10.1109/TCIAIG.2012.2186810" },
          { label: "Schrittwieser et al. (2019), Mastering Atari, Go, chess and shogi by planning with a learned model (arXiv 1911.08265)", url: "https://arxiv.org/abs/1911.08265" },
          { label: "Schrittwieser et al. (2020), the same, Nature 588", url: "https://doi.org/10.1038/s41586-020-03051-4" },
          { label: "Ye et al. (2021), EfficientZero: Mastering Atari games with limited data (arXiv 2111.00210)", url: "https://arxiv.org/abs/2111.00210" },
          { label: "Grimm, Barreto, Singh & Silver (2020), The value equivalence principle for model-based RL (arXiv 2011.03506)", url: "https://arxiv.org/abs/2011.03506" },
        ]}
      />
      <HistoryLinks ids={["muzero"]} />
    </Section>
  );
}

export default function Planning({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <Cem n={1} />
      <Imagination n={2} />
      <Muzero n={3} />
    </Page>
  );
}
