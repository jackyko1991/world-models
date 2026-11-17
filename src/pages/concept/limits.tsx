/**
 * Concepts ▸ Scope and open questions (#/concept/limits[/<section>]): do video models learn physics, how a world model
 * is judged, the sim-to-real gap, and a table of claims graded by evidence (Clifford's scope page). Dated
 * "as of November 2026"; every number below is quoted from the cited paper or official post.
 */
import { CONCEPT_OUTLINES } from "../../curriculum.ts";
import LimitsTrajectory from "../../demos/LimitsTrajectory.tsx";
import LimitsRollout from "../../demos/pictures/LimitsRollout.tsx";
import { Callout, Evidence, Figure, HistoryLinks, List, P, Page, Pictured, Section, SiteLink, Sources, Table, type L } from "../kit.tsx";

const OUTLINE = CONCEPT_OUTLINES.find((o) => o.id === "limits")!;
const PAGE = "limits";
const [PHYSICS, EVIDENCE] = OUTLINE.sections;

const arxiv = (id: string, label: string) => ({ label: `${label} (arXiv ${id})`, url: `https://arxiv.org/abs/${id}` });

const BENCHMARKS: (readonly [L, L, L])[] = [
  [
    ["**Physics-IQ** (Motamed et al., 2025)", "**Physics-IQ**（Motamed 等人，2025）"],
    [
      "396 real 8-second videos of 66 scenarios (solid mechanics, fluids, optics, thermodynamics, magnetism), each filmed from three viewpoints, twice. The model sees the start and must continue the next 5 seconds; its motion is compared with the real take.",
      "396 段真實的 8 秒影片，涵蓋 66 種情境（固體力學、流體、光學、熱力學、磁學），每種情境從三個視角各拍兩次。模型看到開頭，要接著生成之後 5 秒；再把它的運動與真實拍攝比較。",
    ],
    [
      "Scores are scaled so two real takes of the same scene score 100%; the best model scored 29.5% (arXiv v3). Physical understanding was \"unrelated to visual realism\".",
      "分數經過縮放，使同一場景的兩次真實拍攝得 100%；最好的模型得 29.5%（arXiv 第 3 版）。物理理解「與視覺真實感無關」。",
    ],
  ],
  [
    ["**VideoPhy** (Bansal et al., 2024)", "**VideoPhy**（Bansal 等人，2024）"],
    [
      "Text prompts about everyday interactions between materials (solid–solid, solid–fluid, fluid–fluid); people judge whether each generated video follows the prompt and physical commonsense.",
      "描述日常材料互動（固體–固體、固體–流體、流體–流體）的文字提示；由人判斷每段生成影片是否符合提示與物理常識。",
    ],
    [
      "The best model, CogVideoX-5B, produced videos that followed both the caption and physical laws for 39.6% of the instances.",
      "表現最好的模型 CogVideoX-5B，只有 39.6% 的案例所生成的影片同時符合描述與物理定律。",
    ],
  ],
  [
    ["**PhyGenBench** (Meng et al., 2024)", "**PhyGenBench**（Meng 等人，2024）"],
    [
      "160 prompts covering 27 physical laws in four domains, scored automatically by vision-language and language models (PhyGenEval), checked against human judgement.",
      "160 個提示，涵蓋四大領域的 27 條物理定律，由視覺語言模型與語言模型自動評分（PhyGenEval），並與人工判斷對照。",
    ],
    [
      "Current models struggle; neither scaling the model up nor prompt engineering was enough to close the gap.",
      "現有模型表現吃力；不論放大模型或調整提示，都不足以補上落差。",
    ],
  ],
  [
    ["**WorldModelBench** (Li et al., 2025)", "**WorldModelBench**（Li 等人，2025）"],
    [
      "Video generators judged as world models in application domains such as robotics and driving: instruction following plus physics adherence, with 67K human labels over 14 models.",
      "把影片生成器當作世界模型，在機器人、自駕等應用領域評估：是否遵循指令、是否遵守物理，共有 14 個模型、6.7 萬筆人工標註。",
    ],
    [
      "Catches subtle violations earlier benchmarks missed, such as an object changing size in a way that breaks conservation of mass.",
      "能抓到先前基準忽略的細微違規，例如物體大小不規則地改變、違反質量守恆。",
    ],
  ],
  [
    ["**Kang et al.** (2024; ICML 2025)", "**Kang 等人**（2024；ICML 2025）"],
    [
      "A 2-D simulator of moving and colliding objects governed by classical mechanics, so there is unlimited data and an exact answer; diffusion video models are trained on it from scratch.",
      "一個由古典力學支配、物體移動與碰撞的二維模擬器，因此資料無限、答案精確；在上面從頭訓練擴散影片模型。",
    ],
    [
      "Near-perfect in distribution, failure out of distribution: the models copy the closest training case (\"case-based\" generalisation), matching on colour before size, velocity and shape.",
      "在分布內幾乎完美，在分布外失敗：模型模仿最接近的訓練案例（「以案例為本」的泛化），比對時顏色優先於大小、速度與形狀。",
    ],
  ],
];

type Level = "established" | "demonstrated" | "speculative";
const CLAIMS: { level: Level; claim: L; source: L }[] = [
  {
    level: "established",
    claim: [
      "A learned model can be planned with to reach superhuman play: MuZero matched AlphaZero in Go, chess and shogi and set a new state of the art on Atari, without being given the rules.",
      "可以用學出的模型做規劃而達到超越人類的棋藝：MuZero 在圍棋、西洋棋與將棋追平 AlphaZero，並在 Atari 創下新紀錄，而且沒有被告知規則。",
    ],
    source: ["Schrittwieser et al., *Nature* 2020", "Schrittwieser 等人，*Nature* 2020"],
  },
  {
    level: "established",
    claim: [
      "Learning behaviour inside a learned world model works across many domains with one configuration: DreamerV3 outperformed specialised methods on over 150 tasks and collected diamonds in Minecraft from scratch.",
      "在學出的世界模型裡學習行為，可以用同一組設定橫跨許多領域：DreamerV3 在 150 多項任務上勝過專門方法，並從零開始在 Minecraft 中挖到鑽石。",
    ],
    source: ["Hafner et al., *Nature* 2025", "Hafner 等人，*Nature* 2025"],
  },
  {
    level: "established",
    claim: [
      "Visual realism is not physical correctness: four independent benchmarks (Physics-IQ, VideoPhy, PhyGenBench, WorldModelBench) find that the video generators they tested often break physical rules while looking real.",
      "視覺真實不等於物理正確：四個獨立的基準（Physics-IQ、VideoPhy、PhyGenBench、WorldModelBench）都發現，受測的影片生成器常常看起來很真實，卻違反物理規則。",
    ],
    source: ["Motamed et al. 2025; Bansal et al. 2024; Meng et al. 2024; Li et al. 2025", "Motamed 等人 2025；Bansal 等人 2024；Meng 等人 2024；Li 等人 2025"],
  },
  {
    level: "demonstrated",
    claim: [
      "Video models trained on simulated mechanics generalise by copying similar training cases rather than learning the law, and scaling alone did not fix out-of-distribution failure (in that controlled 2-D setting).",
      "以模擬力學訓練的影片模型，是靠模仿相似的訓練案例來泛化，而不是學會定律；單靠放大規模並未修好分布外的失敗（在那個受控的二維設定中）。",
    ],
    source: ["Kang et al. 2024", "Kang 等人 2024"],
  },
  {
    level: "demonstrated",
    claim: [
      "A low one-step prediction error does not guarantee good control: one-step likelihood was not always correlated with task performance (\"objective mismatch\").",
      "單步預測誤差低，不保證控制得好：單步似然與任務表現並不總是相關（「目標不一致」）。",
    ],
    source: ["Lambert et al. 2020", "Lambert 等人 2020"],
  },
  {
    level: "demonstrated",
    claim: [
      "A neural network can stand in for a game engine in real time: GameNGen simulates DOOM at 20 frames per second on one TPU, though it sees only a little over 3 seconds of history.",
      "神經網路可以即時取代遊戲引擎：GameNGen 在單一 TPU 上以每秒 20 格模擬 DOOM，但它只看得到 3 秒多一點的歷史。",
    ],
    source: ["Valevski et al. 2024 (ICLR 2025)", "Valevski 等人 2024（ICLR 2025）"],
  },
  {
    level: "demonstrated",
    claim: [
      "Generated interactive worlds stay consistent for minutes, not hours: Genie 3 keeps environments largely consistent for several minutes with visual memory reaching back about a minute (August 2025 announcement, not a peer-reviewed paper).",
      "生成的互動世界能一致地維持幾分鐘，而不是幾小時：Genie 3 能讓環境在數分鐘內大致保持一致，視覺記憶約可回溯一分鐘（2025 年 8 月的發表文章，並非同儕審查論文）。",
    ],
    source: ["Google DeepMind blog, Aug 2025", "Google DeepMind 部落格，2025 年 8 月"],
  },
  {
    level: "demonstrated",
    claim: [
      "Policies trained purely inside a learned video simulator (UniSim) were deployed on real robots zero-shot, and V-JEPA 2-AC planned pick-and-place on Franka arms in two labs without data from those robots.",
      "完全在學出的影片模擬器（UniSim）裡訓練的策略，可零樣本部署到真實機器人上；V-JEPA 2-AC 也在兩個實驗室的 Franka 手臂上規劃抓取與放置，而未使用這些機器人的資料。",
    ],
    source: ["Yang et al. 2023; Assran et al. 2025", "Yang 等人 2023；Assran 等人 2025"],
  },
  {
    level: "speculative",
    claim: [
      "Scaling video generation on internet data will by itself yield a general-purpose simulator of the physical world.",
      "只要在網路資料上放大影片生成，就會自然得到通用的物理世界模擬器。",
    ],
    source: [
      "A hope stated in several papers (e.g. VideoPhy's introduction); Kang et al. and PhyGenBench report evidence against scaling alone.",
      "多篇論文提到的期望（例如 VideoPhy 的引言）；Kang 等人與 PhyGenBench 則提出單靠放大規模不足的證據。",
    ],
  },
  {
    level: "speculative",
    claim: [
      "Robots trained mostly in generated worlds will replace hand-built physics simulators for robot learning.",
      "主要在生成世界中訓練的機器人，將取代手工打造的物理模擬器，成為機器人學習的主流。",
    ],
    source: ["Industry positioning, e.g. NVIDIA Cosmos (2025); no head-to-head study yet", "產業定位，例如 NVIDIA Cosmos（2025）；尚無正面比較研究"],
  },
  {
    level: "speculative",
    claim: [
      "Predicting in a learned representation space (JEPA) is the path to machines that reason and plan like animals and people.",
      "在學出的表示空間中預測（JEPA）是讓機器像動物與人一樣推理和規劃的道路。",
    ],
    source: ["LeCun 2022, a position paper", "LeCun 2022，一篇立場論文"],
  },
];

export default function LimitsConcept({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <Callout kind="note" title={["As of November 2026", "截至 2026 年 11 月"]}>
        <p>
          <Evidence level="established" />{" "}
          <Evidence level="demonstrated" />{" "}
          <Evidence level="speculative" />
        </p>
        <P
          t={[
            "**Established**: peer-reviewed and replicated, or found independently by several groups. **Demonstrated**: shown in a paper or an official demo, not yet settled. **Speculative**: a hope or a bet, argued but not shown. This field moves fast; the evaluations below are the ones published by November 2026 that this page could check against their sources.",
            "**已確立**：經同儕審查並被重現，或由多個團隊各自發現。**已展示**：在論文或官方展示中出現過，但尚無定論。**推測**：一種期望或賭注，有論述但未被證明。這個領域變化很快；以下評估是截至 2026 年 11 月已發表、且本頁能對照原始來源查證的研究。",
          ]}
        />
      </Callout>

      <Section page={PAGE} id={PHYSICS.id} n={1} title={PHYSICS.title}>
        <P
          t={[
            "A video model is trained to make the next frames *look* like real video. A world model is supposed to make them *happen* the way the world would. The two coincide on common scenes, where looking right and being right are the same thing; they come apart on rare ones, where a model that has only learned what videos usually look like has nothing to fall back on.",
            "影片模型的訓練目標是讓下一格*看起來*像真實影片；世界模型則應該讓事情*照著*世界本來的方式發生。在常見場景裡，兩者一致，看起來對就是真的對；在少見的場景裡，兩者分道揚鑣：只學到「影片通常長什麼樣子」的模型，沒有東西可以依靠。",
          ]}
        />
        <P
          t={[
            "So the test is not \"does it look real?\" but \"does it continue the way physics says it must?\" Write the model as $p_\\theta(o_{t+1:t+H} \\mid o_{1:t}, a_{1:t+H})$: given the frames $o_{1:t}$ seen so far (and actions $a$, if any), a distribution over the next $H$ frames. A physics benchmark fixes a start $o_{1:t}$ whose continuation is known, from a real recording or a simulator, and measures how far the model's continuation lands from it.",
            "所以要問的不是「看起來真不真？」，而是「它是否照物理規定的方式延續下去？」把模型寫成 $p_\\theta(o_{t+1:t+H} \\mid o_{1:t}, a_{1:t+H})$：給定目前看到的影格 $o_{1:t}$（以及動作 $a$，若有的話），對接下來 $H$ 格的分布。物理基準會固定一個開頭 $o_{1:t}$，它的後續是已知的（來自真實錄影或模擬器），再量測模型生成的後續離它多遠。",
          ]}
        />
        <Figure
          caption={[
            "**Illustration, drawn by hand, not output of any model.** Each panel overlays a clip's frames, earlier ones fainter; gray is what physics requires, amber a typical failure. Each frame on its own looks fine; only the sequence breaks the rule. The size change is the kind of violation WorldModelBench was built to catch.",
            "**示意圖，手繪，並非任何模型的輸出。** 每個面板把片段的各格疊在一起，越早越淡；灰色是物理要求的結果，琥珀色是典型的錯誤。每一格單獨看都沒問題；只有連起來看才違反規則。大小改變正是 WorldModelBench 設計來捕捉的違規類型。",
          ]}
        >
          <LimitsTrajectory />
        </Figure>
        <P t={["**What the published evaluations measure, and what they found.** Numbers are quoted from the papers.", "**已發表的評估衡量什麼、發現了什麼。** 數字引自各篇論文。"]} />
        <Table head={[["Benchmark", "基準"], ["What it tests", "測什麼"], ["Finding", "發現"]]} rows={BENCHMARKS} />
        <P
          t={[
            "They measure different things. Physics-IQ and Kang et al. compare against a known continuation, so they test *prediction*. VideoPhy, PhyGenBench and WorldModelBench start from a text prompt and ask whether the result breaks commonsense physics, so they test *plausibility*, judged by people or by a trained model that is itself fallible. None of them tests whether an agent can act well using the model; that is the next section.",
            "它們量的東西不一樣。Physics-IQ 與 Kang 等人拿模型的結果和已知的後續比較，所以測的是*預測*。VideoPhy、PhyGenBench 與 WorldModelBench 從文字提示開始，問結果是否違反物理常識，所以測的是*合理性*，由人或由一個本身也會出錯的訓練模型來判斷。它們都沒有測試智能體能否靠這個模型把事情做好；那是下一節的主題。",
          ]}
        />
        <P
          t={[
            "**Long-horizon consistency and memory.** A model that generates frame after frame feeds its own output back in, so small errors compound (the book's rollouts section shows why). The second problem is memory: what the model cannot see, it must remember. GameNGen, a diffusion model that simulates DOOM, conditions on a little over 3 seconds of history; its authors call the short context \"an important limitation\" and show that much of the game state survives longer only because it is painted on screen (health, ammo). Its image quality falls over 64 autoregressive steps, and while raters could not tell 3-second clips from the real game, the authors, who knew its weaknesses, often could after a few seconds of play.",
            "**長時間的一致性與記憶。** 一格接一格生成的模型會把自己的輸出再餵回去，小誤差因此累積（本書的推演一節說明了原因）。第二個問題是記憶：模型看不到的東西，就必須記住。GameNGen 是模擬 DOOM 的擴散模型，它只以 3 秒多一點的歷史為條件；作者稱這段短上下文是「重要的限制」，並指出許多遊戲狀態之所以能持續更久，只是因為它畫在螢幕上（生命值、彈藥）。它的影像品質在 64 步自迴歸生成中逐步下降；評分者分不出 3 秒片段與真實遊戲，但熟悉其弱點的作者往往玩幾秒就能分辨。",
          ]}
        />
        <p>
          <SiteLink to={["concept", "foundations", "rollouts"]} label={["Why errors compound in a rollout", "為什麼推演中的誤差會累積"]} />
        </p>
        <P
          t={[
            "Google DeepMind's Genie 3 (August 2025) reports worlds that stay \"largely consistent for several minutes\", with visual memory \"as far back as one minute ago\", and lists as a limitation that it supports \"a few minutes of continuous interaction, rather than extended hours.\" These figures come from the announcement, not a paper with an evaluation protocol.",
            "Google DeepMind 的 Genie 3（2025 年 8 月）表示，生成的世界能「在數分鐘內大致保持一致」，視覺記憶「最遠可回溯到一分鐘前」，並把「支援數分鐘的連續互動，而非數小時」列為限制。這些數字來自發表文章，而不是附有評估流程的論文。",
          ]}
        />
        <P
          t={[
            "**What to notice.** Every benchmark above found real failures in models that look convincing, and the controlled study points to why: matching training cases is not the same as having the law. At the same time, Physics-IQ found that some scenarios were already solved, so learning some physics from video alone is not ruled out.",
            "**值得注意的是：** 上面每個基準都在看起來很逼真的模型中找到真正的錯誤，而受控研究指出了原因：比對訓練案例，並不等於掌握了定律。同時，Physics-IQ 也發現有些情境已經能被解出，所以光靠影片學到部分物理，並沒有被排除。",
          ]}
        />
        <Sources
          items={[
            arxiv("2501.09038", "Motamed et al. (2025), Do generative video models understand physical principles? (Physics-IQ)"),
            arxiv("2406.03520", "Bansal et al. (2024), VideoPhy: Evaluating physical commonsense for video generation"),
            arxiv("2410.05363", "Meng et al. (2024), Towards world simulator: crafting physical commonsense-based benchmark for video generation (PhyGenBench)"),
            arxiv("2502.20694", "Li et al. (2025), WorldModelBench: judging video generation models as world models"),
            arxiv("2411.02385", "Kang et al. (2024), How far is video generation from world model: a physical law perspective"),
            arxiv("2408.14837", "Valevski et al. (2024), Diffusion models are real-time game engines (GameNGen)"),
            { label: "Google DeepMind (Aug 2025), Genie 3: a new frontier for world models", url: "https://deepmind.google/discover/blog/genie-3-a-new-frontier-for-world-models/" },
          ]}
        />
        <HistoryLinks ids={["sora", "game-engines", "genie-3", "cosmos"]} />
      </Section>

      <Section page={PAGE} id={EVIDENCE.id} n={2} title={EVIDENCE.title}>
        <P
          t={[
            "A world model is a tool, so judge it by what it is for. Three yardsticks are used, and they can disagree.",
            "世界模型是工具，所以要依它的用途來評判。常用的有三把尺，而且它們可能互相矛盾。",
          ]}
        />
        <List
          items={[
            [
              "**Rollout error against horizon.** Start the model and the real system from the same state $s_t$, feed both the same actions, and measure the gap after $H$ steps, averaged over $N$ starts.",
              "**推演誤差對時間跨度。** 讓模型與真實系統從同一個狀態 $s_t$ 出發、輸入相同的動作，量測 $H$ 步後的差距，並對 $N$ 個起點取平均。",
            ],
            [
              "**Calibration.** A stochastic model's stated probabilities should match how often things happen: of the futures it calls 90% likely, about 90% should occur. Malik et al. (2019) found that calibrating a model improved planning, sample efficiency and exploration.",
              "**校準。** 隨機模型給出的機率應該與事件實際發生的頻率相符：它說有 90% 可能的未來，大約 90% 應該真的發生。Malik 等人（2019）發現，校準模型能改善規劃、樣本效率與探索。",
            ],
            [
              "**Downstream success.** Plan or train a policy with the model, run it in the real environment, and measure the return. This is what the model is for, and it is the costliest to measure.",
              "**下游成功率。** 用模型規劃或訓練策略，在真實環境中執行，量測回報。這才是模型的目的，也是最昂貴的量測。",
            ],
          ]}
        />
        <Pictured
          tex={String.raw`e(H) = \frac{1}{N}\sum_{i=1}^{N} \bigl\lVert \hat s^{(i)}_{t+H} - s^{(i)}_{t+H} \bigr\rVert, \qquad \hat s_{k+1} = f_\theta(\hat s_k, a_k),\ \hat s_t = s_t`}
          caption={["Each amber rollout starts on its gray true state, $\\hat s_t = s_t$, and is stepped by $f_\\theta$ with no correction, so small one-step errors compound. Measure the gap at $t+H$, average over the $N$ starts, and you get $e(H)$: the inset shows it growing with the horizon. Made-up curves.", "每條琥珀色的推演都從灰色的真實狀態出發（$\\hat s_t = s_t$），由 $f_\\theta$ 一步步往前推、不經修正，所以單步的小誤差會累積。在 $t+H$ 量出差距、對 $N$ 個起點取平均，就得到 $e(H)$：小圖顯示它隨視野增長。曲線是示意用的。"]}
        >
          <LimitsRollout />
        </Pictured>
        <P
          t={[
            "Here $f_\\theta$ is the learned one-step model, $\\hat s$ its predicted states and $s$ the true ones. The first two yardsticks are cheap and the third is the one that matters, and they need not agree: Lambert et al. (2020) showed that a model's one-step likelihood was not always correlated with control performance, since a model can be accurate where it does not matter and wrong where it does.",
            "其中 $f_\\theta$ 是學出的單步模型，$\\hat s$ 是它預測的狀態，$s$ 是真實狀態。前兩把尺便宜，第三把才是重點，而它們未必一致：Lambert 等人（2020）指出，模型的單步似然與控制表現並不總是相關，因為模型可能在無關緊要之處很準，卻在要緊之處出錯。",
          ]}
        />
        <p>
          <SiteLink to={["skills", "checking", "tests"]} label={["Rollout error and calibration, in code", "推演誤差與校準的程式碼"]} />
        </p>
        <P
          t={[
            "**The sim-to-real gap.** A policy trained in a simulator, hand-built or learned, meets a world that differs from it, and errors the simulator never showed it are the ones it cannot handle. Three responses have been tried. *Randomise the simulator* so reality looks like one more variation: Tobin et al. (2017) trained an object detector on simulated images with random textures and used it to grasp real objects. *Skip the simulator*: DayDreamer ran Dreamer directly on four real robots, and a quadruped learned to stand up and walk from scratch in about an hour. *Learn the simulator from real data*: UniSim trained policies purely inside a learned video model and deployed them zero-shot on real robots, and V-JEPA 2-AC planned pick-and-place on robot arms in two labs it had no data from.",
            "**模擬到真實的落差。** 在模擬器（手工打造或學出來的）裡訓練的策略，面對的是一個與模擬器不同的世界；模擬器從未展示過的錯誤，正是它應付不了的。目前試過三種回應。*把模擬器隨機化*，讓真實世界看起來只是另一種變化：Tobin 等人（2017）用隨機紋理的模擬影像訓練物體偵測器，並用它抓取真實物體。*跳過模擬器*：DayDreamer 直接在四台真實機器人上執行 Dreamer，一台四足機器人從零開始，約一小時就學會站起來走路。*從真實資料學出模擬器*：UniSim 完全在學出的影片模型中訓練策略，再零樣本部署到真實機器人；V-JEPA 2-AC 則在兩個沒有提供資料的實驗室裡，於機器手臂上規劃抓取與放置。",
          ]}
        />
        <P
          t={[
            "These are demonstrations on chosen tasks, which is why they are tagged *demonstrated* below. A learned simulator inherits the physics failures of the previous section, and no study has yet compared robots trained in generated worlds head to head with robots trained in a physics engine across many tasks.",
            "這些都是在挑選過的任務上做的展示，所以下表把它們標為*已展示*。學出的模擬器會繼承上一節所說的物理錯誤，而且目前還沒有研究在大量任務上，把在生成世界中訓練的機器人與在物理引擎中訓練的機器人正面比較。",
          ]}
        />
        <P t={["**Claims, graded.** As of November 2026.", "**主張與證據等級。** 截至 2026 年 11 月。"]} />
        <Table
          head={[["Evidence", "證據"], ["Claim", "主張"], ["Source", "來源"]]}
          rows={CLAIMS.map((c) => [<Evidence key="e" level={c.level} />, c.claim, c.source])}
        />
        <P
          t={[
            "**What to notice.** The established rows are about agents in games and control tasks, where the true environment is available to score against. The claims about video models learning physics, and about robots trained in generated worlds, are newer and rest on demos or on a few tasks; the largest claims are still bets.",
            "**值得注意的是：** 已確立的幾列都與遊戲和控制任務中的智能體有關，那裡有真實環境可以用來評分。關於影片模型學會物理、以及在生成世界中訓練機器人的主張，比較新，依據的是展示或少數任務；最大的那些主張仍然是賭注。",
          ]}
        />
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <SiteLink to={["concept", "planning", "muzero"]} label={["MuZero and planning", "MuZero 與規劃"]} />
          <SiteLink to={["concept", "generative", "video"]} label={["Video world models", "影片世界模型"]} />
          <SiteLink to={["reading", "papers", "limits"]} label={["Papers on evaluation and limits", "關於評估與限制的論文"]} />
        </p>
        <Sources
          items={[
            { label: "Schrittwieser et al. (2020), Mastering Atari, Go, chess and shogi by planning with a learned model, Nature", url: "https://doi.org/10.1038/s41586-020-03051-4" },
            { label: "Hafner et al. (2025), Mastering diverse control tasks through world models, Nature", url: "https://doi.org/10.1038/s41586-025-08744-2" },
            arxiv("2002.04523", "Lambert et al. (2020), Objective mismatch in model-based reinforcement learning"),
            arxiv("1906.08312", "Malik et al. (2019), Calibrated model-based deep reinforcement learning"),
            arxiv("1703.06907", "Tobin et al. (2017), Domain randomization for transferring deep neural networks from simulation to the real world"),
            arxiv("2206.14176", "Wu et al. (2022), DayDreamer: world models for physical robot learning"),
            arxiv("2310.06114", "Yang et al. (2023), Learning interactive real-world simulators (UniSim)"),
            arxiv("2506.09985", "Assran et al. (2025), V-JEPA 2: self-supervised video models enable understanding, prediction and planning"),
            arxiv("2501.03575", "NVIDIA (2025), Cosmos world foundation model platform for physical AI"),
            { label: "LeCun (2022), A path towards autonomous machine intelligence", url: "https://openreview.net/forum?id=BZ5a1r-kVsf" },
          ]}
        />
        <HistoryLinks ids={["muzero", "dreamerv3", "jepa", "lecun-path"]} />
      </Section>
    </Page>
  );
}
