/**
 * Concepts ▸ History: how the idea of a model of the world grew from a sentence in a 1943 book into machines that
 * generate worlds you can walk through. Two strands run side by side and meet in 2024: learning to predict and plan
 * (Craik, Kalman, Dyna, Dreamer, MuZero, JEPA, Genie) and rendering a scene from data (volume rendering, splatting,
 * NeRF, Gaussian splatting). Every card cites its sources. Text is [English, Traditional Chinese].
 */
import type { Era, Localized, TimelineCard } from "@learnkit/web";

export const ERAS: Era[] = [
  {
    id: "mind",
    title: ["A model in the head", "腦中的模型"],
    intro: [
      "The idea, and the two habits every world model keeps: predict, then correct; learn from imagined experience.",
      "這個想法，以及每個世界模型都保留的兩個習慣：先預測再修正；從想像的經驗中學習。",
    ],
    colour: "amber",
    label: ["Part I", "第一部"],
    short: ["The idea", "想法"],
  },
  {
    id: "volume",
    title: ["Light through a volume", "穿過體積的光"],
    intro: [
      "Computer graphics learns to draw clouds, smoke and scans: rays through a density, and blobs thrown at the screen.",
      "電腦圖學學會畫雲、煙與掃描影像：穿過密度的光線，以及丟向螢幕的團塊。",
    ],
    colour: "sky",
    label: ["Part II", "第二部"],
    short: ["Rendering", "渲染"],
  },
  {
    id: "imagine",
    title: ["Learning to imagine", "學會想像"],
    intro: [
      "Data at scale, then agents that learn a model from experience and practise inside it.",
      "大規模資料，然後是從經驗學出模型、並在模型裡練習的智能體。",
    ],
    colour: "orange",
    label: ["Part III", "第三部"],
    short: ["Imagination", "想像"],
  },
  {
    id: "scenes",
    title: ["Scenes learned from photos", "從照片學出的場景"],
    intro: [
      "The rendering strand turns around: instead of drawing a known scene, recover the scene from its pictures.",
      "渲染這條線反過來走：不是畫出已知的場景，而是從照片還原出場景。",
    ],
    colour: "teal",
    label: ["Part IV", "第四部"],
    short: ["3D scenes", "三維場景"],
  },
  {
    id: "meaning",
    title: ["Predict meaning, not pixels", "預測意義，而非像素"],
    intro: [
      "An argument that a world model should predict what matters about the future, not every detail of it.",
      "一個主張：世界模型應該預測未來中重要的部分，而不是每一個細節。",
    ],
    colour: "indigo",
    label: ["Part V", "第五部"],
    short: ["Representations", "表徵"],
  },
  {
    id: "enter",
    title: ["Worlds you can enter", "可以走進去的世界"],
    intro: [
      "Generative models you can steer in real time, and the moment the two strands meet: a generated world stored as Gaussian splats.",
      "可以即時操控的生成模型，以及兩條線交會的時刻：以高斯潑濺儲存的生成世界。",
    ],
    colour: "rose",
    label: ["Part VI", "第六部"],
    short: ["Worlds", "世界"],
  },
];

const wiki = (title: string, label = `${title.replace(/_/g, " ")} (Wikipedia)`) => ({ label, url: `https://en.wikipedia.org/wiki/${title}` });
const arxiv = (id: string, label: string) => ({ label: `${label} (arXiv ${id})`, url: `https://arxiv.org/abs/${id}` });
const doi = (id: string, label: string) => ({ label, url: `https://doi.org/${id}` });

export const HISTORY: TimelineCard[] = [
  // ── Part I: a model in the head ──
  {
    id: "craik",
    era: "mind",
    year: "1943",
    image: {
      src: "history/craik.webp",
      alt: [
        "Oliver Zangwill, Carolus Oldfield and Kenneth Craik outside the Bun Shop in Cambridge, 1937",
        "1937 年，奧利佛·贊威爾、卡羅勒斯·奧德菲爾德與肯尼斯·克雷克在劍橋的 Bun Shop 門外",
      ],
      credit: "Unknown photographer · Public domain",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Oliver_Zangwill,_Carolus_Oldfield_und_Kenneth_Craik.png",
    },
    title: ["Kenneth Craik: a small-scale model of reality", "肯尼斯·克雷克：縮小版的現實模型"],
    body: [
      [
        "In *The Nature of Explanation* (1943) the Scottish psychologist Kenneth Craik proposed that if an organism carries \"a small-scale model\" of external reality and of its own possible actions within its head, it can try out alternatives, conclude which is best, and react to future situations before they arise.",
        "蘇格蘭心理學家肯尼斯·克雷克在《解釋的本質》（1943）中提出：如果一個生物在腦中帶著外在現實與自身可能行動的「縮小版模型」，它就能先試試不同選擇、判斷哪個最好，並在未來的情況發生之前就做出反應。",
      ],
      [
        "Every later card answers the same three questions in a new way: what is the model made of, how is it learned, and how is it used to choose an action?",
        "後面的每一張卡片，都用新的方式回答同樣三個問題：模型由什麼構成？如何學出來？如何用它來選擇行動？",
      ],
    ],
    sources: [wiki("Kenneth_Craik"), wiki("Mental_model")],
  },
  {
    id: "kalman",
    era: "mind",
    year: "1960",
    image: {
      src: "history/kalman.webp",
      alt: [
        "Rudolf Kálmán, emeritus professor at ETH Zurich, photographed for his 2008 Charles Stark Draper Prize",
        "蘇黎世聯邦理工學院榮休教授魯道夫·卡爾曼，攝於他獲頒 2008 年查爾斯·斯塔克·德雷珀獎之際",
      ],
      credit: "Unknown photographer (ETH-Bibliothek Zürich) · CC BY-SA 4.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:ETH-BIB-Kalman,_Rudolf_E._(1930-2016)-HK_04-01925.jpg",
    },
    title: ["The Kalman filter: predict, then correct", "卡爾曼濾波：先預測，再修正"],
    body: [
      [
        "Rudolf Kálmán's 1960 paper gave a recipe for tracking a system you cannot see directly. A linear model $x_{t+1} = A x_t + B u_t + w_t$ **predicts** the next state and how uncertain it is; when a measurement arrives, the prediction is **corrected**, weighted by how much each is trusted (the Kalman gain).",
        "魯道夫·卡爾曼 1960 年的論文，提供了追蹤一個無法直接看見的系統的方法。線性模型 $x_{t+1} = A x_t + B u_t + w_t$ 先**預測**下一個狀態以及它有多不確定；量測到來時，再依兩者各自的可信程度（卡爾曼增益）**修正**預測。",
      ],
      [
        "It navigated Apollo to the Moon. Learned world models keep the same two steps: a *prior* predicted from the past, and a *posterior* corrected by the new observation (Dreamer's recurrent state-space model, Part III).",
        "它曾為阿波羅登月導航。學習而來的世界模型保留了同樣的兩步：由過去預測出的*先驗*，以及由新觀測修正後的*後驗*（Dreamer 的遞迴狀態空間模型，見第三部）。",
      ],
    ],
    sources: [wiki("Kalman_filter"), doi("10.1115/1.3662552", "Kalman (1960), A New Approach to Linear Filtering and Prediction Problems")],
  },
  {
    id: "schmidhuber-1990",
    era: "mind",
    year: "1990",
    image: {
      src: "history/schmidhuber-1990.webp",
      alt: [
        "Jürgen Schmidhuber speaking at the AI for Good Global Summit in Geneva, 2017",
        "2017 年，于爾根·施密德胡伯在日內瓦的 AI for Good 全球高峰會上演講",
      ],
      credit: "ITU/R.Farrell · CC BY 2.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:J%C3%BCrgen_Schmidhuber,_2017_(cropped).jpg",
    },
    title: ["A learned model to plan with", "用來規劃的學習模型"],
    body: [
      [
        "Jürgen Schmidhuber's 1990 report *Making the world differentiable* trained one recurrent network to predict what the environment would do next, then trained a controller **through** that model by gradient descent, since the real world gives no gradients. The same work rewarded the controller for finding situations the model could not yet predict: an early form of artificial curiosity.",
        "于爾根·施密德胡伯 1990 年的報告《讓世界可微分》訓練一個遞迴網路去預測環境下一步會怎樣，再以梯度下降**透過**這個模型訓練控制器——因為真實世界不會給出梯度。同一份研究還會獎勵控制器去尋找模型還無法預測的情況：這是人工好奇心的早期形式。",
      ],
    ],
    sources: [
      { label: "Schmidhuber: 1990, planning and reinforcement learning with recurrent world models and artificial curiosity", url: "https://people.idsia.ch/~juergen/world-models-planning-curiosity-fki-1990.html" },
    ],
  },
  {
    id: "dyna",
    era: "mind",
    year: "1990",
    image: {
      src: "history/dyna.webp",
      alt: [
        "Richard Sutton in 2016",
        "理查·薩頓，攝於 2016 年",
      ],
      credit: "Steve Jurvetson · CC BY 2.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Richard_Sutton,_October_27,_2016.jpg",
    },
    title: ["Dyna: learning from imagined experience", "Dyna：從想像的經驗中學習"],
    body: [
      [
        "Richard Sutton's Dyna architecture joined three things that had been separate: act in the world, learn a model from what happened, and use the model to generate **simulated** experience that feeds the very same learning rule. Planning becomes learning from imagined steps.",
        "理查·薩頓的 Dyna 架構把原本分開的三件事接在一起：在世界中行動、從發生的事學出模型，再用模型產生**模擬的**經驗，餵給同一條學習規則。規劃於是變成從想像的步驟中學習。",
      ],
      [
        "With a few imagined updates per real step, an agent needs far fewer real steps. The Concepts page on imagination lets you set that number and watch the learning curve move.",
        "每走一步真實的步驟就做幾次想像的更新，智能體需要的真實步驟就大幅減少。「學會想像」這一頁讓你調整這個次數，看學習曲線如何移動。",
      ],
    ],
    sources: [
      doi("10.1145/122344.122377", "Sutton (1991), Dyna, an integrated architecture for learning, planning, and reacting"),
      { label: "Sutton & Barto, Reinforcement Learning: An Introduction, ch. 8 (free online)", url: "http://incompleteideas.net/book/the-book-2nd.html" },
    ],
  },

  // ── Part II: light through a volume ──
  {
    id: "volume-rendering",
    era: "volume",
    year: "1984",
    image: {
      src: "history/volume-rendering.webp",
      alt: [
        "James (Jim) Kajiya in his office at Microsoft Research, 2009",
        "2009 年，詹姆斯（吉姆）·卡吉雅在微軟研究院的辦公室",
      ],
      credit: "Dcoetzee · CC0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Jim_Kajiya.jpg",
    },
    title: ["Ray tracing volume densities", "以光線追蹤體積密度"],
    body: [
      [
        "James Kajiya and Brian Von Herzen rendered clouds and smoke by following rays through a field of density: along each ray, matter both absorbs light and gives it off. Nelson Max's 1995 survey wrote down the emission–absorption model in the form used today:",
        "詹姆斯·卡吉雅與布萊恩·馮·赫岑以追蹤光線穿過密度場的方式來渲染雲與煙：沿著每條光線，物質既吸收光也發出光。尼爾森·馬克斯在 1995 年的綜述中，把這個發射–吸收模型寫成今天使用的形式：",
      ],
      [
        "$C = \\sum_i T_i\\,(1 - e^{-\\sigma_i \\delta_i})\\,c_i$, where $T_i = e^{-\\sum_{j<i} \\sigma_j \\delta_j}$",
        "$C = \\sum_i T_i\\,(1 - e^{-\\sigma_i \\delta_i})\\,c_i$，其中 $T_i = e^{-\\sum_{j<i} \\sigma_j \\delta_j}$",
      ],
      [
        "Thirty-six years later NeRF (Part IV) uses exactly this sum, with a neural network supplying the density $\\sigma$ and colour $c$.",
        "三十六年後，NeRF（第四部）用的正是這個總和，只是密度 $\\sigma$ 與顏色 $c$ 改由神經網路提供。",
      ],
    ],
    sources: [
      doi("10.1145/964965.808594", "Kajiya & Von Herzen (1984), Ray tracing volume densities"),
      doi("10.1109/2945.468400", "Max (1995), Optical models for direct volume rendering"),
      wiki("Volume_rendering"),
    ],
  },
  {
    id: "splatting",
    era: "volume",
    year: "1990",
    title: ["Splatting: throw the blobs at the screen", "潑濺：把團塊丟向螢幕"],
    body: [
      [
        "Lee Westover turned volume rendering around. Instead of marching a ray through every voxel, throw each voxel **at the screen** as a small footprint (a \"splat\") and blend the footprints front to back. The work moves from pixels to primitives, which is fast when most of space is empty.",
        "李·韋斯托弗把體積渲染反過來做：不是讓光線走過每一個體素，而是把每個體素當成一個小足跡（「潑濺」）**丟向螢幕**，再由前往後混合這些足跡。工作從像素轉到基本元素上，在大部分空間都是空的時候特別快。",
      ],
    ],
    sources: [doi("10.1145/97880.97919", "Westover (1990), Footprint evaluation for volume rendering"), wiki("Volume_rendering#Splatting", "Volume rendering: splatting (Wikipedia)")],
  },
  {
    id: "ewa",
    era: "volume",
    year: "2001",
    image: {
      src: "history/ewa.webp",
      alt: [
        "Hanspeter Pfister, one of the four authors of EWA splatting, in front of a whiteboard (2018)",
        "EWA 潑濺的四位作者之一漢斯彼得·菲斯特，站在白板前（2018 年）",
      ],
      credit: "Anna Olivella · CC BY-SA 4.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Hanspeter_Pfister.jpg",
    },
    title: ["EWA splatting: Gaussians that stay Gaussian", "EWA 潑濺：投影後仍是高斯"],
    body: [
      [
        "Matthias Zwicker, Hanspeter Pfister, Jeroen van Baar and Markus Gross made each splat an elliptical Gaussian. With the camera approximated as locally affine (Jacobian $J$), a 3D Gaussian with covariance $\\Sigma$ projects to a 2D Gaussian with covariance $J W \\Sigma W^\\top J^\\top$, so blending stays smooth and free of aliasing.",
        "馬蒂亞斯·茨維克、漢斯彼得·菲斯特、耶倫·范巴爾與馬庫斯·格羅斯把每個潑濺做成橢圓高斯。把相機在局部近似為仿射（雅可比矩陣 $J$），一個共變異數為 $\\Sigma$ 的三維高斯，投影後就是共變異數為 $J W \\Sigma W^\\top J^\\top$ 的二維高斯，混合結果平滑且沒有鋸齒。",
      ],
      [
        "This projection formula is the one 3D Gaussian splatting uses in 2023 (Part IV).",
        "2023 年的三維高斯潑濺（第四部）用的正是這條投影公式。",
      ],
    ],
    sources: [
      doi("10.1109/VISUAL.2001.964490", "Zwicker et al. (2001), EWA volume splatting"),
      doi("10.1145/383259.383300", "Zwicker et al. (2001), Surface splatting"),
    ],
  },

  // ── Part III: learning to imagine ──
  {
    id: "imagenet",
    era: "imagine",
    year: "2009",
    image: {
      src: "history/imagenet.webp",
      alt: [
        "Fei-Fei Li speaking at the AI for Good Global Summit in Geneva, 2017",
        "2017 年，李飛飛在日內瓦的 AI for Good 全球高峰會上演講",
      ],
      credit: "ITU Pictures · CC BY 2.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Fei-Fei_Li_at_AI_for_Good_2017.jpg",
    },
    title: ["ImageNet: seeing, from data at scale", "ImageNet：從大規模資料學會看"],
    body: [
      [
        "Fei-Fei Li and her colleagues built ImageNet, millions of photographs labelled with thousands of categories. In 2012 a deep network (AlexNet) won its challenge by a wide margin, and deep learning took over computer vision.",
        "李飛飛與同事建立了 ImageNet：數百萬張照片，標上數千個類別。2012 年一個深度網路（AlexNet）以大幅差距贏得它的挑戰賽，深度學習從此主導電腦視覺。",
      ],
      [
        "Li later argued that naming what is in a picture is not enough: an agent needs **spatial intelligence**, an understanding of the 3D world it can act in. That argument leads to World Labs (Part VI).",
        "李飛飛後來主張，說出照片裡有什麼還不夠：智能體需要**空間智能**，也就是對它能在其中行動的三維世界的理解。這個主張後來通往 World Labs（第六部）。",
      ],
    ],
    sources: [doi("10.1109/CVPR.2009.5206848", "Deng et al. (2009), ImageNet: A large-scale hierarchical image database"), wiki("ImageNet"), wiki("Fei-Fei_Li")],
  },
  {
    id: "pilco",
    era: "imagine",
    year: "2011",
    title: ["PILCO: a model that knows what it doesn't know", "PILCO：知道自己不知道什麼的模型"],
    body: [
      [
        "Marc Deisenroth and Carl Rasmussen learned the dynamics of a cart-pole with a Gaussian process, which gives a prediction **and** its uncertainty, and planned with both. The pole was swung up after a handful of trials.",
        "馬克·戴森羅特與卡爾·拉斯穆森用高斯過程學出推車倒立擺的動力學——它同時給出預測**和**預測的不確定度——並用兩者一起規劃。只試了幾次，擺桿就被甩上來了。",
      ],
      [
        "The lesson outlived the method: a planner that trusts a model blindly will exploit the model's mistakes. Ensembles and stochastic latents (Part III onward) are later answers to the same problem.",
        "這個教訓比方法本身更長久：盲目信任模型的規劃器會鑽模型錯誤的漏洞。集成模型與隨機潛變數（第三部之後）是後來對同一問題的回答。",
      ],
    ],
    sources: [{ label: "Deisenroth & Rasmussen (2011), PILCO, ICML (PDF)", url: "https://mlg.eng.cam.ac.uk/pub/pdf/DeiRas11.pdf" }],
  },
  {
    id: "world-models",
    era: "imagine",
    year: "2018",
    title: ["World Models: training inside a dream", "World Models：在夢裡訓練"],
    body: [
      [
        "David Ha and Jürgen Schmidhuber split an agent into three parts: **V**, a variational autoencoder that squeezes each frame into a short latent vector $z$; **M**, a recurrent network that predicts the next $z$; and **C**, a tiny controller. For a VizDoom task, the controller was trained entirely inside M's \"dream\" and then worked in the real game.",
        "大衛·哈與于爾根·施密德胡伯把智能體拆成三部分：**V**，一個變分自編碼器，把每一幀壓成短短的潛向量 $z$；**M**，一個遞迴網路，預測下一個 $z$；**C**，一個很小的控制器。在一個 VizDoom 任務中，控制器完全在 M 的「夢」裡訓練，然後在真實遊戲中也能運作。",
      ],
      [
        "The paper gave the field its name and an interactive web article that is still worth reading.",
        "這篇論文為這個領域定了名字，它的互動網頁文章至今仍值得一讀。",
      ],
    ],
    sources: [arxiv("1803.10122", "Ha & Schmidhuber (2018), World Models"), { label: "worldmodels.github.io (interactive article)", url: "https://worldmodels.github.io/" }],
  },
  {
    id: "dreamer",
    era: "imagine",
    year: "2019–2020",
    title: ["PlaNet and Dreamer: plan and learn in latent space", "PlaNet 與 Dreamer：在潛空間中規劃與學習"],
    body: [
      [
        "Danijar Hafner and colleagues learned a **recurrent state-space model** from pixels: a deterministic memory plus a stochastic latent, with a prior predicted from the past and a posterior corrected by the image (Kalman's two steps, learned). PlaNet (2019) planned in that latent space with the cross-entropy method; Dreamer (2020) instead trained an actor and a critic on imagined latent trajectories.",
        "達尼亞爾·哈夫納與同事從像素學出一個**遞迴狀態空間模型**：確定性的記憶加上隨機的潛變數，由過去預測先驗、由影像修正後驗（也就是卡爾曼的兩步，改由學習得來）。PlaNet（2019）在這個潛空間中以交叉熵方法規劃；Dreamer（2020）則改在想像出的潛軌跡上訓練行動者與評論者。",
      ],
    ],
    sources: [arxiv("1811.04551", "Hafner et al. (2019), Learning Latent Dynamics for Planning from Pixels"), arxiv("1912.01603", "Hafner et al. (2020), Dream to Control")],
  },
  {
    id: "muzero",
    era: "imagine",
    year: "2020",
    image: {
      src: "history/muzero.webp",
      alt: [
        "Black and white stones on a Go board: one of the games MuZero learned without being told the rules",
        "棋盤上的黑白棋子：圍棋是 MuZero 在不知道規則下學會的遊戲之一",
      ],
      credit: "Dietmar Rabich · CC BY-SA 4.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Go_--_2021_--_6732.jpg",
    },
    title: ["MuZero: a model of only what matters for choosing", "MuZero：只模擬做選擇需要的東西"],
    body: [
      [
        "DeepMind's MuZero learned a model that never reconstructs the screen. From a hidden state it predicts only the **reward**, the **value** and the **policy**, which is exactly what tree search needs. Searching that learned model, it matched AlphaZero at Go, chess and shogi and set a new state of the art on Atari, without being told the rules of any game.",
        "DeepMind 的 MuZero 學出的模型從不重建畫面。它從隱藏狀態只預測**獎勵**、**價值**與**策略**——正好是樹搜尋需要的東西。在這個學出的模型上搜尋，它在圍棋、西洋棋與將棋上追平 AlphaZero，並在 Atari 上創下新紀錄，而且從未被告知任何一個遊戲的規則。",
      ],
    ],
    sources: [doi("10.1038/s41586-020-03051-4", "Schrittwieser et al. (2020), Mastering Atari, Go, chess and shogi by planning with a learned model, Nature"), wiki("MuZero")],
  },
  {
    id: "dreamerv3",
    era: "imagine",
    year: "2023–2025",
    title: ["DreamerV3: diamonds in Minecraft", "DreamerV3：在 Minecraft 裡挖到鑽石"],
    body: [
      [
        "DreamerV3 used **one fixed set of hyperparameters** across more than 150 tasks, from robot control to Atari. It was the first algorithm to collect diamonds in Minecraft from sparse rewards, with no human data and no curriculum: a long chain of steps it learned by practising in its own world model. The paper appeared on arXiv in 2023 and in *Nature* in April 2025.",
        "DreamerV3 在超過 150 個任務上——從機器人控制到 Atari——都只用**同一組固定的超參數**。它是第一個在稀疏獎勵下、不用人類資料也不用課程設計就在 Minecraft 裡挖到鑽石的演算法：這一長串步驟，是它在自己的世界模型裡練習學會的。論文 2023 年刊於 arXiv，2025 年 4 月刊於《自然》。",
      ],
    ],
    sources: [
      doi("10.1038/s41586-025-08744-2", "Hafner et al. (2025), Mastering diverse control tasks through world models, Nature"),
      { label: "DreamerV3 project page", url: "https://danijar.com/project/dreamerv3/" },
    ],
  },

  // ── Part IV: scenes learned from photos ──
  {
    id: "nerf",
    era: "scenes",
    year: "2020",
    image: {
      src: "history/nerf.webp",
      alt: [
        "Ren Ng, a NeRF co-author, holding a Lytro light field camera at UC Berkeley, 2012",
        "2012 年，NeRF 共同作者吳義仁在加州大學柏克萊分校手持 Lytro 光場相機",
      ],
      credit: "Dcoetzee · CC0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Ren_Ng_with_Lytro_light_field_camera.jpg",
    },
    title: ["NeRF: a scene stored in a network", "NeRF：存在網路裡的場景"],
    body: [
      [
        "Ben Mildenhall, Pratul Srinivasan, Matthew Tancik, Jonathan Barron, Ravi Ramamoorthi and Ren Ng stored a whole scene in a small neural network: give it a 3D point and a viewing direction, and it returns a density and a colour. The 1984 volume-rendering sum turns those into a pixel, and because the sum is differentiable, the network can be fitted to a set of photos.",
        "班·米爾登霍爾、普拉圖爾·斯里尼瓦桑、馬修·坦西克、強納森·巴倫、拉維·拉馬穆爾蒂與吳義仁把整個場景存進一個小小的神經網路：給它一個三維點和一個觀看方向，它回傳密度與顏色。1984 年的體積渲染總和把這些變成一個像素；因為這個總和可微分，網路就能擬合到一組照片上。",
      ],
      [
        "A trick made it work: **positional encoding**, feeding the network sines and cosines of the coordinates so it can represent fine detail. From about a hundred photos it renders views no camera took.",
        "一個技巧讓它成功：**位置編碼**——把座標的正弦與餘弦餵給網路，讓它能表示細節。從大約一百張照片，它就能渲染出沒有相機拍過的視角。",
      ],
    ],
    sources: [arxiv("2003.08934", "Mildenhall et al. (2020), NeRF"), { label: "NeRF project page", url: "https://www.matthewtancik.com/nerf" }, wiki("Neural_radiance_field")],
  },
  {
    id: "instant-ngp",
    era: "scenes",
    year: "2022",
    title: ["Instant-NGP: from hours to seconds", "Instant-NGP：從數小時到數秒"],
    body: [
      [
        "Thomas Müller, Alex Evans, Christoph Schied and Alexander Keller at NVIDIA replaced most of NeRF's network with a **multiresolution hash grid** of trainable features and a tiny network after it. Training that took hours dropped to seconds on one GPU.",
        "NVIDIA 的湯瑪斯·穆勒、亞歷克斯·伊凡斯、克里斯多夫·席德與亞歷山大·凱勒，把 NeRF 網路的大部分換成一個可訓練特徵的**多解析度雜湊網格**，後面只接一個很小的網路。原本要數小時的訓練，在一張 GPU 上縮短到數秒。",
      ],
    ],
    sources: [arxiv("2201.05989", "Müller et al. (2022), Instant Neural Graphics Primitives with a Multiresolution Hash Encoding"), { label: "Instant-NGP project page", url: "https://nvlabs.github.io/instant-ngp/" }],
  },
  {
    id: "gaussian-splatting",
    era: "scenes",
    year: "2023",
    image: {
      src: "history/gaussian-splatting.webp",
      alt: [
        "A collapsed building captured as a 3D Gaussian splatting model, seen in an open-source viewer",
        "一棟倒塌的建築被擷取成三維高斯潑濺模型，在開源檢視器中呈現",
      ],
      credit: "Jurdein · CC BY-SA 4.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:3dgs_viewer_QIBWA66MsC.jpg",
    },
    title: ["3D Gaussian splatting: real time, explicit", "三維高斯潑濺：即時、顯式"],
    body: [
      [
        "Bernhard Kerbl, Georgios Kopanas, Thomas Leimkühler and George Drettakis went back to splatting. A scene becomes millions of 3D Gaussians, each with a position, a shape (a rotation and three scales), an opacity and a view-dependent colour. They are projected with the 2001 EWA formula, sorted by depth and alpha-blended, and fitted to photos by gradient descent, with Gaussians split, cloned and pruned as training goes.",
        "伯恩哈德·克爾布、喬治斯·科帕納斯、湯瑪斯·萊姆屈勒與喬治·德雷塔基斯回到了潑濺。場景變成數百萬個三維高斯，每個都有位置、形狀（一個旋轉與三個尺度）、不透明度和隨視角改變的顏色。它們以 2001 年的 EWA 公式投影、依深度排序、做 alpha 混合，並以梯度下降擬合照片；訓練中高斯會被分裂、複製與修剪。",
      ],
      [
        "The result renders at 30 frames per second or more at 1080p, and the scene is an explicit list you can edit, unlike the weights of a network.",
        "結果能以每秒 30 幀以上的速度渲染 1080p 畫面；而且場景是一份可以編輯的顯式清單，不像網路權重那樣難以直接修改。",
      ],
    ],
    sources: [
      arxiv("2308.04079", "Kerbl et al. (2023), 3D Gaussian Splatting for Real-Time Radiance Field Rendering"),
      { label: "3D Gaussian splatting project page (Inria)", url: "https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/" },
      wiki("Gaussian_splatting"),
    ],
  },

  // ── Part V: predict meaning, not pixels ──
  {
    id: "lecun-path",
    era: "meaning",
    year: "2022",
    image: {
      src: "history/lecun-path.webp",
      alt: [
        "Yann LeCun giving a talk at the École polytechnique, 2018",
        "2018 年，楊立昆在巴黎綜合理工學院演講",
      ],
      credit: "Jérémy Barande · CC BY-SA 2.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Yann_LeCun_-_2018_(cropped).jpg",
    },
    title: ["LeCun: a path towards autonomous machine intelligence", "楊立昆：通往自主機器智能之路"],
    body: [
      [
        "Yann LeCun's position paper put a world model at the centre of an intelligent agent and argued that it should predict in **representation space**: the future is uncertain and full of unpredictable detail (the exact leaves on a tree), so predicting every pixel wastes effort. He called the architecture a Joint-Embedding Predictive Architecture, JEPA.",
        "楊立昆的立場論文把世界模型放在智能體的中心，並主張它應該在**表徵空間**中預測：未來充滿不確定與無法預測的細節（樹上每一片葉子的樣子），預測每一個像素是白費力氣。他把這種架構稱為聯合嵌入預測架構，JEPA。",
      ],
    ],
    sources: [{ label: "LeCun (2022), A Path Towards Autonomous Machine Intelligence (OpenReview)", url: "https://openreview.net/forum?id=BZ5a1r-kVsf" }],
  },
  {
    id: "jepa",
    era: "meaning",
    year: "2023–2025",
    title: ["I-JEPA and V-JEPA 2", "I-JEPA 與 V-JEPA 2"],
    body: [
      [
        "I-JEPA (2023) learned image features by predicting the **representations** of hidden blocks of an image from a visible block, with no pixel reconstruction. V-JEPA 2 (2025) did the same for video at scale and then added an action-conditioned predictor (V-JEPA 2-AC) that a robot arm used to plan pick-and-place moves in new settings.",
        "I-JEPA（2023）從影像中一個可見區塊，預測被遮住區塊的**表徵**來學習影像特徵，完全不重建像素。V-JEPA 2（2025）把同樣的做法大規模用在影片上，再加上一個以動作為條件的預測器（V-JEPA 2-AC），讓機械手臂在新環境中規劃抓取與放置。",
      ],
    ],
    sources: [arxiv("2301.08243", "Assran et al. (2023), I-JEPA"), arxiv("2506.09985", "Assran et al. (2025), V-JEPA 2")],
  },

  // ── Part VI: worlds you can enter ──
  {
    id: "sora",
    era: "enter",
    year: "Feb 2024",
    title: ["Video generators as world simulators?", "影片生成器就是世界模擬器？"],
    body: [
      [
        "OpenAI's Sora report turned videos into spacetime patches, used them as a transformer's tokens, and called scaling such video generators \"a promising path towards building general purpose simulators of the physical world\". Whether a model that makes convincing video has learned physics is still open (Concepts ▸ Scope).",
        "OpenAI 的 Sora 報告把影片切成時空區塊，當作 Transformer 的詞元，並稱擴大這類影片生成器是「打造物理世界通用模擬器的一條有希望的路」。一個能做出逼真影片的模型是否學會了物理，至今仍未有定論（概念 ▸ 適用範圍）。",
      ],
    ],
    sources: [{ label: "OpenAI (2024), Video generation models as world simulators", url: "https://openai.com/index/video-generation-models-as-world-simulators/" }],
  },
  {
    id: "genie",
    era: "enter",
    year: "Feb 2024",
    image: {
      src: "history/genie.webp",
      alt: [
        "Demis Hassabis, co-founder and CEO of Google DeepMind, where Genie was built (2018)",
        "Google DeepMind 共同創辦人暨執行長德米斯·哈薩比斯，Genie 即出自 DeepMind（2018 年）",
      ],
      credit: "Duncan.Hull / The Royal Society · CC BY-SA 4.0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Demis_Hassabis_Royal_Society.jpg",
    },
    title: ["Genie: actions learned from unlabelled video", "Genie：從沒有標註的影片學出動作"],
    body: [
      [
        "Google DeepMind's Genie (11 billion parameters) was trained on internet videos of 2D platform games that carry **no action labels**. A latent action model inferred, between each pair of frames, which of 8 discrete actions must have happened; a video tokenizer and a dynamics model then predicted the next frame from the frames and an action. Given one image, even a sketch, Genie makes it playable. It won a best-paper award at ICML 2024.",
        "Google DeepMind 的 Genie（110 億參數）以網路上 2D 平台遊戲的影片訓練，這些影片**沒有動作標註**。一個潛在動作模型在每兩幀之間推斷出 8 個離散動作中發生了哪一個；再由影片分詞器與動態模型，根據畫面與動作預測下一幀。給它一張圖——甚至是手繪草圖——Genie 就能讓它變得可以玩。它獲得 ICML 2024 最佳論文獎。",
      ],
    ],
    sources: [arxiv("2402.15391", "Bruce et al. (2024), Genie: Generative Interactive Environments"), { label: "Genie project page", url: "https://sites.google.com/view/genie-2024/" }],
  },
  {
    id: "game-engines",
    era: "enter",
    year: "2024",
    title: ["Diffusion models as game engines", "擴散模型當遊戲引擎"],
    body: [
      [
        "GameNGen (Google) simulated the game DOOM with a diffusion model at about 20 frames per second on one TPU: each frame generated from the previous frames and the player's keys. DIAMOND trained reinforcement-learning agents inside a diffusion world model of Atari games. Both showed that a generative model can stand in for a game engine.",
        "GameNGen（Google）以擴散模型模擬遊戲 DOOM，在一顆 TPU 上約每秒 20 幀：每一幀都由先前的畫面與玩家的按鍵生成。DIAMOND 則在 Atari 遊戲的擴散世界模型中訓練強化學習智能體。兩者都顯示生成模型可以代替遊戲引擎。",
      ],
    ],
    sources: [arxiv("2408.14837", "Valevski et al. (2024), Diffusion Models Are Real-Time Game Engines"), arxiv("2405.12399", "Alonso et al. (2024), Diffusion for World Modeling (DIAMOND)")],
  },
  {
    id: "world-labs",
    era: "enter",
    year: "Sep 2024",
    title: ["World Labs: the two strands meet", "World Labs：兩條線交會"],
    body: [
      [
        "Fei-Fei Li launched World Labs in September 2024 with \\$230 million of funding to build \"large world models\" with spatial intelligence. Her co-founders were Justin Johnson, Christoph Lassner and **Ben Mildenhall**, the first author of NeRF: the company joins the vision-and-learning strand of this history to its rendering strand.",
        "李飛飛在 2024 年 9 月以 2.3 億美元資金成立 World Labs，目標是打造具備空間智能的「大型世界模型」。共同創辦人是賈斯汀·強森、克里斯多夫·拉斯納，以及 NeRF 的第一作者**班·米爾登霍爾**：這家公司把這段歷史中視覺與學習的那條線，接上了渲染的那條線。",
      ],
    ],
    sources: [
      { label: "World Labs", url: "https://www.worldlabs.ai/" },
      { label: "Maginative (2024), World Labs emerges from stealth with $230 million", url: "https://www.maginative.com/article/world-labs-emerges-from-stealth-with-230-million-to-build-spatial-intelligence-ai/" },
    ],
  },
  {
    id: "genie-2",
    era: "enter",
    year: "Dec 2024",
    title: ["Genie 2: a 3D world from one image", "Genie 2：一張圖生成三維世界"],
    body: [
      [
        "Genie 2, an autoregressive latent diffusion model trained on a large video dataset, turned a single image into a playable 3D world, controlled by keyboard and mouse. Its worlds stayed consistent for up to a minute (most examples 10–20 seconds), and it could remember parts of the world that had gone out of view and draw them again when they came back. DeepMind presented it as a way to train and evaluate embodied agents.",
        "Genie 2 是以大型影片資料集訓練的自迴歸潛在擴散模型，能把單一張圖變成一個可以用鍵盤滑鼠操控的三維世界。它的世界最多能保持約一分鐘的一致（多數範例為 10–20 秒），還能記住離開視野的部分，在它們重新出現時再畫出來。DeepMind 把它定位為訓練與評估具身智能體的工具。",
      ],
    ],
    sources: [{ label: "Google DeepMind (2024), Genie 2: A large-scale foundation world model", url: "https://deepmind.google/discover/blog/genie-2-a-large-scale-foundation-world-model/" }],
  },
  {
    id: "cosmos",
    era: "enter",
    year: "Jan 2025",
    image: {
      src: "history/cosmos.webp",
      alt: [
        "Jensen Huang at NVIDIA's CES 2025 keynote, where Cosmos was announced, in front of a slide leading from perception AI to physical AI",
        "黃仁勳在 NVIDIA 的 CES 2025 主題演講上發表 Cosmos，身後投影片從感知 AI 一路指向物理 AI",
      ],
      credit: "Pronoia · CC0",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Jensen_Huang_-_Nvidia_Keynote_-_CES_2025_Las_Vegas_(1).jpg",
    },
    title: ["Cosmos: world models for robots and cars", "Cosmos：給機器人與汽車的世界模型"],
    body: [
      [
        "NVIDIA released Cosmos, a platform of open-weight \"world foundation models\" pretrained on video and meant to be fine-tuned into simulators for physical AI: robots and self-driving cars that can be trained and tested on generated futures.",
        "NVIDIA 發布 Cosmos：一個開放權重的「世界基礎模型」平台，以影片預訓練，可再微調成物理 AI 的模擬器——讓機器人與自駕車能在生成的未來中訓練與測試。",
      ],
    ],
    sources: [arxiv("2501.03575", "NVIDIA (2025), Cosmos World Foundation Model Platform for Physical AI")],
  },
  {
    id: "genie-3",
    era: "enter",
    year: "Aug 2025",
    title: ["Genie 3: real-time, minutes long", "Genie 3：即時、長達數分鐘"],
    body: [
      [
        "Genie 3 generated interactive worlds from a text prompt in real time, at 720p and 24 frames per second, and kept them consistent for a few minutes. Text could also change a running world (\"promptable world events\": weather, new objects). DeepMind's SIMA agent was among the first to be trained in its worlds. It was released as a limited research preview.",
        "Genie 3 能從文字提示即時生成互動世界，解析度 720p、每秒 24 幀，並保持幾分鐘的一致。文字也能改變正在運行的世界（「可提示的世界事件」：天氣、新物件）。DeepMind 的 SIMA 智能體是最早在它的世界中訓練的之一。它以有限的研究預覽形式發布。",
      ],
    ],
    sources: [{ label: "Google DeepMind (2025), Genie 3: A new frontier for world models", url: "https://deepmind.google/discover/blog/genie-3-a-new-frontier-for-world-models/" }],
  },
  {
    id: "rtfm",
    era: "enter",
    year: "Oct 2025",
    title: ["RTFM: a learned renderer with spatial memory", "RTFM：有空間記憶的學習式渲染器"],
    body: [
      [
        "World Labs' Real-Time Frame Model is an autoregressive diffusion transformer that generates the next frame as you move, running on a single H100 GPU. Each frame it has made is stored with its 3D pose, and a new view is generated by querying with the pose wanted, so places stay where they were when you come back. World Labs calls it a **learned renderer**.",
        "World Labs 的即時幀模型（RTFM）是一個自迴歸擴散轉換器，隨著你移動生成下一幀，只用一張 H100 GPU 運行。它生成過的每一幀都附上三維姿態儲存起來；要生成新視角時，就以想要的姿態去查詢，所以你走回來時，地方還在原處。World Labs 稱它為**學習式渲染器**。",
      ],
    ],
    sources: [{ label: "World Labs (2025), RTFM: A Real-Time Frame Model", url: "https://www.worldlabs.ai/blog/rtfm" }],
  },
  {
    id: "marble",
    era: "enter",
    year: "Nov 2025",
    title: ["Marble: a generated world, saved as Gaussian splats", "Marble：生成的世界，存成高斯潑濺"],
    body: [
      [
        "World Labs released Marble to the public in November 2025. From text, images or video it generates a persistent 3D world that can be edited and expanded, and exports it as **Gaussian splats**, meshes or video.",
        "World Labs 在 2025 年 11 月公開發布 Marble。它能從文字、圖片或影片生成一個持久、可以編輯與擴展的三維世界，並匯出為**高斯潑濺**、網格或影片。",
      ],
      [
        "Here the strands meet in a single file: the world a generative model imagined is stored in the representation that grew out of 1990 splatting and 2023 Gaussian splatting, ready to render in real time.",
        "兩條線在一個檔案裡交會：生成模型想像出的世界，以源自 1990 年潑濺與 2023 年高斯潑濺的表示法儲存，可以即時渲染。",
      ],
    ],
    sources: [
      { label: "World Labs blog", url: "https://www.worldlabs.ai/blog" },
      { label: "Radiance Fields (2025), World Labs formally launches Marble", url: "https://radiancefields.com/world-labs-formally-launches-marble-a-generative-world-model" },
    ],
  },
];

/**
 * Every card's picture: an original diagram of its idea (scripts/history_svgs.py → public/history/<id>.svg), with
 * symbols only, so one file serves both languages; the caption is here. A card that later gets a licensed photograph
 * sets its own `image` above (credited in public/history/CREDITS.md) and keeps it.
 */
const DIAGRAMS: Record<string, Localized> = {
  craik: ["A small-scale model of the world, carried in the head", "裝在腦中的小尺度世界模型"],
  kalman: ["Predict (dashed), measure (dot), correct (filled): the uncertainty shrinks", "預測（虛線）、量測（點）、修正（實心）：不確定性縮小"],
  "schmidhuber-1990": ["A controller C trained through a recurrent world model M", "透過循環世界模型 M 訓練的控制器 C"],
  dyna: ["Act in the world, learn a model M, then n imagined updates per real step", "在世界中行動、學出模型 M，每一真實步再做 n 次想像更新"],
  "volume-rendering": ["One ray through a density field, and the weight each sample adds to the pixel", "一條穿過密度場的光線，以及每個取樣點對像素的權重"],
  splatting: ["Voxels thrown at the screen as footprints", "把體素當作足跡丟到螢幕上"],
  ewa: ["A 3D Gaussian Σ projected through the Jacobian J stays a Gaussian", "三維高斯 Σ 經雅可比矩陣 J 投影後仍是高斯"],
  imagenet: ["Many labelled images: learning to see from data at scale", "大量標註圖片：從大規模資料學會看"],
  pilco: ["A Gaussian-process model: narrow uncertainty near data, wide away from it", "高斯過程模型：資料附近不確定性窄，遠處寬"],
  "world-models": ["V compresses a frame to z, M dreams forward, C acts from (z, h)", "V 把畫面壓成 z，M 向前做夢，C 依 (z, h) 行動"],
  dreamer: ["A recurrent state-space model: observed steps, then imagined ones (dashed) that predict reward", "循環狀態空間模型：先是觀測到的步驟，再是預測獎勵的想像步驟（虛線）"],
  muzero: ["Tree search in a learned model that predicts only reward, value and policy", "在只預測獎勵、價值與策略的學習模型中做樹搜尋"],
  dreamerv3: ["A diamond, reached by imagining the way to it", "一顆鑽石，靠想像出的路徑抵達"],
  nerf: ["Rays from many cameras; an MLP maps (x, d) to (σ, c)", "來自多台相機的光線；多層感知器把 (x, d) 映到 (σ, c)"],
  "instant-ngp": ["Grids at several resolutions, their corners hashed into a small feature table", "多種解析度的網格，其頂點被雜湊到一張小特徵表"],
  "gaussian-splatting": ["A scene made of coloured, semi-transparent 3D Gaussians", "由彩色、半透明三維高斯構成的場景"],
  "lecun-path": ["An energy landscape E(x, y): compatible pairs sit in the low valley", "能量地形 E(x, y)：相容的配對落在低谷"],
  jepa: ["Predict the representation of hidden blocks from a visible block, compared by a distance D", "從可見區塊預測被遮住區塊的表示，以距離 D 比較"],
  sora: ["A video cut into spacetime patches, the tokens of a transformer", "把影片切成時空區塊，作為 Transformer 的詞元"],
  genie: ["A latent action model infers which of 8 actions links two frames; a dynamics model D predicts the next", "潛在動作模型推斷兩個畫面之間是 8 個動作中的哪一個；動態模型 D 預測下一格"],
  "game-engines": ["Past frames and an action, denoised into the next frame", "過去的畫面與一個動作，去噪成下一格畫面"],
  "world-labs": ["Two strands meet: learning to predict and rendering a scene", "兩條線交會：學會預測，以及渲染場景"],
  "genie-2": ["One image becomes a 3D world you can walk through with the keyboard", "一張圖變成可以用鍵盤走動的三維世界"],
  cosmos: ["From the present, a fan of possible futures for a car or a robot arm", "從現在出發，汽車或機器手臂的一束可能未來"],
  "genie-3": ["The same world, frame after frame for minutes, with a prompted event (a storm)", "同一個世界，一格接一格持續數分鐘，加上以提示觸發的事件（暴風雨）"],
  rtfm: ["Posed frames kept as memory; the next view is generated from the nearest ones", "帶位姿的畫面作為記憶；下一個視角由最近的幾張生成"],
  marble: ["One generated world, exported as Gaussian splats (left) and as a mesh (right)", "同一個生成的世界，匯出為高斯潑濺（左）與網格（右）"],
};
for (const card of HISTORY) {
  card.image ??= {
    src: `history/${card.id}.svg`,
    alt: DIAGRAMS[card.id] ?? card.title,
    credit: "Original diagram · Apache-2.0",
  };
}
