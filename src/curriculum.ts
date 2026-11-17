/**
 * The book's outline: every Concepts and Coding Skills page, each section with a learning question, the visual it is
 * built around and what it will cover, in [English, Traditional Chinese]. Pages are shown as "planned" (pages/kit.tsx
 * `Draft`) until they are written. `history` lists the History cards (history.ts ids) a section links back to.
 */
import type { DraftOutline } from "./pages/kit.tsx";
import type { L } from "./strings.ts";

const CONCEPTS: L = ["Concepts", "概念"];
const SKILLS: L = ["Coding Skills", "程式技巧"];

export const CONCEPT_OUTLINES: DraftOutline[] = [
  {
    id: "foundations",
    overline: CONCEPTS,
    title: ["What is a world model?", "什麼是世界模型？"],
    intro: [
      "A world model predicts what happens next: given the state of the world and an action, it says what the next state (or observation) will be. This page builds the predict–act–plan loop from a gridworld up, and shows why predictions go wrong as they run further ahead.",
      "世界模型預測接下來會發生什麼：給定世界的狀態和一個動作，它說出下一個狀態（或觀測）。這一頁從一個格子世界出發，建立「預測—行動—規劃」的循環，並說明預測為什麼越往後越不準。",
    ],
    sections: [
      {
        id: "loop",
        title: ["Predict, act, plan", "預測、行動、規劃"],
        question: [
          "What does it mean for a machine to have a model of the world, and what is it for?",
          "說一台機器「有世界模型」是什麼意思？它有什麼用？",
        ],
        visual: [
          "A gridworld the reader moves through with the arrow keys; beside the true next frame, the model's predicted next frame, with the cells where they differ highlighted.",
          "讀者用方向鍵移動的格子世界；在真實的下一格畫面旁，並排顯示模型預測的下一格畫面，並標出兩者不同的格子。",
        ],
        plan: [
          ["Craik's 1943 idea of a \"small-scale model\" in the head, as background.", "作為背景：Craik 1943 年提出腦中的「小尺度模型」。"],
          ["The ML definition: a transition model $p(s' \\mid s, a)$, plus an observation model and a reward model.", "機器學習的定義：轉移模型 $p(s' \\mid s, a)$，加上觀測模型與獎勵模型。"],
          ["Observation → latent state → prediction: why most world models do not predict pixels directly.", "觀測 → 潛在狀態 → 預測：為什麼大多數世界模型不直接預測像素。"],
          ["What the model is used for: planning, learning in imagination, and simulation.", "模型拿來做什麼：規劃、在想像中學習，以及模擬。"],
        ],
        history: ["craik", "dyna"],
      },
      {
        id: "rollouts",
        title: ["Dynamics and rollouts", "動態與推演"],
        question: [
          "If a model is nearly right for one step, why can it be badly wrong after fifty?",
          "如果模型單步預測幾乎正確，為什麼五十步之後會錯得離譜？",
        ],
        visual: [
          "Cart-pole: the true simulator and a learned linear model (fixed weights) start from the same state; a horizon slider shows the two trajectories drifting apart, with the error plotted against the horizon.",
          "倒單擺小車：真實模擬器與學到的線性模型（固定權重）從同一狀態出發；拖動「預測步數」滑桿，看兩條軌跡逐漸分開，並畫出誤差對步數的曲線。",
        ],
        plan: [
          ["One-step prediction against multi-step rollouts.", "單步預測與多步推演的差別。"],
          ["Compounding error: the model is fed its own mistakes.", "誤差累積：模型被餵入自己的錯誤。"],
          ["Predict-then-correct, from the Kalman filter to latent state updates.", "先預測再修正：從卡爾曼濾波器到潛在狀態更新。"],
        ],
        history: ["kalman", "pilco"],
      },
      {
        id: "uncertainty",
        title: ["Stochasticity and uncertainty", "隨機性與不確定性"],
        question: [
          "How should a model say \"I don't know\", and why does a planner need it to?",
          "模型要怎麼說「我不知道」？規劃器為什麼需要它這麼說？",
        ],
        visual: [
          "A fan of rollouts from one state: a deterministic model draws one line, a stochastic model a spread, an ensemble several models whose disagreement grows where data was thin.",
          "從同一狀態展開的一束推演：確定性模型畫出一條線，隨機模型畫出一片分布，集成模型畫出好幾個模型，在資料稀少處分歧變大。",
        ],
        plan: [
          ["Two kinds of uncertainty: noise in the world (aleatoric) and gaps in the model (epistemic).", "兩種不確定性：世界本身的雜訊（偶然性）與模型的知識缺口（認知性）。"],
          ["Ensembles (PETS) and why disagreement marks the edge of the data.", "集成模型（PETS），以及為什麼分歧標出資料的邊界。"],
          ["The RSSM idea: a deterministic path plus a stochastic latent.", "RSSM 的想法：一條確定性路徑加上一個隨機潛在變數。"],
        ],
        history: ["pilco", "dreamer"],
      },
    ],
  },
  {
    id: "representation",
    overline: CONCEPTS,
    title: ["Latent spaces", "潛在空間"],
    intro: [
      "A world model rarely works on raw pixels. It compresses each observation into a short vector and predicts in that space. This page shows what such a space looks like, and the two ways to train one: reconstruct the input, or predict a representation.",
      "世界模型很少直接處理原始像素。它把每個觀測壓縮成一個短向量，並在那個空間裡做預測。這一頁展示這樣的空間長什麼樣子，以及訓練它的兩種方法：重建輸入，或預測表示。",
    ],
    sections: [
      {
        id: "compress",
        title: ["Why compress?", "為什麼要壓縮？"],
        question: [
          "What is lost and what is gained when a frame becomes a handful of numbers?",
          "一個畫面變成幾個數字時，失去了什麼、得到了什麼？",
        ],
        visual: [
          "A 2-D latent map of a small game's frames (precomputed); dragging a point across the map decodes it to a frame, so the reader sees which directions mean what.",
          "一個小遊戲畫面的二維潛在地圖（預先計算）；在地圖上拖動一個點，它就被解碼成畫面，讓讀者看到每個方向代表什麼。",
        ],
        plan: [
          ["Autoencoders and the VAE: reconstruction loss plus a KL term.", "自編碼器與 VAE：重建損失加上 KL 項。"],
          ["Ha & Schmidhuber's V–M–C split: vision, memory, controller.", "Ha 與 Schmidhuber 的 V–M–C 分工：視覺、記憶、控制器。"],
          ["Interpolating in latent space against interpolating pixels.", "在潛在空間內插與在像素上內插的差別。"],
        ],
        history: ["schmidhuber-1990", "world-models"],
      },
      {
        id: "jepa",
        title: ["Predict in representation space", "在表示空間中預測"],
        question: [
          "Why might predicting every pixel be the wrong goal, and what stops a representation from collapsing to a constant?",
          "為什麼預測每一個像素可能是錯的目標？又是什麼讓表示不會塌縮成常數？",
        ],
        visual: [
          "A toy embedding of points trained to predict each other: switching the anti-collapse term off makes the cloud shrink to one point; switching it on keeps it spread.",
          "一個玩具嵌入：點被訓練來互相預測。關掉防塌縮項，點雲縮成一點；打開它，點雲保持展開。",
        ],
        plan: [
          ["LeCun's 2022 argument: predict what matters, not every detail.", "LeCun 2022 年的主張：預測重要的部分，而非每個細節。"],
          ["JEPA, I-JEPA and V-JEPA against pixel reconstruction.", "JEPA、I-JEPA 與 V-JEPA 對比像素重建。"],
          ["Collapse and its cures: stop-gradient with an EMA target, variance and covariance terms.", "塌縮及其對策：配合 EMA 目標的停止梯度、變異數與共變異數項。"],
        ],
        history: ["lecun-path", "jepa"],
      },
    ],
  },
  {
    id: "planning",
    overline: CONCEPTS,
    title: ["Planning and imagination", "規劃與想像"],
    intro: [
      "Once you can predict, you can try actions in your head before taking them. This page covers three ways to use a model: search for a good action sequence, practise a policy on imagined experience, and plan with a model that predicts only what planning needs.",
      "一旦能預測，就能先在腦中試動作再實際去做。這一頁介紹使用模型的三種方式：搜尋好的動作序列、用想像的經驗練習策略，以及用只預測規劃所需資訊的模型來規劃。",
    ],
    sections: [
      {
        id: "cem",
        title: ["Planning with a model", "用模型規劃"],
        question: [
          "Given a model, how do you find a good sequence of actions without trying them for real?",
          "有了模型，怎樣不實際嘗試，就找出一串好的動作？",
        ],
        visual: [
          "The cross-entropy method on a point mass reaching a goal, one iteration at a time: sampled action sequences as faint paths, the elites in amber, and the refitted Gaussian for the next round.",
          "交叉熵法讓一個質點到達目標，一次一輪：取樣的動作序列畫成淡色路徑，菁英序列為琥珀色，再擬合出下一輪的高斯分布。",
        ],
        plan: [
          ["Random shooting, then CEM: sample, keep the best, refit.", "隨機射擊，然後是 CEM：取樣、留下最好的、重新擬合。"],
          ["Model-predictive control: replan at every step, act only on the first action.", "模型預測控制：每一步都重新規劃，只執行第一個動作。"],
          ["How model error and uncertainty enter the plan.", "模型誤差與不確定性如何進入規劃。"],
        ],
        history: ["pilco"],
      },
      {
        id: "imagination",
        title: ["Learning in imagination", "在想像中學習"],
        question: [
          "Can an agent learn faster by practising inside its own model of the world?",
          "智能體在自己的世界模型裡練習，能學得更快嗎？",
        ],
        visual: [
          "A Dyna-Q gridworld: a slider sets the number of imagined updates per real step, and learning curves compare it with plain Q-learning at equal real steps.",
          "Dyna-Q 格子世界：用滑桿設定每走一步真實步驟要做幾次想像更新，學習曲線在相同真實步數下與一般 Q 學習比較。",
        ],
        plan: [
          ["Dyna (1990): learn, plan and act in one loop.", "Dyna（1990）：在同一個循環裡學習、規劃與行動。"],
          ["World Models (2018): a policy trained inside a learned dream.", "World Models（2018）：在學到的夢境中訓練策略。"],
          ["Dreamer to DreamerV3: actor–critic on imagined latent rollouts, one set of settings across many domains.", "從 Dreamer 到 DreamerV3：在想像的潛在推演上訓練演員—評論家，一組設定通用於許多領域。"],
        ],
        history: ["dyna", "world-models", "dreamer", "dreamerv3"],
      },
      {
        id: "muzero",
        title: ["Value-equivalent models", "價值等價模型"],
        question: [
          "Does a model need to predict the world at all, or only what matters for choosing moves?",
          "模型真的需要預測世界本身嗎，還是只需預測選擇動作時重要的東西？",
        ],
        visual: [
          "A small search tree on a gridworld or tic-tac-toe that the reader expands step by step: selection, expansion, backup, with visit counts and values on each node.",
          "一棵在格子世界或井字遊戲上的小搜尋樹，讀者一步步展開：選擇、擴展、回傳，每個節點標出造訪次數與價值。",
        ],
        plan: [
          ["Monte Carlo tree search in brief.", "蒙地卡羅樹搜尋簡介。"],
          ["MuZero: no reconstruction; predict reward, value and policy.", "MuZero：不重建觀測；只預測獎勵、價值與策略。"],
          ["What is gained, and what is lost when the latent state means nothing to a person.", "得到了什麼，以及當潛在狀態對人沒有意義時，失去了什麼。"],
        ],
        history: ["muzero"],
      },
    ],
  },
  {
    id: "generative",
    overline: CONCEPTS,
    title: ["Generative worlds", "生成的世界"],
    intro: [
      "Since 2024, world models have also meant something larger: generators that produce a playable or walkable world from a prompt or an image. This page follows two lines, Google DeepMind's Genie models and Fei-Fei Li's World Labs, and the video models around them. It is the fastest-moving part of the book and is dated.",
      "自 2024 年起，「世界模型」也指更大的東西：從提示或一張圖片生成可遊玩、可漫遊的世界的生成器。這一頁追蹤兩條線：Google DeepMind 的 Genie 系列，以及李飛飛的 World Labs，還有它們周圍的影片模型。這是本書變化最快的部分，內容會標註日期。",
    ],
    sections: [
      {
        id: "video",
        title: ["Video models as world models", "作為世界模型的影片模型"],
        question: [
          "When a video model is conditioned on actions, does it become a world model?",
          "影片模型以動作為條件時，它就成了世界模型嗎？",
        ],
        visual: [
          "A tiny tokenized \"game\" (learned in the browser from seeded recorded play): frames become tokens, and the reader steps an action-conditioned generator forward one frame at a time.",
          "一個極小的、已切成詞元的「遊戲」（在瀏覽器中從固定種子的錄製遊玩學出）：畫面變成詞元，讀者一格一格推動以動作為條件的生成器。",
        ],
        plan: [
          ["From video generation (Sora) to action-conditioned generation.", "從影片生成（Sora）到以動作為條件的生成。"],
          ["Games run by a network: GameNGen and DIAMOND.", "由神經網路執行的遊戲：GameNGen 與 DIAMOND。"],
          ["World foundation models for robots and cars: NVIDIA Cosmos.", "給機器人與汽車用的世界基礎模型：NVIDIA Cosmos。"],
        ],
        history: ["sora", "game-engines", "cosmos"],
      },
      {
        id: "genie",
        title: ["Google DeepMind's Genie line", "Google DeepMind 的 Genie 系列"],
        question: [
          "How can a model learn which actions exist from video that has no action labels?",
          "模型怎麼從沒有動作標籤的影片中，學出有哪些動作？",
        ],
        visual: [
          "A latent-action toy: the reader clicks one of a few discrete latent actions and sees which frame transition each has come to mean.",
          "潛在動作玩具：讀者點選幾個離散潛在動作之一，看每個動作學成了代表哪一種畫面轉換。",
        ],
        plan: [
          ["Genie (Feb 2024): a video tokenizer, a latent action model and a dynamics model, learned from unlabelled 2-D platformer video.", "Genie（2024 年 2 月）：影片詞元器、潛在動作模型與動態模型，從無標籤的 2D 平台遊戲影片學出。"],
          ["Genie 2 (Dec 2024): 3-D worlds playable from a single image.", "Genie 2（2024 年 12 月）：從單一圖片生成可遊玩的 3D 世界。"],
          ["Genie 3 (Aug 2025): real-time interactive worlds, consistency for a few minutes, promptable world events.", "Genie 3（2025 年 8 月）：即時互動的世界、維持幾分鐘的一致性、可用提示觸發的世界事件。"],
          ["DreamerV3 as the reinforcement-learning side of the same lab.", "DreamerV3：同一實驗室在強化學習這一側的工作。"],
        ],
        history: ["genie", "genie-2", "genie-3", "dreamerv3"],
      },
      {
        id: "world-labs",
        title: ["Fei-Fei Li and World Labs: spatial intelligence", "李飛飛與 World Labs：空間智能"],
        question: [
          "What changes when the generated world is an explicit 3-D scene rather than a stream of frames?",
          "當生成的世界是明確的 3D 場景，而不是一串畫面時，有什麼不同？",
        ],
        visual: [
          "The same small world twice: as generated video frames and as an explicit splat scene. The reader moves the camera away and back, and sees which one keeps the scene where it was.",
          "同一個小世界呈現兩次：一次是生成的影片畫面，一次是明確的潑濺場景。讀者把相機移開再移回，看哪一個能讓場景保持原樣。",
        ],
        plan: [
          ["From ImageNet (2009) to \"spatial intelligence\".", "從 ImageNet（2009）到「空間智能」。"],
          ["World Labs (2024): 3-D world generation from an image.", "World Labs（2024）：從一張圖片生成 3D 世界。"],
          ["RTFM (Oct 2025): a real-time frame model.", "RTFM（2025 年 10 月）：即時畫面模型。"],
          ["Marble (Nov 2025): persistent, editable worlds from text, image or video, exported as Gaussian splats and meshes; this leads into the 3D scene pages.", "Marble（2025 年 11 月）：從文字、圖片或影片生成可持續、可編輯的世界，匯出為高斯潑濺與網格；由此接到三維場景的頁面。"],
        ],
        history: ["imagenet", "world-labs", "rtfm", "marble"],
      },
    ],
  },
  {
    id: "scenes",
    overline: CONCEPTS,
    title: ["3D scene models", "三維場景模型"],
    intro: [
      "A world can also be stored as geometry and appearance: an explicit state you can look at from any angle. This page goes from the 1984 volume-rendering sum to NeRF and 3D Gaussian splatting, and ends where scenes start to move and respond to actions.",
      "世界也可以存成幾何與外觀：一個能從任意角度觀看的明確狀態。這一頁從 1984 年的體積渲染求和，走到 NeRF 與三維高斯潑濺，最後停在場景開始動起來、回應動作的地方。",
    ],
    sections: [
      {
        id: "volume",
        title: ["Volume rendering", "體積渲染"],
        question: [
          "How does a ray through a cloud of density turn into one pixel's colour?",
          "一條穿過密度雲的光線，怎樣變成一個像素的顏色？",
        ],
        visual: [
          "A 2-D slice with one ray: the reader moves the camera and the samples, and the alpha weights $T_i(1-e^{-\\sigma_i\\delta_i})$ are drawn along the ray as bars.",
          "一個二維切面與一條光線：讀者移動相機與取樣點，沿光線以長條畫出 alpha 權重 $T_i(1-e^{-\\sigma_i\\delta_i})$。",
        ],
        plan: [
          ["Density, transmittance and the quadrature $C = \\sum_i T_i(1-e^{-\\sigma_i\\delta_i})c_i$.", "密度、透射率與數值求積 $C = \\sum_i T_i(1-e^{-\\sigma_i\\delta_i})c_i$。"],
          ["Why the weights sum to $1 - T_{\\text{final}}$.", "為什麼權重加總為 $1 - T_{\\text{final}}$。"],
        ],
        history: ["volume-rendering"],
      },
      {
        id: "nerf",
        title: ["NeRF", "NeRF"],
        question: [
          "How can a small neural network store a whole scene, and why does it need Fourier features to see fine detail?",
          "一個小神經網路怎麼存下整個場景？為什麼它需要傅立葉特徵才看得見細節？",
        ],
        visual: [
          "(a) A 1-D signal fitted with and without positional encoding, stepping through precomputed training snapshots. (b) A tiny pretrained NeRF of a procedural scene, rendered at low resolution as the reader orbits it.",
          "（a）有無位置編碼時擬合一維訊號，逐步瀏覽預先計算的訓練快照。（b）一個程序生成場景的極小預訓練 NeRF，讀者環繞時以低解析度渲染。",
        ],
        plan: [
          ["An MLP $(\\mathbf{x}, \\mathbf{d}) \\mapsto (\\sigma, \\mathbf{c})$ fitted through the volume-rendering sum.", "一個多層感知器 $(\\mathbf{x}, \\mathbf{d}) \\mapsto (\\sigma, \\mathbf{c})$，透過體積渲染求和來擬合。"],
          ["Positional encoding and spectral bias; hierarchical sampling.", "位置編碼與頻譜偏差；階層式取樣。"],
          ["An aside on speed: Instant-NGP's hash grids.", "關於速度的旁註：Instant-NGP 的雜湊網格。"],
        ],
        history: ["nerf", "instant-ngp"],
      },
      {
        id: "gaussians",
        title: ["3D Gaussian splatting", "三維高斯潑濺"],
        question: [
          "How do millions of coloured blobs, sorted and blended, reproduce a photo-real scene in real time?",
          "數百萬個彩色團塊經過排序與混合，怎麼即時重現照片般真實的場景？",
        ],
        visual: [
          "(a) 2-D splatting fitting an image: a slider steps through optimisation snapshots, and clicking a Gaussian shows its parameters. (b) A small pretrained 3DGS scene in a splat viewer, orbitable, with a toggle to show the ellipsoids.",
          "（a）二維潑濺擬合一張圖片：滑桿逐步瀏覽最佳化快照，點一個高斯就顯示它的參數。（b）一個小型預訓練 3DGS 場景，可環繞觀看，並可切換顯示橢球。",
        ],
        plan: [
          ["Anisotropic Gaussians: $\\mu$, $\\Sigma = RSS^\\top R^\\top$, opacity, spherical-harmonic colour.", "各向異性高斯：$\\mu$、$\\Sigma = RSS^\\top R^\\top$、不透明度、球諧函數顏色。"],
          ["Projection to 2-D with the EWA Jacobian; depth-sorted alpha blending.", "以 EWA 雅可比矩陣投影到二維；依深度排序的 alpha 混合。"],
          ["Densify and prune during training.", "訓練時的增密與修剪。"],
        ],
        history: ["splatting", "ewa", "gaussian-splatting"],
      },
      {
        id: "toward",
        title: ["NeRF and 3DGS compared, and toward world models", "NeRF 與 3DGS 的比較，以及走向世界模型"],
        question: [
          "Implicit or explicit: which kind of scene can a world model predict, edit and act in?",
          "隱式或顯式：哪一種場景能讓世界模型預測、編輯並在其中行動？",
        ],
        visual: [
          "A moving Gaussian scene with a time slider $t$, beside a table comparing NeRF and 3DGS on speed, memory and editing.",
          "一個會動的高斯場景與時間滑桿 $t$，旁邊是一張比較 NeRF 與 3DGS 速度、記憶體與可編輯性的表格。",
        ],
        plan: [
          ["Implicit against explicit storage; speed against memory; editing.", "隱式與顯式儲存；速度與記憶體；編輯。"],
          ["Dynamic and 4-D scenes (D-NeRF, 4D-GS).", "動態與四維場景（D-NeRF、4D-GS）。"],
          ["Where they meet world models: generated 3-D worlds (Marble), and 3DGS as a simulator for robotics.", "與世界模型交會之處：生成的三維世界（Marble），以及把 3DGS 當作機器人模擬器。"],
        ],
        history: ["marble", "genie-3"],
      },
    ],
  },
  {
    id: "limits",
    overline: CONCEPTS,
    title: ["Scope and open questions", "範圍與未解問題"],
    intro: [
      "What world models can and cannot be shown to do. Claims on this page are marked by their evidence: established, demonstrated, or speculative.",
      "世界模型能做到、以及尚未被證明能做到的事。本頁的主張依證據程度標示：已確立、已展示，或推測。",
    ],
    sections: [
      {
        id: "physics",
        title: ["Do video models learn physics?", "影片模型學會物理了嗎？"],
        question: [
          "When a generated world looks right, how would we know whether the model has learned the rules behind it?",
          "當生成的世界看起來正確時，我們怎麼知道模型是否學到了背後的規則？",
        ],
        visual: [
          "Side-by-side clips of plausible-looking and physically wrong generations, with the violated law marked.",
          "看似合理與違反物理的生成片段並排，並標出被違反的定律。",
        ],
        plan: [
          ["Physical-consistency benchmarks and what they measure.", "物理一致性基準測試，以及它們衡量什麼。"],
          ["Long-horizon consistency and memory.", "長時間的一致性與記憶。"],
        ],
      },
      {
        id: "evidence",
        title: ["Evidence levels and the sim-to-real gap", "證據等級與模擬到真實的落差"],
        question: [
          "Which claims about world models rest on experiments, which on demos, and which on hope?",
          "關於世界模型的哪些主張建立在實驗上？哪些建立在展示上？哪些只是期望？",
        ],
        visual: [
          "A table of claims, each tagged established, demonstrated or speculative, with its source.",
          "一張主張列表，每項標註「已確立」、「已展示」或「推測」，並附來源。",
        ],
        plan: [
          ["Evaluating a world model: rollout error, calibration, downstream task success.", "評估世界模型：推演誤差、校準、下游任務成功率。"],
          ["The sim-to-real gap for robots trained in generated worlds.", "在生成世界中訓練的機器人所面對的模擬到真實落差。"],
        ],
      },
    ],
  },
];

export const SKILLS_OUTLINES: DraftOutline[] = [
  {
    id: "models",
    overline: SKILLS,
    title: ["States, models and rollouts", "狀態、模型與推演"],
    intro: [
      "Read-only TypeScript beside the demo it runs: how the book's small models represent the world and step it forward.",
      "唯讀的 TypeScript 程式碼，與它所驅動的示範並排：本書的小模型如何表示世界、如何把它往前推一步。",
    ],
    sections: [
      {
        id: "types",
        title: ["States, actions and observations", "狀態、動作與觀測"],
        question: ["How do you write down a world so that a program can step it?", "怎樣寫下一個世界，讓程式能一步步推進它？"],
        visual: ["The gridworld's types beside the gridworld itself; hovering a field highlights what it stores.", "格子世界的型別與格子世界本身並排；滑過一個欄位會標出它儲存的內容。"],
        plan: [
          ["Types for state, action and observation.", "狀態、動作與觀測的型別。"],
          ["A seeded random number generator, so every run can be repeated.", "帶種子的亂數產生器，讓每次執行都能重現。"],
        ],
      },
      {
        id: "rollout",
        title: ["A one-step model and a rollout", "單步模型與推演"],
        question: ["How does one function, called in a loop, become a prediction of the future?", "一個函式在迴圈中反覆呼叫，怎麼就成了對未來的預測？"],
        visual: ["The `step` and `rollout` functions from `cartpole.ts`, with the trajectory they produce.", "`cartpole.ts` 的 `step` 與 `rollout` 函式，以及它們產生的軌跡。"],
        plan: [
          ["A step function, then a rollout over a horizon.", "一個 step 函式，接著是在某個步數內的推演。"],
          ["Losses: reconstruction, KL, latent prediction.", "損失函數：重建、KL、潛在預測。"],
        ],
      },
    ],
  },
  {
    id: "planning",
    overline: SKILLS,
    title: ["Planning in code", "以程式碼規劃"],
    intro: [
      "The planners of the Concepts pages in a few dozen lines each.",
      "概念頁面中的規劃器，每個只要幾十行程式碼。",
    ],
    sections: [
      {
        id: "cem",
        title: ["CEM and MPC in about 30 lines", "約 30 行的 CEM 與 MPC"],
        question: ["What is the smallest planner that works?", "能運作的最小規劃器是什麼樣子？"],
        visual: ["`cem.ts` beside the CEM demo; each line lights up as the demo runs it.", "`cem.ts` 與 CEM 示範並排；示範執行到哪一行，那一行就亮起。"],
        plan: [
          ["Sample, score, keep the elites, refit.", "取樣、評分、保留菁英、重新擬合。"],
          ["Receding-horizon control around it.", "外層的滾動時域控制。"],
        ],
      },
      {
        id: "dyna",
        title: ["Dyna-Q", "Dyna-Q"],
        question: ["How little code turns Q-learning into learning in imagination?", "要加多少程式碼，Q 學習才變成在想像中學習？"],
        visual: ["`dyna.ts` with the imagined-update loop marked, beside the learning curves.", "`dyna.ts`，標出想像更新的迴圈，旁邊是學習曲線。"],
        plan: [
          ["A table model of seen transitions.", "記錄已見轉移的表格模型。"],
          ["$n$ imagined updates per real step.", "每一個真實步驟做 $n$ 次想像更新。"],
        ],
      },
    ],
  },
  {
    id: "checking",
    overline: SKILLS,
    title: ["Checking a world model", "檢驗世界模型"],
    intro: [
      "How the book's tests check each model, and how to check your own.",
      "本書的測試如何檢查每個模型，以及如何檢查你自己的模型。",
    ],
    sections: [
      {
        id: "tests",
        title: ["Rollout error, calibration and sanity tests", "推演誤差、校準與基本檢查"],
        question: ["How do you know a world model is good enough for what you want to do with it?", "怎麼知道一個世界模型對你的用途來說夠好？"],
        visual: ["Rollout error against horizon and a calibration plot, drawn from the book's own test runs.", "推演誤差對步數的曲線與校準圖，取自本書自己的測試結果。"],
        plan: [
          ["Rollout error against horizon.", "推演誤差對步數。"],
          ["Calibration of predicted uncertainty.", "預測不確定性的校準。"],
          ["Sanity tests: conservation laws, known optima, reference outputs.", "基本檢查：守恆律、已知最佳解、參考輸出。"],
        ],
      },
    ],
  },
  {
    id: "rendering",
    overline: SKILLS,
    title: ["Rays and splats", "光線與潑濺"],
    intro: [
      "The 3D scene pages in code: camera rays, volume rendering, positional encoding, and projecting a Gaussian.",
      "三維場景頁面的程式碼：相機光線、體積渲染、位置編碼，以及投影一個高斯。",
    ],
    sections: [
      {
        id: "rays",
        title: ["Camera rays and a volume-rendering function", "相機光線與體積渲染函式"],
        question: ["How does a pixel become a ray, and a ray become a colour?", "一個像素怎麼變成一條光線，一條光線又怎麼變成一個顏色？"],
        visual: ["`volumeRender.ts` beside the one-ray demo.", "`volumeRender.ts` 與單一光線示範並排。"],
        plan: [
          ["Camera intrinsics and ray generation.", "相機內參與光線生成。"],
          ["The quadrature loop, and positional encoding.", "求積迴圈，以及位置編碼。"],
        ],
      },
      {
        id: "splat",
        title: ["Projecting and compositing Gaussians", "投影與合成高斯"],
        question: ["What does it take to draw one 3-D Gaussian on the screen?", "在螢幕上畫出一個三維高斯需要什麼？"],
        visual: ["`splat.ts` (about 40 lines) beside the 2-D splatting demo.", "`splat.ts`（約 40 行）與二維潑濺示範並排。"],
        plan: [
          ["The EWA Jacobian and the 2-D covariance.", "EWA 雅可比矩陣與二維共變異數。"],
          ["Front-to-back alpha compositing.", "由前到後的 alpha 合成。"],
        ],
      },
    ],
  },
];

export const READING_OUTLINE: DraftOutline = {
  id: "papers",
  overline: ["Further reading", "延伸閱讀"],
  title: ["Papers & code", "論文與程式碼"],
  intro: [
    "A short, annotated list of the papers, courses and code behind each page.",
    "每一頁背後的論文、課程與程式碼，附簡短註解。",
  ],
  sections: [
    {
      id: "start",
      title: ["Where to start", "從哪裡開始"],
      question: ["Which three papers should a newcomer read first?", "新手應該先讀哪三篇論文？"],
      visual: ["Reading cards: paper, one-line pitch, and the page of this book it goes with.", "閱讀卡片：論文、一句話簡介，以及對應本書的哪一頁。"],
      plan: [
        ["Papers, grouped as the Concepts pages are.", "論文，依概念頁面分組。"],
        ["Courses and open-source code.", "課程與開源程式碼。"],
      ],
    },
  ],
};
