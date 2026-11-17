/**
 * Concepts ▸ Generative worlds (#/concept/generative[/<section>]): video models as world models, Google DeepMind's
 * Genie line, and Fei-Fei Li's World Labs. The fastest-moving page of the book: facts checked against primary
 * sources and dated "as of November 2026".
 */
import { useLang } from "@learnkit/web";
import { CONCEPT_OUTLINES } from "../../curriculum.ts";
import LatentAction from "../../demos/LatentAction.tsx";
import Persistence from "../../demos/Persistence.tsx";
import TinyGame from "../../demos/TinyGame.tsx";
import latentSrc from "../../../python/wm/latent_actions.py?raw";
import persistenceSrc from "../../../python/wm/persistence.py?raw";
import tinyGameSrc from "../../../python/wm/tiny_game.py?raw";
import GenerativeConditioning from "../../demos/pictures/GenerativeConditioning.tsx";
import GenerativeLam from "../../demos/pictures/GenerativeLam.tsx";
import { Callout, Evidence, Figure, HistoryLinks, List, P, Page, Pictured, Py, pyRegion, Section, SiteLink, Sources, Table } from "../kit.tsx";

const OUTLINE = CONCEPT_OUTLINES.find((o) => o.id === "generative")!;
const PAGE = "generative";


const arxiv = (id: string, label: string) => ({ label, url: `https://arxiv.org/abs/${id}` });

function AsOf() {
  const { pick } = useLang();
  return (
    <Callout kind="note" title={["As of November 2026", "截至 2026 年 11 月"]}>
      <p>
        {pick([
          "Everything after 2023 on this page was checked against the labs' own posts and papers in November 2026. Products, names and numbers in this area change every few months; where a claim comes only from a company announcement, the text says so.",
          "本頁 2023 年以後的內容，都在 2026 年 11 月對照各實驗室自己的文章與論文核對過。這個領域的產品、名稱與數字每幾個月就會變；若某個說法只出自公司公告，內文會註明。",
        ])}
      </p>
    </Callout>
  );
}

// ---- 1. video ---------------------------------------------------------------------------------------------------

function Video({ n }: { n: number }) {
  const { pick } = useLang();
  return (
    <Section page={PAGE} id="video" n={n} title={OUTLINE.sections[0].title}>
      <P
        t={[
          "A video model learns what usually comes next in a film. Trained on enough film, it has to pick up a good deal about the world: things fall, walls stay put, a ball that leaves the frame comes back from the same side. That is why OpenAI titled its 2024 report on Sora \"Video generation models as world simulators\". But a film does not let you *do* anything. A world model, in the sense of this book, must answer a different question: **what happens next if I do this?**",
          "影片模型學的是一段影片接下來通常會發生什麼。用夠多的影片訓練，它就必須學到不少關於世界的事：東西會掉下來、牆不會動、離開畫面的球會從同一側回來。這就是為什麼 OpenAI 把 2024 年介紹 Sora 的報告命名為〈影片生成模型作為世界模擬器〉。但影片不讓你*做*任何事。本書所說的世界模型必須回答另一個問題：**如果我這樣做，接下來會怎樣？**",
        ]}
      />
      <P
        t={[
          "The difference is one extra argument. Write $x_t$ for the frame at time $t$, $x_{\\le t}$ for all frames so far, $c$ for a text prompt and $a_t$ for the action taken at time $t$ (a key, a joystick, a robot command):",
          "差別只是多一個引數。以 $x_t$ 表示時間 $t$ 的畫面、$x_{\\le t}$ 表示到目前為止的所有畫面、$c$ 表示文字提示、$a_t$ 表示在時間 $t$ 採取的動作（一個按鍵、搖桿、機器人指令）：",
        ]}
      />
      <Pictured
        tex="\underbrace{p(x_{t+1}\mid x_{\le t},\,c)}_{\text{video generation}}\qquad\longrightarrow\qquad \underbrace{p(x_{t+1}\mid x_{\le t},\,a_t)}_{\text{action-conditioned: a world model}}"
        caption={["Same past frames, two questions. Top: a video model continues the clip that the prompt $c$ describes. Bottom: a world model is asked what follows each action $a_t$, and a different key gives a different next frame.", "同樣的過去畫面，兩種問題。上：影片模型把提示 $c$ 描述的片段接下去。下：世界模型被問到每個動作 $a_t$ 之後會怎樣，按不同的鍵，就得到不同的下一幀。"]}
      >
        <GenerativeConditioning />
      </Pictured>
      <P
        t={[
          "With $a_t$ in the condition, the generator becomes the $p(s'\\mid s,a)$ of the first page, except that the state is a stack of pictures. You can then press keys and *play* the model, or let an agent practise inside it.",
          "條件中有了 $a_t$，生成器就成了第一頁的 $p(s'\\mid s,a)$，只是狀態變成一疊圖片。這時你可以按鍵*玩*這個模型，或讓智能體在裡面練習。",
        ]}
      />
      <P
        t={[
          "**Tokens and patches.** A frame has far too many pixels to predict one by one, so every model here first compresses it. The frame is cut into patches (in video, small blocks across space *and* time), and each patch becomes either a **discrete token**, an entry of a learned codebook, as in Genie, or a short **continuous vector**, as in Sora's latent patches. NVIDIA's Cosmos ships tokenizers of both kinds.",
          "**詞元與區塊。** 一幀的像素太多，不可能逐一預測，所以這裡每個模型都先壓縮它。畫面被切成區塊（在影片中是跨越空間*與*時間的小方塊），每個區塊變成一個**離散詞元**（學出來的碼本中的一項，例如 Genie），或一個短的**連續向量**（例如 Sora 的潛在區塊）。NVIDIA 的 Cosmos 兩種詞元器都有提供。",
        ]}
      />
      <P
        t={[
          "**Autoregressive or diffusion.** An *autoregressive* model predicts tokens one after another (or, like Genie's MaskGIT dynamics model, fills in masked tokens over a few rounds), each conditioned on what came before. A *diffusion* model starts the next frame as noise and removes the noise in several steps, conditioned on the past. Most recent world models combine the two: autoregressive over frames, diffusion within each frame. Genie 2 is described as an \"autoregressive latent diffusion model\", and World Labs' RTFM as \"an autoregressive diffusion transformer\".",
          "**自迴歸或擴散。** *自迴歸*模型一個接一個預測詞元（或像 Genie 的 MaskGIT 動態模型那樣，分幾輪填上被遮住的詞元），每一個都以先前的內容為條件。*擴散*模型則讓下一幀從雜訊開始，以過去為條件分幾步去掉雜訊。近來的世界模型多半兩者兼用：在幀與幀之間自迴歸、在每一幀之內擴散。Genie 2 被描述為「自迴歸潛在擴散模型」，World Labs 的 RTFM 則是「自迴歸擴散轉換器」。",
        ]}
      />
      <Table
        head={[
          ["Model", "模型"],
          ["Conditioned on", "條件"],
          ["What it showed", "展示了什麼"],
        ]}
        rows={[
          [
            ["**Sora** (OpenAI, Feb 2024)", "**Sora**（OpenAI，2024 年 2 月）"],
            ["text, images or video; no actions", "文字、圖片或影片；沒有動作"],
            ["A transformer over spacetime patches of video latents; OpenAI argued that scaling such models is \"a promising path towards building general purpose simulators of the physical world\".", "一個作用在影片潛在時空區塊上的轉換器；OpenAI 主張擴大這類模型是「通往通用物理世界模擬器的一條有希望的路」。"],
          ],
          [
            ["**DIAMOND** (May 2024)", "**DIAMOND**（2024 年 5 月）"],
            ["past frames and actions", "過去的畫面與動作"],
            ["A diffusion world model in which RL agents are trained: mean human-normalised score 1.46 on Atari 100k, then the best for agents trained entirely in a world model. Trained on 87 hours of *Counter-Strike: Global Offensive* play, it also ran as a playable game at about 10 frames per second on one RTX 3090.", "一個擴散世界模型，強化學習智能體在其中訓練：在 Atari 100k 上的平均人類正規化分數為 1.46，是當時完全在世界模型中訓練的智能體的最佳成績。用 87 小時的《絕對武力：全球攻勢》遊玩資料訓練後，它也能在一張 RTX 3090 上以約每秒 10 幀當成可玩的遊戲執行。"],
          ],
          [
            ["**GameNGen** (Google, Aug 2024)", "**GameNGen**（Google，2024 年 8 月）"],
            ["the last 64 frames and actions", "最近 64 幀與動作"],
            ["*DOOM* run entirely by a diffusion model (fine-tuned Stable Diffusion v1.4) at 20 frames per second on one TPU, with 4 denoising steps per frame. In short clips, human raters picked the real game over the simulation only 58–60% of the time.", "《毀滅戰士》完全由一個擴散模型（微調過的 Stable Diffusion v1.4）執行，在一顆 TPU 上每秒 20 幀，每幀 4 個去雜訊步驟。在短片段中，人類評分者只有 58–60% 的時候能挑出真正的遊戲。"],
          ],
          [
            ["**Cosmos** (NVIDIA, Jan 2025)", "**Cosmos**（NVIDIA，2025 年 1 月）"],
            ["past video, text, and (after fine-tuning) robot or car actions", "過去的影片、文字，以及（微調後）機器人或汽車的動作"],
            ["Open-weight \"world foundation models\", both diffusion and autoregressive, pretrained on about 100M clips curated from a 20M-hour video collection, to be fine-tuned into simulators for physical AI. Cosmos 3 followed in June 2026.", "開放權重的「世界基礎模型」，擴散與自迴歸兩種都有，以從 2,000 萬小時影片中篩選出的約 1 億個片段預訓練，再微調成物理 AI 的模擬器。2026 年 6 月推出 Cosmos 3。"],
          ],
        ]}
      />
      <P
        t={[
          "One trick from GameNGen shows the problem every such model shares. Fed its own frames, a generator drifts: small errors become the next step's input and grow, exactly the compounding error of rollouts. GameNGen therefore adds noise to the context frames during training, so the model learns to repair a slightly wrong past; without it, the paper reports, quality \"degrades quickly after 10-20 frames\".",
          "GameNGen 的一個技巧，點出了這類模型共同的問題。把自己生成的畫面餵回去時，生成器會漂移：小錯誤成了下一步的輸入，越滾越大，正是推演中誤差的累積。所以 GameNGen 在訓練時對作為脈絡的畫面加上雜訊，讓模型學會修補稍微出錯的過去；論文指出，沒有這一步，品質會「在 10–20 幀之後迅速下降」。",
        ]}
      />
      <p>
        <SiteLink to={["concept", "foundations", "rollouts"]} label={["Dynamics and rollouts", "動態與推演"]} />
      </p>
      <P
        t={[
          "**The demo** is the same pipeline shrunk until it fits in a table. The game is a $6\\times4$ grid with a player and a coin. A frame is cut into six $2\\times2$ patches and each patch becomes a token (the codebook holds only the patterns that occur). The generator is a table: for every (tokens, key) seen in some recorded random play, it counts which next tokens followed. Pick how much play it learned from, then press keys.",
          "**示範**是同一條流程，縮小到一張表就裝得下。遊戲是一個 $6\\times4$ 的格子，有一個玩家和一枚硬幣。每幀切成六個 $2\\times2$ 區塊，每個區塊變成一個詞元（碼本只收出現過的樣式）。生成器是一張表：對錄下的隨機遊玩中見過的每個（詞元, 按鍵），數出接著出現了哪些下一幀詞元。選擇它從多少遊玩中學習，然後按鍵。",
        ]}
      />
      <Figure
        caption={[
          "Gray: the true game. Amber: the generator, stepped on its own output; red dashed cells differ from the truth. A toy: a lookup table instead of a neural network, so it cannot generalise to a state it has not seen; real models generalise, but are least reliable in the same places.",
          "灰色：真實的遊戲。琥珀色：生成器，以自己的輸出往下推；紅色虛線格與真實不同。這是玩具：用查表代替神經網路，所以完全無法推廣到沒見過的狀態；真正的模型能推廣，但最不可靠的地方也正是這些。",
        ]}
      >
        <TinyGame />
      </Figure>
      <Py title="python/wm/tiny_game.py" code={pyRegion(tinyGameSrc, "generator")} note={["The whole generator: counting and normalising. The demo runs the same model, ported to TypeScript.", "整個生成器：計數與正規化。示範執行的是同一個模型，移植成 TypeScript。"]} />
      <P t={["What to notice:", "要注意的地方："]} />
      <List
        items={[
          [
            "**Unseen states.** With 50 steps of play, most (frame, key) pairs are missing, and the generator freezes or goes wrong as soon as you leave the part of the grid it has seen. More data covers more of the game. A neural generator replaces the table with a function that guesses between examples, which is why scale matters so much for these models.",
            "**沒見過的狀態。** 只有 50 步遊玩時，大多數（畫面, 按鍵）組合都不在表裡；你一離開它見過的那部分格子，生成器就會停住或出錯。資料越多，涵蓋的遊戲越多。神經網路生成器把表格換成能在範例之間猜測的函數，這也是規模對這類模型如此重要的原因。",
          ],
          [
            "**Hidden state.** Where the coin reappears depends on a clock the frame does not show. From frames alone the outcome is genuinely uncertain, so even a perfect frame model must give a distribution there, not one answer.",
            "**隱藏狀態。** 硬幣在哪裡重新出現，取決於畫面沒顯示的時鐘。只看畫面，結果確實不確定，所以即使是完美的畫面模型，在這裡也必須給出一個分布，而不是單一答案。",
          ],
          [
            "**Drift.** Once the generator's frame is wrong, it looks up the *wrong* row next time. \"Copy the true frame in\" resets it, as an agent with a real camera could.",
            "**漂移。** 生成器的畫面一旦錯了，下一次就會查到*錯的*那一列。「把真實畫面複製進去」可以把它拉回來，就像有真實攝影機的智能體能做的那樣。",
          ],
        ]}
      />
      <p className="flex flex-wrap items-center gap-2">
        <Evidence level="demonstrated" />
        <span>
          {pick([
            "Action-conditioned video models can stand in for a game engine (DOOM, Atari, CS:GO) and train agents. Whether video models in general learn physics rather than its look is open: see Limits.",
            "以動作為條件的影片模型能代替遊戲引擎（DOOM、Atari、CS:GO）並訓練智能體。至於影片模型是否普遍學到物理本身，而不只是它的樣子，仍未有定論：見「限制」。",
          ])}
        </span>{" "}
        <SiteLink to={["concept", "limits", "physics"]} label={["Limits", "限制"]} />
      </p>
      <Sources
        items={[
          { label: "OpenAI (2024), Video generation models as world simulators", url: "https://openai.com/index/video-generation-models-as-world-simulators/" },
          arxiv("2405.12399", "Alonso et al. (2024), Diffusion for World Modeling: Visual Details Matter in Atari (DIAMOND), NeurIPS 2024"),
          arxiv("2408.14837", "Valevski et al. (2024), Diffusion Models Are Real-Time Game Engines (GameNGen), ICLR 2025"),
          arxiv("2501.03575", "NVIDIA (2025), Cosmos World Foundation Model Platform for Physical AI"),
          { label: "NVIDIA (1 June 2026), NVIDIA Launches Cosmos 3", url: "https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Launches-Cosmos-3-the-Open-Frontier-Foundation-Model-for-Physical-AI/default.aspx" },
        ]}
      />
      <HistoryLinks ids={["sora", "game-engines", "cosmos"]} />
    </Section>
  );
}

// ---- 2. genie ---------------------------------------------------------------------------------------------------

function Genie({ n }: { n: number }) {
  const { pick } = useLang();
  return (
    <Section page={PAGE} id="genie" n={n} title={OUTLINE.sections[1].title}>
      <P
        t={[
          "GameNGen needed the keys that were pressed. The internet holds an enormous amount of game footage, but almost none of it records the keys. Google DeepMind's **Genie** (February 2024) asked: can a model work out from the video alone *which actions exist*, and then let a person press them?",
          "GameNGen 需要知道按了哪些鍵。網路上有海量的遊戲影片，但幾乎沒有一段記下了按鍵。Google DeepMind 的 **Genie**（2024 年 2 月）問：模型能不能只從影片推斷出*有哪些動作*，再讓人去按？",
        ]}
      />
      <P
        t={[
          "Genie was trained on 30,000 hours of 2-D platformer clips (filtered from over 200,000 hours of public gameplay video) at $160\\times90$ pixels and 10 frames per second. It has three parts, all built from the same spatiotemporal transformer, about 11 billion parameters in all:",
          "Genie 以 3 萬小時的 2D 平台遊戲片段訓練（從超過 20 萬小時的公開遊戲影片中篩選），解析度 $160\\times90$、每秒 10 幀。它有三個部分，都用同一種時空轉換器搭成，總共約 110 億個參數：",
        ]}
      />
      <List
        items={[
          [
            "**Video tokenizer** (about 200M parameters): a VQ-VAE that turns each frame into a grid of discrete tokens $z_t$, one per $4\\times4$ patch, from a codebook of 1024 codes.",
            "**影片詞元器**（約 2 億參數）：一個 VQ-VAE，把每幀變成一格格離散詞元 $z_t$，每個 $4\\times4$ 區塊一個，碼本有 1024 個代碼。",
          ],
          [
            "**Latent action model** (about 300M): looks at the past frames *and the next one* and must summarise the change in a single code $\\tilde a_t$ from a codebook of only $|A| = 8$. A decoder must rebuild $x_{t+1}$ from the past frames and that code alone, so the code is forced to carry what changed, and with only eight choices, the most consistent kind of change: the player's action.",
            "**潛在動作模型**（約 3 億）：看過去的畫面*以及下一幀*，必須把變化濃縮成一個代碼 $\\tilde a_t$，碼本只有 $|A| = 8$ 個。解碼器只能用過去的畫面與這個代碼重建 $x_{t+1}$，所以代碼被迫攜帶「變了什麼」；而只有八個選擇時，最一致的那種變化就是玩家的動作。",
          ],
          [
            "**Dynamics model** (about 10.1B): a MaskGIT transformer that predicts the next frame's tokens from the past tokens and latent actions.",
            "**動態模型**（約 101 億）：一個 MaskGIT 轉換器，根據過去的詞元與潛在動作預測下一幀的詞元。",
          ],
        ]}
      />
      <Pictured
        tex="\tilde a_t = \mathrm{VQ}\big(\mathrm{enc}(x_{\le t},\,x_{t+1})\big)\in\{1,\dots,8\},\qquad \mathcal L_{\text{LAM}} = \big\lVert x_{t+1}-\mathrm{dec}(x_{\le t},\,\tilde a_t)\big\rVert^2,\qquad \hat z_{t+1}\sim p_\theta(z_{t+1}\mid z_{\le t},\,\tilde a_{\le t})"
        caption={["The latent action model sees $x_t$ and $x_{t+1}$, encodes the change, and $\\mathrm{VQ}$ snaps it to the nearest of eight codebook vectors, $\\tilde a_t$. The decoder must rebuild $x_{t+1}$ from the past and that one code; what it misses is $\\mathcal L_{\\text{LAM}}$. At play time the encoder is gone and you pick the code.", "潛在動作模型看 $x_t$ 與 $x_{t+1}$，把變化編碼，再由 $\\mathrm{VQ}$ 對到八個碼本向量中最近的一個，即 $\\tilde a_t$。解碼器只能用過去的畫面與這一個代碼重建 $x_{t+1}$；重建不到的部分就是 $\\mathcal L_{\\text{LAM}}$。遊玩時編碼器不在了，由你挑代碼。"]}
      >
        <GenerativeLam />
      </Pictured>
      <P
        t={[
          "Here $\\mathrm{enc}$ and $\\mathrm{dec}$ are the latent action model's encoder and decoder, $\\mathrm{VQ}$ snaps a vector to its nearest codebook entry, and $p_\\theta$ is the dynamics model. To play, the encoder is thrown away: the person picks one of the eight codes, and Genie generates the next frame. Given a single image, even a sketch, it makes the image playable. Genie won a Best Paper award at ICML 2024.",
          "其中 $\\mathrm{enc}$ 與 $\\mathrm{dec}$ 是潛在動作模型的編碼器與解碼器，$\\mathrm{VQ}$ 把向量對到最近的碼本項目，$p_\\theta$ 是動態模型。遊玩時，編碼器被丟掉：人從八個代碼中選一個，Genie 就生成下一幀。給它一張圖——甚至是手繪草圖——它就能讓這張圖變得可以玩。Genie 獲得 ICML 2024 最佳論文獎。",
        ]}
      />
      <P
        t={[
          "The codes are useful beyond play. On the CoinRun game, the paper trained a policy to imitate an expert through the latent actions and needed only 200 labelled expert samples to map them to real keys, matching a policy trained with the true actions.",
          "這些代碼不只用來玩。在 CoinRun 遊戲上，論文透過潛在動作訓練一個模仿專家的策略，只需要 200 個有標註的專家樣本就能把它們對應到真實按鍵，表現與用真實動作訓練的策略相當。",
        ]}
      />
      <P
        t={[
          "**The demo** learns latent actions from 400 unlabelled frame pairs of the tiny game. For each pair it measures how the player-coloured pixels moved, then vector-quantises those movements with k-means into $k$ codes. **No key labels are ever given**; the true keys are kept aside only to grade the result.",
          "**示範**從小遊戲的 400 個無標籤畫面對中學出潛在動作。它對每一對測量玩家顏色的像素怎麼移動，再以 k-means 把這些移動向量量化成 $k$ 個代碼。**從頭到尾都沒有給按鍵標籤**；真正的按鍵只留在一旁，用來評分。",
        ]}
      />
      <Figure
        caption={[
          "Each code comes to mean one move. Try $k = 3$ (moves merge), $k = 8$ (spare codes stay empty), and walls on (a blocked move looks exactly like \"stay\", so it joins that code). Simplified: Genie learns its encoder; here the encoder is a fixed, hand-written measurement and only the codebook is learned.",
          "每個代碼學成代表一種移動。試試 $k = 3$（移動被併在一起）、$k = 8$（多出的代碼是空的），以及打開撞牆（被擋住的移動看起來和「不動」一模一樣，所以歸到同一個代碼）。簡化之處：Genie 的編碼器是學出來的；這裡的編碼器是固定、手寫的測量，只有碼本是學出來的。",
        ]}
      >
        <LatentAction />
      </Figure>
      <Py title="python/wm/latent_actions.py" code={pyRegion(latentSrc, "feature")} />
      <Py title="python/wm/latent_actions.py" code={pyRegion(latentSrc, "kmeans")} note={["The test checks that on clean data the five codes match the five keys up to a renaming. The demo runs the same model, ported to TypeScript.", "測試檢查：在乾淨的資料上，五個代碼在重新命名之下正好對上五個按鍵。示範執行的是同一個模型，移植成 TypeScript。"]} />
      <P
        t={[
          "**After Genie.** The line has moved from 2-D platformers to 3-D worlds, from seconds to minutes, and from a paper to a product:",
          "**Genie 之後。** 這條線從 2D 平台遊戲走到 3D 世界、從幾秒走到幾分鐘、從論文走到產品：",
        ]}
      />
      <Table
        head={[
          ["Model", "模型"],
          ["Date", "日期"],
          ["What it does (from DeepMind's announcements)", "做了什麼（依 DeepMind 的公告）"],
        ]}
        rows={[
          [["**Genie**", "**Genie**"], ["Feb 2024", "2024 年 2 月"], ["2-D platformers from one image; 8 latent actions learned from unlabelled video.", "從一張圖生成 2D 平台遊戲；從無標籤影片學出 8 個潛在動作。"]],
          [
            ["**Genie 2**", "**Genie 2**"],
            ["4 Dec 2024", "2024 年 12 月 4 日"],
            ["An autoregressive latent diffusion model: one image becomes a 3-D world playable with keyboard and mouse, consistent for up to a minute (most examples 10–20 s); it remembers parts of the world no longer in view. DeepMind's SIMA agent followed instructions inside its worlds.", "一個自迴歸潛在擴散模型：一張圖變成可用鍵盤滑鼠遊玩的 3D 世界，最多約一分鐘保持一致（多數範例 10–20 秒）；它記得已不在視野中的部分。DeepMind 的 SIMA 智能體能在它的世界裡依指示行動。"],
          ],
          [
            ["**Genie 3**", "**Genie 3**"],
            ["5 Aug 2025", "2025 年 8 月 5 日"],
            ["Worlds from a text prompt in real time at 720p and 24 frames per second, consistent for a few minutes; \"promptable world events\" change a running world by text (weather, new objects). A limited research preview.", "從文字提示即時生成世界，720p、每秒 24 幀，維持數分鐘的一致；「可提示的世界事件」用文字改變正在運行的世界（天氣、新物件）。以有限的研究預覽發布。"],
          ],
          [
            ["**Project Genie**", "**Project Genie**"],
            ["29 Jan 2026", "2026 年 1 月 29 日"],
            ["A prototype web app built on Genie 3 for Google AI Ultra subscribers in the US: sketch a world from text or an image, explore it, remix it; generations are capped at 60 seconds.", "以 Genie 3 打造、給美國 Google AI Ultra 訂閱者的網頁應用原型：用文字或圖片勾勒世界、探索它、改編它；每次生成上限 60 秒。"],
          ],
          [
            ["**Genie 4**", "**Genie 4**"],
            ["27 Oct 2026", "2026 年 10 月 27 日"],
            ["DeepMind's first real-time world model that generates audio natively (music, ambient sound, dialogue). A research preview for trusted testers, announced as coming to Project Genie and to early-access partners of the Gemini API. DeepMind notes that \"visual details and object permanence can still shift or drift over time\". No resolution, frame rate or model size was published.", "DeepMind 第一個原生生成聲音（音樂、環境音、對話）的即時世界模型。以研究預覽提供給受信任的測試者，並宣布將進入 Project Genie 與 Gemini API 的搶先體驗夥伴。DeepMind 指出「視覺細節與物體恆存性仍可能隨時間偏移或漂移」。未公布解析度、幀率或模型大小。"],
          ],
        ]}
      />
      <P
        t={[
          "**DreamerV3, the other side of the lab.** The Genie models learn a world from other people's video and are judged by how it looks and plays. DeepMind's **DreamerV3** (arXiv 2023, *Nature* April 2025) learns a world model from its *own* experience, where the actions are known, and is judged by the behaviour it learns inside it: an actor and a critic trained on imagined rollouts. With one fixed configuration it outperformed specialised methods on more than 150 tasks, and was the first algorithm to collect diamonds in Minecraft from scratch, without human data or curricula. The two lines meet in Genie 2 and 3, whose worlds are meant as training grounds for agents.",
          "**DreamerV3：實驗室的另一側。** Genie 系列從別人的影片學出世界，評判標準是它看起來、玩起來怎樣。DeepMind 的 **DreamerV3**（2023 年 arXiv，2025 年 4 月《自然》）則從*自己的*經驗學世界模型，動作是已知的；評判標準是它在模型裡學會的行為：一個在想像推演上訓練的行動者與評論者。它用一組固定設定，在超過 150 個任務上勝過專門方法，也是第一個不用人類資料或課程設計、從零開始在 Minecraft 挖到鑽石的演算法。兩條線在 Genie 2 和 3 交會：它們的世界本來就是要給智能體當訓練場的。",
        ]}
      />
      <p>
        <SiteLink to={["concept", "planning", "imagination"]} label={["Learning in imagination (Dreamer)", "在想像中學習（Dreamer）"]} />
      </p>
      <p className="flex flex-wrap items-center gap-2">
        <Evidence level="established" />
        <span>{pick(["Latent actions from unlabelled video (Genie, peer-reviewed, ICML 2024).", "從無標籤影片學出潛在動作（Genie，經同儕審查，ICML 2024）。"])}</span>
        <Evidence level="demonstrated" />
        <span>{pick(["Genie 2–4: shown in announcements and previews; no technical papers.", "Genie 2–4：在公告與預覽中展示；沒有技術論文。"])}</span>
      </p>
      <Sources
        items={[
          arxiv("2402.15391", "Bruce et al. (2024), Genie: Generative Interactive Environments, ICML 2024"),
          { label: "ICML 2024 oral: Genie (Best Paper)", url: "https://icml.cc/virtual/2024/oral/35508" },
          { label: "Google DeepMind (4 Dec 2024), Genie 2: A large-scale foundation world model", url: "https://deepmind.google/discover/blog/genie-2-a-large-scale-foundation-world-model/" },
          { label: "Google DeepMind (5 Aug 2025), Genie 3: A new frontier for world models", url: "https://deepmind.google/discover/blog/genie-3-a-new-frontier-for-world-models/" },
          { label: "Google (29 Jan 2026), Project Genie", url: "https://blog.google/innovation-and-ai/models-and-research/google-deepmind/project-genie/" },
          { label: "Google DeepMind (27 Oct 2026), Genie 4: A new generation of world simulation", url: "https://deepmind.google/blog/genie-4-a-new-generation-of-world-simulation/" },
          { label: "Hafner et al. (2025), Mastering diverse control tasks through world models, Nature 640", url: "https://doi.org/10.1038/s41586-025-08744-2" },
        ]}
      />
      <HistoryLinks ids={["genie", "genie-2", "genie-3", "dreamerv3"]} />
    </Section>
  );
}

// ---- 3. world-labs -----------------------------------------------------------------------------------------------

function WorldLabs({ n }: { n: number }) {
  const { pick } = useLang();
  return (
    <Section page={PAGE} id="world-labs" n={n} title={OUTLINE.sections[2].title}>
      <P
        t={[
          "In 2009 Fei-Fei Li and her colleagues published **ImageNet**, a database of millions of labelled photographs. In 2012 a deep network, AlexNet, won its challenge with a top-5 error of 15.3% against 26.2% for the next entry, and deep learning took over computer vision. Naming what is in a picture, Li has argued since, is not understanding a world. An agent that acts needs **spatial intelligence**: knowing where things are in 3-D, how they would look from elsewhere, and what happens when they are moved.",
          "2009 年，李飛飛與同事發表 **ImageNet**：一個有數百萬張標註照片的資料庫。2012 年，一個深度網路 AlexNet 以 15.3% 的 top-5 錯誤率贏得它的挑戰賽，第二名是 26.2%，深度學習從此主導電腦視覺。李飛飛後來一再主張，說出圖裡有什麼並不等於理解一個世界。會行動的智能體需要**空間智能**：知道東西在三維空間的哪裡、從別處看會是什麼樣子、被移動後會發生什麼。",
        ]}
      />
      <P
        t={[
          "In her November 2025 essay *From Words to Worlds*, she lists three things a world model must do: be **generative** (\"generate worlds with perceptual, geometrical, and physical consistency\"), **multimodal** (\"multimodal by design\") and **interactive** (\"output the next states based on input actions\").",
          "在 2025 年 11 月的文章〈從文字到世界〉（*From Words to Worlds*）中，她列出世界模型必須具備的三件事：**生成**（「生成在感知、幾何與物理上一致的世界」）、**多模態**（「天生就是多模態」）與**互動**（「根據輸入的動作輸出下一個狀態」）。",
        ]}
      />
      <P
        t={[
          "**World Labs**, the company she co-founded with Justin Johnson, Christoph Lassner and Ben Mildenhall (the first author of NeRF), came out of stealth in September 2024. Its releases trace two answers to one question: *where does the world live between two frames?*",
          "**World Labs** 是她與賈斯汀·強森、克里斯多夫·拉斯納和 NeRF 第一作者班·米爾登霍爾共同創辦的公司，在 2024 年 9 月公開亮相。它的各次發布，對同一個問題給出了兩種答案：*在兩幀之間，世界存在哪裡？*",
        ]}
      />
      <List
        items={[
          [
            "**Generating Worlds** (2 Dec 2024): a first preview of \"persistent, navigable 3D worlds you can explore in your browser\", each made from a single image.",
            "**Generating Worlds**（2024 年 12 月 2 日）：第一個預覽，「可以在瀏覽器中探索的、持久且可漫遊的三維世界」，每個都由單一張圖片生成。",
          ],
          [
            "**RTFM**, the Real-Time Frame Model (16 Oct 2025): \"an autoregressive diffusion transformer operating on sequences of frames\" that generates the view as you move, on a single H100 GPU. It builds no explicit 3-D geometry; World Labs calls it \"a learned renderer\". Its memory is the frames themselves: each generated frame is stored with its **pose** (position and orientation), and RTFM \"uses posed frames as a spatial memory\", drawing on the frames near the place being generated. So, in World Labs' words, \"the world will never be forgotten\".",
            "**RTFM**，即時幀模型（2025 年 10 月 16 日）：「作用在幀序列上的自迴歸擴散轉換器」，隨著你移動生成視野，只用一張 H100 GPU。它不建立明確的三維幾何；World Labs 稱它為「學習式渲染器」。它的記憶就是那些畫面本身：每個生成的畫面都連同**姿態**（位置與方向）一起存下，RTFM「把帶姿態的畫面當作空間記憶」，生成某處時取用那附近的畫面。因此用 World Labs 的話說，「世界永遠不會被遺忘」。",
          ],
          [
            "**Marble** (beta 16 Sep 2025; launched 12 Nov 2025): makes 3-D worlds \"from text, images, video, or coarse 3D layouts\", with tools to edit and expand them (Chisel sculpts a world's layout directly in 3-D). A world can be \"exported as Gaussian splats, meshes, or videos\". Here the world lives in an explicit 3-D scene that any renderer can draw.",
            "**Marble**（2025 年 9 月 16 日測試版；2025 年 11 月 12 日正式推出）：「從文字、圖片、影片或粗略的三維配置」生成三維世界，並提供編輯與擴展的工具（Chisel 直接在三維中塑造世界的配置）。世界可以「匯出為高斯潑濺、網格或影片」。這時世界存在於一個任何渲染器都能畫的明確三維場景中。",
          ],
        ]}
      />
      <P
        t={[
          "So there are three ways to keep a generated world. A frame model with a **short context** (the toy below, and in spirit any model that sees only its last frames) forgets what has left the view and must re-invent it. A frame model with **posed-frame memory** (RTFM) keeps old frames and looks them up by where the camera is. An **explicit 3-D scene** (Marble's splats) stores the world itself, so going back is just rendering it again.",
          "所以保存一個生成的世界有三種方式。**脈絡很短**的畫面模型（下面的玩具，以及精神上任何只看最近幾幀的模型）會忘記離開視野的東西，只好重新發明。有**帶姿態畫面記憶**的畫面模型（RTFM）保留舊畫面，依相機所在位置去查。**明確的三維場景**（Marble 的潑濺）存的是世界本身，所以回頭看只是再渲染一次。",
        ]}
      />
      <Figure
        caption={[
          "The same small round world, kept two ways. Turn 180° away and back: with a short memory, (a) has re-invented the place (red outlines); raise the memory and it remembers. (b) is a fixed set of splats, so it cannot change. Simplified: one row of columns instead of an image, a camera that only turns, and a hand-made scene instead of a generated one; (a) also invents new places, so beyond the first view (a) and (b) need not agree.",
          "同一個小小的圓形世界，用兩種方式保存。轉開 180° 再轉回來：記憶短時，(a) 已經把那個地方重新發明了（紅框）；把記憶調大，它就記得。(b) 是一組固定的潑濺，所以不會變。簡化之處：只有一排欄而不是整張圖、相機只會轉向、場景是手做的而不是生成的；(a) 也會發明新地方，所以在第一個視野之外，(a) 與 (b) 不必一致。",
        ]}
      >
        <Persistence />
      </Figure>
      <Py title="python/wm/persistence.py" code={pyRegion(persistenceSrc, "framestep")} />
      <Py title="python/wm/persistence.py" code={pyRegion(persistenceSrc, "project")} note={["(b) is a pure function of the camera: the same yaw always gives the same view. The demo runs the same model, ported to TypeScript.", "(b) 是相機的純函數：同一個偏航角永遠給出同一個視野。示範執行的是同一個模型，移植成 TypeScript。"]} />
      <Table
        head={[
          ["", ""],
          ["What is stored", "存了什麼"],
          ["Coming back", "回頭看"],
          ["Trade-off", "取捨"],
        ]}
        rows={[
          [["Frames, short context", "畫面，短脈絡"], ["the last few frames", "最近幾幀"], ["re-invented, may change", "重新發明，可能改變"], ["cheap; anything can happen, including what should not", "便宜；什麼都可能發生，包括不該發生的"]],
          [["Posed frames (RTFM)", "帶姿態的畫面（RTFM）"], ["every frame with its camera pose", "每一幀及其相機姿態"], ["recalled from nearby frames", "從附近的畫面回想"], ["memory grows with exploration; still generated, not measured", "記憶隨探索增長；仍是生成的，不是量測的"]],
          [["Explicit 3-D (Marble)", "明確三維（Marble）"], ["splats or a mesh", "潑濺或網格"], ["the same, by construction", "必然相同"], ["fixed until edited; dynamics must be added separately", "編輯前固定不變；動態要另外加上"]],
        ]}
      />
      <P
        t={[
          "A Marble world is a 3-D Gaussian splatting scene, the representation the next page builds from the ground up:",
          "一個 Marble 世界就是一個三維高斯潑濺場景，也就是下一頁從頭建起的表示法：",
        ]}
      />
      <p>
        <SiteLink to={["concept", "scenes", "gaussians"]} label={["3D Gaussian splatting", "三維高斯潑濺"]} />
      </p>
      <Callout kind="note" title={["World Labs in 2026", "2026 年的 World Labs"]}>
        <List
          items={[
            ["**21 Jan**: the World API, which returns \"a fully navigable 3D environment\" from text, images or panoramas.", "**1 月 21 日**：World API，從文字、圖片或全景圖回傳「完全可漫遊的三維環境」。"],
            ["**18 Feb**: $1 billion in new funding.", "**2 月 18 日**：10 億美元新資金。"],
            [
              "**1 Sep**: **Atlas**, \"an omni model\" pretrained from scratch on text, images, video and 3-D, \"a multimodal autoregressive diffusion transformer\". It outputs up to a minute of 1440p video with camera control, and worlds \"as point clouds or 3D Gaussian splats\", \"the same representation used in Marble\".",
              "**9 月 1 日**：**Atlas**，從零開始以文字、圖片、影片與三維資料預訓練的「全能模型」，是「多模態自迴歸擴散轉換器」。它能輸出最長一分鐘、1440p、可控制相機的影片，以及「點雲或三維高斯潑濺」形式的世界，「與 Marble 使用的表示法相同」。",
            ],
            ["**28 Sep**: World Labs \"signed a definitive agreement to join AMD\", expected to close by the end of 2026.", "**9 月 28 日**：World Labs「簽署了加入 AMD 的最終協議」，預計在 2026 年底前完成。"],
          ]}
        />
        <p className="text-xs">{pick(["Company announcements, as of November 2026.", "公司公告，截至 2026 年 11 月。"])}</p>
      </Callout>
      <p className="flex flex-wrap items-center gap-2">
        <Evidence level="demonstrated" />
        <span>{pick(["Generated worlds that persist (RTFM, Marble, Atlas): shown in products and announcements, not yet in peer-reviewed papers.", "能持續存在的生成世界（RTFM、Marble、Atlas）：在產品與公告中展示，尚未見於同儕審查論文。"])}</span>
      </p>
      <Sources
        items={[
          { label: "Deng et al. (2009), ImageNet: A large-scale hierarchical image database, CVPR", url: "https://doi.org/10.1109/CVPR.2009.5206848" },
          { label: "Krizhevsky, Sutskever & Hinton (2012), ImageNet Classification with Deep Convolutional Neural Networks", url: "https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html" },
          { label: "Fei-Fei Li (10 Nov 2025), From Words to Worlds: Spatial Intelligence is AI's Next Frontier", url: "https://drfeifei.substack.com/p/from-words-to-worlds-spatial-intelligence" },
          { label: "World Labs, About", url: "https://www.worldlabs.ai/about" },
          { label: "World Labs (2 Dec 2024), Generating Worlds", url: "https://www.worldlabs.ai/blog/generating-worlds" },
          { label: "World Labs (16 Oct 2025), RTFM: A Real-Time Frame Model", url: "https://www.worldlabs.ai/blog/rtfm" },
          { label: "World Labs (16 Sep 2025), Generating Bigger and Better Worlds (Marble beta)", url: "https://www.worldlabs.ai/blog/bigger-better-worlds" },
          { label: "World Labs (12 Nov 2025), Marble: A Multimodal World Model", url: "https://www.worldlabs.ai/blog/marble-world-model" },
          { label: "World Labs (21 Jan 2026), Announcing the World API", url: "https://www.worldlabs.ai/blog/announcing-the-world-api" },
          { label: "World Labs (18 Feb 2026), Funding", url: "https://www.worldlabs.ai/blog/funding-2026" },
          { label: "World Labs (1 Sep 2026), Atlas: A World Model for Spatial Intelligence", url: "https://www.worldlabs.ai/blog/atlas" },
          { label: "World Labs (28 Sep 2026), World Labs is joining AMD", url: "https://www.worldlabs.ai/blog/amd-announcement" },
        ]}
      />
      <HistoryLinks ids={["imagenet", "world-labs", "rtfm", "marble"]} />
    </Section>
  );
}

export default function Generative({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <AsOf />
      <Video n={1} />
      <Genie n={2} />
      <WorldLabs n={3} />
    </Page>
  );
}
