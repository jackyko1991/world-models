/** Concepts ▸ Latent spaces (#/concept/representation[/compress|jepa]): compress with a VAE, or predict in representation space. */
import { CONCEPT_OUTLINES } from "../../curriculum.ts";
import JepaCollapse from "../../demos/JepaCollapse.tsx";
import { LatentInterpolation, LatentMapExplorer } from "../../demos/LatentMap.tsx";
import jepaSrc from "../../../python/wm/jepa_toy.py?raw";
import latentSrc from "../../../python/wm/latent_map.py?raw";
import RepresentationJepa from "../../demos/pictures/RepresentationJepa.tsx";
import RepresentationVae from "../../demos/pictures/RepresentationVae.tsx";
import RepresentationVicreg from "../../demos/pictures/RepresentationVicreg.tsx";
import { Callout, Evidence, Figure, HistoryLinks, List, P, Page, Pictured, Py, pyRegion, Section, SiteLink, Sources, Table } from "../kit.tsx";

const OUTLINE = CONCEPT_OUTLINES.find((o) => o.id === "representation")!;
const PAGE = "representation";


const arxiv = (id: string, label: string) => ({ label: `${label} (arXiv:${id})`, url: `https://arxiv.org/abs/${id}` });

function Compress({ n }: { n: number }) {
  return (
    <Section page={PAGE} id="compress" n={n} title={OUTLINE.sections[0].title}>
      <P
        t={[
          "A frame of a game is a grid of pixels, but the game itself may have only a few numbers of state. In the toy below, every frame is $16 \\times 16 = 256$ pixels, yet all that ever changes is where the ball is: two numbers. A model that predicts the next 256 pixels has to learn, over and over, that pixels belong together in a disc. A model that first finds the two numbers can predict two numbers instead.",
          "遊戲的一個畫面是一格格像素，但遊戲本身的狀態可能只有幾個數字。在下面的玩具裡，每個畫面有 $16 \\times 16 = 256$ 個像素，可是真正會變的只有球的位置：兩個數字。一個預測下一幀 256 個像素的模型，得一再學到「這些像素會一起組成圓盤」；先找出那兩個數字的模型，則只要預測兩個數字。",
        ]}
      />
      <P
        t={[
          "**Autoencoder.** An *encoder* $e$ maps a frame $x$ to a short code $z = e(x)$, and a *decoder* $d$ maps the code back to a frame. Both are trained so that $d(e(x)) \\approx x$. The bottleneck forces the code to keep what is needed to redraw the frame. What a plain autoencoder does not promise is that the space of codes is *usable*: codes of similar frames may lie far apart, and the gaps between codes may decode to nonsense.",
          "**自編碼器。** *編碼器* $e$ 把畫面 $x$ 映射成短碼 $z = e(x)$，*解碼器* $d$ 再把短碼還原成畫面。兩者一起訓練，讓 $d(e(x)) \\approx x$。瓶頸逼使短碼保留重畫畫面所需的資訊。但一般的自編碼器並不保證短碼所在的空間*好用*：相似畫面的短碼可能相隔很遠，短碼之間的空隙解碼出來也可能是一團亂。",
        ]}
      />
      <P
        t={[
          "**Variational autoencoder (VAE).** Kingma and Welling's fix is to make the encoder output a *distribution*: a mean $\\mu(x)$ and a standard deviation $\\sigma(x)$ per latent dimension, so $q(z \\mid x) = \\mathcal N(\\mu(x), \\operatorname{diag}\\sigma(x)^2)$. Training minimises, for each frame,",
          "**變分自編碼器（VAE）。** Kingma 與 Welling 的辦法是讓編碼器輸出一個*分布*：每個潛在維度一個平均值 $\\mu(x)$ 和一個標準差 $\\sigma(x)$，即 $q(z \\mid x) = \\mathcal N(\\mu(x), \\operatorname{diag}\\sigma(x)^2)$。訓練時對每個畫面最小化",
        ]}
      />
      <Pictured tex={"\\mathcal L(x) = \\underbrace{\\mathbb E_{z \\sim q(z\\mid x)}\\big[-\\log p(x \\mid z)\\big]}_{\\text{reconstruction}} + \\underbrace{\\mathrm{KL}\\big(q(z \\mid x)\\,\\|\\,\\mathcal N(0, I)\\big)}_{\\text{keep codes near the prior}}, \\qquad \\mathrm{KL} = \\tfrac12 \\sum_j \\big(\\mu_j^2 + \\sigma_j^2 - \\log \\sigma_j^2 - 1\\big)."} caption={["The encoder squeezes the frame $x$ to a small Gaussian $(\\mu, \\sigma)$ in the latent plane, and $z = \\mu + \\sigma \\odot \\varepsilon$ is one draw from it. The decoder redraws the frame from $z$: the reconstruction term is the gap between $x$ and $\\hat x$, and the KL term pulls the small Gaussian towards the dashed unit circle $\\mathcal N(0, I)$. A drawing, not a trained model.", "編碼器把畫面 $x$ 壓成潛在平面中的一個小高斯 $(\\mu, \\sigma)$，$z = \\mu + \\sigma \\odot \\varepsilon$ 是從中抽出的一個樣本。解碼器從 $z$ 重畫畫面：重建項是 $x$ 與 $\\hat x$ 之間的差距，KL 項則把小高斯拉向虛線單位圓 $\\mathcal N(0, I)$。這是示意圖，不是訓練出的模型。"]}>
        <RepresentationVae />
      </Pictured>
      <P
        t={[
          "Here $p(x \\mid z)$ is the decoder read as a probability of the frame (for pixels in $[0, 1]$, a Bernoulli per pixel, so $-\\log p$ is the binary cross-entropy). The KL term pulls every frame's cloud of codes towards a standard normal, so the codes pack into one region without gaps, and any point in that region decodes to something plausible. The sum is the negative of the *evidence lower bound* (ELBO) on $\\log p(x)$.",
          "這裡 $p(x \\mid z)$ 是把解碼器看成畫面的機率（像素在 $[0, 1]$ 時，每個像素用一個伯努利分布，$-\\log p$ 就是二元交叉熵）。KL 項把每個畫面的短碼雲拉向標準常態分布，於是短碼緊密地擠在同一區域、沒有空隙，區域裡任何一點解碼出來都像樣。兩項之和是 $\\log p(x)$ 的*證據下界*（ELBO）的負值。",
        ]}
      />
      <P
        t={[
          "**The reparameterisation trick.** Sampling $z \\sim q(z \\mid x)$ is not differentiable with respect to $\\mu$ and $\\sigma$. Writing the sample as $z = \\mu(x) + \\sigma(x) \\odot \\varepsilon$ with $\\varepsilon \\sim \\mathcal N(0, I)$ moves the randomness into $\\varepsilon$, so gradients flow through $\\mu$ and $\\sigma$ to the encoder by ordinary backpropagation.",
          "**重新參數化技巧。** 從 $q(z \\mid x)$ 取樣 $z$ 這一步對 $\\mu$ 和 $\\sigma$ 不可微分。把樣本寫成 $z = \\mu(x) + \\sigma(x) \\odot \\varepsilon$，其中 $\\varepsilon \\sim \\mathcal N(0, I)$，隨機性就搬到了 $\\varepsilon$ 身上，梯度可以用一般的反向傳播經過 $\\mu$ 和 $\\sigma$ 傳回編碼器。",
        ]}
      />
      <P
        t={[
          "**V, M and C.** Ha and Schmidhuber's *World Models* (2018) built an agent around exactly this. **V** (vision) is a VAE that turns each frame into a short $z_t$ (32 numbers in their car-racing experiment). **M** (memory) is a recurrent network that predicts a distribution over the next $z_{t+1}$ from $z_t$, the action $a_t$ and its hidden state $h_t$: the world model proper, working entirely in latent space. **C** (controller) is a deliberately tiny linear map from $[z_t, h_t]$ to the action. Because V and M carry the knowledge of the world, C can be small enough to train by evolution, and even inside M's own \"dream\".",
          "**V、M 與 C。** Ha 與 Schmidhuber 的 *World Models*（2018）正是圍繞這個想法建構智能體。**V**（視覺）是一個 VAE，把每一幀變成短短的 $z_t$（在他們的賽車實驗中是 32 個數字）。**M**（記憶）是一個遞迴網路，從 $z_t$、動作 $a_t$ 和它的隱藏狀態 $h_t$ 預測下一個 $z_{t+1}$ 的分布：這才是真正的世界模型，而且完全在潛在空間中運作。**C**（控制器）刻意做成一個很小的線性映射，從 $[z_t, h_t]$ 到動作。由於關於世界的知識都在 V 和 M 裡，C 小到可以用演化演算法訓練，甚至能在 M 自己的「夢」裡訓練。",
        ]}
      />
      <Figure
        caption={[
          "A VAE with a **2-D latent**, trained offline on 6,000 frames of a ball at random positions in a $16 \\times 16$ box. Each dot is the encoder's mean $\\mu(x)$ for one of 400 other frames, coloured by the ball's true $x$ or $y$. Drag the amber cross (or focus the map and use the arrow keys): the decoder turns that point into a frame. Dashed circles: one and two standard deviations of the prior. A toy: one object, no background, two true factors, and a latent made exactly as large as the truth.",
          "一個**二維潛在空間**的 VAE，事先以 6,000 個畫面離線訓練：一顆球隨機落在 $16 \\times 16$ 的框中。每一點是另外 400 個畫面之一的編碼器平均值 $\\mu(x)$，依球真正的 $x$ 或 $y$ 上色。拖動琥珀色十字（或選取地圖後用方向鍵）：解碼器把那一點變成畫面。虛線圓是先驗的一倍與兩倍標準差。這是玩具：只有一個物體、沒有背景、只有兩個真實因子，而且潛在空間剛好和真實因子一樣大。",
        ]}
      >
        <LatentMapExplorer />
      </Figure>
      <P
        t={[
          "**What to notice.** Colour the points by the ball's $x$, then by its $y$: one latent axis follows each, so moving the cross along an axis slides the ball along one direction of the box. Nobody told the VAE that the frames have two causes; it found a two-number description because that is the cheapest way to redraw them. Then take the cross out past the dashed circles, where no training frame landed: the decoder still answers, but with a squashed or smeared ball. A latent space is only as good as the region the data covers.",
          "**值得注意的地方。** 先依球的 $x$ 上色，再依 $y$ 上色：每一條潛在軸各自對應一個，所以沿著一條軸移動十字，球就沿著框的一個方向滑動。沒有人告訴 VAE 這些畫面有兩個成因；它找到兩個數字的描述，因為那是重畫它們最省的方法。接著把十字移到虛線圓之外、沒有訓練畫面落腳的地方：解碼器仍會回答，但球被壓扁或抹開。潛在空間只在資料涵蓋的範圍內可靠。",
        ]}
      />
      <Callout kind="note" title={["The axes are not guaranteed", "座標軸不是保證的"]}>
        <P
          t={[
            "Here the two latent axes line up with $x$ and $y$, which makes the map easy to read. That is luck plus a very simple world: Locatello et al. (2019) showed that unsupervised learning of such *disentangled* axes is impossible without inductive biases on both the models and the data, so it cannot be relied on in general. A world model does not need nameable axes, only a code from which the future is predictable.",
            "這裡兩條潛在軸剛好對齊 $x$ 和 $y$，地圖因此很好讀。這是運氣加上一個非常簡單的世界：Locatello 等人（2019）證明，若模型與資料都沒有歸納偏置，非監督地學到這種*解耦*的軸是不可能的，所以一般而言不能指望它。世界模型並不需要叫得出名字的軸，只需要一個能預測未來的編碼。",
          ]}
        />
      </Callout>
      <P
        t={[
          "**Pixel interpolation against latent interpolation.** To go from frame $A$ to frame $B$, one can cross-fade the pixels, $(1-t)A + tB$, or walk the straight line between the codes and decode, $d\\big((1-t)z_A + t z_B\\big)$. The first never shows a ball in between; it shows two faint balls. The second moves one ball.",
          "**像素內插與潛在內插。** 從畫面 $A$ 走到畫面 $B$，可以把像素交叉淡入淡出，$(1-t)A + tB$；也可以沿著兩個短碼之間的直線走，再解碼，$d\\big((1-t)z_A + t z_B\\big)$。前者在中途從來不會出現一顆球，而是兩顆淡淡的球；後者則是一顆球在移動。",
        ]}
      />
      <Figure
        caption={[
          "Seven steps from $A$ (left) to $B$ (right). Gray: pixels cross-faded. Amber: codes interpolated and decoded by the same VAE. Halfway, the pixel row has two half-bright balls; the latent row has one full ball at a position in between.",
          "從 $A$（左）到 $B$（右）分七步。灰色：像素交叉淡化。琥珀色：同一個 VAE 的短碼內插後再解碼。走到一半時，像素那一列是兩顆半亮的球；潛在那一列是一顆完整的球，位置在兩者之間。",
        ]}
      >
        <LatentInterpolation />
      </Figure>
      <P
        t={[
          "This is the practical reason world models predict in latent space: a step of dynamics in a good code is a small, smooth move, while the same step in pixels is a scattered pattern of changes. The decoder is a three-layer network, nothing but matrix products. Here it is in numpy; the demo runs the same model, ported to TypeScript, in your browser:",
          "這就是世界模型在潛在空間中預測的實際理由：在好的編碼裡，動態的一步是一個小而平滑的移動；同樣一步在像素上卻是零散的一堆變化。解碼器是一個三層網路，只用到矩陣乘法。下面是它的 numpy 版本；示範在你的瀏覽器裡執行的是同一個模型，移植成 TypeScript：",
        ]}
      />
      <Py
        title="python/wm/latent_map.py"
        code={pyRegion(latentSrc, "decode")}
        note={[
          "Weights from `scripts/latent_map.py` (PyTorch, fixed seed, CPU), read from `public/models/latent-map.json`; a test checks this function reproduces the script's own decodes to within $10^{-5}$, and that the TypeScript port agrees with it.",
          "權重來自 `scripts/latent_map.py`（PyTorch、固定種子、CPU），讀自 `public/models/latent-map.json`；有測試確認這個函式與腳本自己的解碼結果相差小於 $10^{-5}$，而且 TypeScript 移植版與它一致。",
        ]}
      />
      <Callout kind="tip" title={["What is lost", "失去了什麼"]}>
        <P
          t={[
            "The code keeps what the reconstruction loss rewards. Every pixel counts equally there, so a VAE spends capacity on large, bright, predictable things and tends to blur or drop small ones, whether or not they matter for the task. Ha and Schmidhuber note this: their V, trained on its own, may encode parts of a frame the task does not need, and in car racing it failed to reproduce road tiles the task did need. The next section asks whether reconstructing pixels should be the goal at all.",
            "短碼保留的是重建損失所獎勵的東西。在重建損失中每個像素同等重要，所以 VAE 會把容量花在大、亮、可預測的東西上，小東西則容易被模糊或丟掉，不論它們對任務是否重要。Ha 與 Schmidhuber 也指出這一點：他們的 V 單獨訓練，可能編碼了任務不需要的部分；在賽車任務中，它也沒能重現任務需要的路面圖塊。下一節要問的是：重建像素究竟該不該是目標。",
          ]}
        />
      </Callout>
      <Sources
        items={[
          arxiv("1312.6114", "Kingma & Welling (2013), Auto-Encoding Variational Bayes"),
          arxiv("1803.10122", "Ha & Schmidhuber (2018), World Models"),
          { label: "worldmodels.github.io (interactive article)", url: "https://worldmodels.github.io/" },
          arxiv("1811.12359", "Locatello et al. (2019), Challenging Common Assumptions in the Unsupervised Learning of Disentangled Representations"),
        ]}
      />
      <HistoryLinks ids={["schmidhuber-1990", "world-models"]} />
    </Section>
  );
}

function Jepa({ n }: { n: number }) {
  return (
    <Section page={PAGE} id="jepa" n={n} title={OUTLINE.sections[1].title}>
      <P
        t={[
          "Point a camera at a tree in the wind and ask a model for the next second of video. The trunk will stay put, the branches will sway; the exact position of every leaf is, for practical purposes, unpredictable. A model trained to predict pixels with a squared error does the best it can with an unpredictable thing: it predicts the average, which is a blur. Worse, it spends its capacity trying.",
          "把攝影機對準一棵在風中的樹，請模型預測下一秒的影片。樹幹不會動，樹枝會搖；但每一片葉子的確切位置，實際上無法預測。用平方誤差訓練來預測像素的模型，面對無法預測的東西只能盡力而為：它預測平均值，也就是一團模糊。更糟的是，它還把容量花在這上面。",
        ]}
      />
      <P
        t={[
          "**LeCun's argument (2022).** In *A Path Towards Autonomous Machine Intelligence*, Yann LeCun put a world model at the centre of an agent and argued that it should predict in **representation space**. Encode both the present $x$ and the future $y$, $s_x = \\mathrm{Enc}(x)$ and $s_y = \\mathrm{Enc}(y)$, and train a predictor to map one to the other. The encoder is then free to leave out what cannot be predicted, the leaves, and keep what can, the trunk. He called this a **Joint-Embedding Predictive Architecture (JEPA)**, and scored a pair by an energy",
          "**LeCun 的主張（2022）。** 在《通往自主機器智能之路》中，楊立昆把世界模型放在智能體的中心，並主張它應該在**表示空間**中預測。把現在 $x$ 和未來 $y$ 都編碼，$s_x = \\mathrm{Enc}(x)$、$s_y = \\mathrm{Enc}(y)$，再訓練一個預測器把前者映射到後者。這樣編碼器就可以捨去無法預測的部分（葉子），保留可以預測的部分（樹幹）。他稱之為**聯合嵌入預測架構（JEPA）**，並用一個能量為一對資料打分數：",
        ]}
      />
      <Pictured tex={"E(x, y) = D\\big(s_y,\\; \\mathrm{Pred}(s_x, z)\\big),"} caption={["The leaves differ between $x$ and $y$, the trunk does not. Both views are encoded; from $s_x$ the predictor, with the latent $z$, lands on $\\hat s_y$, and the energy is the distance $D$ to the target $s_y$, measured in representation space, never in pixels.", "$x$ 與 $y$ 的葉子不同，樹幹相同。兩個畫面都被編碼；預測器從 $s_x$ 出發，加上潛在變數 $z$，落在 $\\hat s_y$，能量就是它到目標 $s_y$ 的距離 $D$——在表示空間中量，而不是在像素上量。"]}>
        <RepresentationJepa />
      </Pictured>
      <P
        t={[
          "where $D$ is a distance and $z$ is an optional latent variable for what $x$ alone cannot settle (which way the branch will swing). Training lowers $E$ on real pairs.",
          "其中 $D$ 是一個距離，$z$ 是一個可選的潛在變數，代表只看 $x$ 決定不了的東西（樹枝會往哪邊擺）。訓練時讓真實配對的 $E$ 變低。",
        ]}
      />
      <Table
        head={[
          ["", ""],
          ["Reconstruct (VAE, video generators)", "重建（VAE、影片生成模型）"],
          ["Predict a representation (JEPA)", "預測表示（JEPA）"],
        ]}
        rows={[
          [
            ["Target", "目標"],
            ["every pixel of $y$", "$y$ 的每一個像素"],
            ["the embedding $s_y$", "嵌入 $s_y$"],
          ],
          [
            ["Unpredictable detail", "無法預測的細節"],
            ["must be modelled, or averaged into blur", "必須建模，否則被平均成模糊"],
            ["may be dropped by the encoder", "可以被編碼器捨去"],
          ],
          [
            ["Can produce a picture", "能產生畫面嗎"],
            ["yes", "可以"],
            ["not by itself (needs a separate decoder)", "本身不行（需另外的解碼器）"],
          ],
          [
            ["Trivial solution", "平凡解"],
            ["none: the pixels are fixed", "沒有：像素是固定的"],
            ["**collapse**: a constant encoder predicts perfectly", "**塌縮**：常數編碼器能完美預測"],
          ],
        ]}
      />
      <P
        t={[
          "**Collapse.** The last row is the catch. If the target is itself an output of the network, the network can make the task easy by making the target boring: map every input to the same vector, and the predictor is never wrong. The loss is zero and the representation is useless. Every joint-embedding method needs something that rules this out. Contrastive methods push apart the embeddings of different inputs (negatives); the methods below avoid negatives.",
          "**塌縮。** 表格最後一列正是麻煩所在。如果目標本身就是網路的輸出，網路可以把目標變得無聊來讓任務變簡單：把每個輸入都映射到同一個向量，預測器就永遠不會錯。損失為零，表示卻毫無用處。每一種聯合嵌入方法都需要某種機制排除這種解。對比式方法把不同輸入的嵌入推開（負樣本）；下面的方法則不用負樣本。",
        ]}
      />
      <List
        items={[
          [
            "**Stop-gradient and an EMA target** (BYOL, 2020; used by I-JEPA and V-JEPA). The target $s_y$ comes from a *target encoder* whose weights are not trained by gradient but follow the online encoder as an exponential moving average, $\\bar\\theta \\leftarrow \\tau\\bar\\theta + (1-\\tau)\\theta$ with $\\tau$ close to 1. Only the online branch and the predictor get gradients. Why this asymmetry avoids collapse is subtle; Tian et al. (2021) analysed it for linear networks.",
            "**停止梯度與 EMA 目標**（BYOL，2020；I-JEPA 與 V-JEPA 也採用）。目標 $s_y$ 來自一個*目標編碼器*，它的權重不經梯度訓練，而是以指數移動平均跟隨線上編碼器：$\\bar\\theta \\leftarrow \\tau\\bar\\theta + (1-\\tau)\\theta$，$\\tau$ 接近 1。只有線上分支和預測器會收到梯度。這種不對稱為什麼能避免塌縮並不簡單；Tian 等人（2021）在線性網路上分析過它。",
          ],
          [
            "**Variance and covariance terms** (VICReg, 2021). Add to the loss a hinge that keeps the standard deviation of every embedding dimension, across a batch, above a target $\\gamma$, and a penalty on the off-diagonal entries of the embeddings' covariance matrix $C$, so the dimensions carry different information:",
            "**變異數與共變異數項**（VICReg，2021）。在損失中加上一個鉸鏈項，讓每個嵌入維度在一批資料上的標準差保持在目標 $\\gamma$ 之上；再加上一個懲罰嵌入共變異數矩陣 $C$ 非對角元素的項，讓各維度攜帶不同的資訊：",
          ],
        ]}
      />
      <Pictured tex={"v(Z) = \\sum_{j} \\max\\!\\big(0,\\; \\gamma - \\sqrt{\\operatorname{Var}(z_j) + \\epsilon}\\big), \\qquad c(Z) = \\frac{1}{d} \\sum_{i \\ne j} C_{ij}^2 ."} caption={["Left: a collapsed batch. Each dimension's standard deviation falls short of $\\gamma$, and the shaded shortfall is what $v(Z)$ adds up; the streak is tilted because $z_1$ and $z_2$ copy each other, a large $C_{12}$ for $c(Z)$. Right: a spread batch, where both terms are about zero. Toy points.", "左：塌縮的一批嵌入。每個維度的標準差都不到 $\\gamma$，著色的不足部分就是 $v(Z)$ 加總的量；這道斜線之所以傾斜，是因為 $z_1$ 與 $z_2$ 互相複製，$c(Z)$ 會看到很大的 $C_{12}$。右：散開的一批，兩項都約為零。點是示意用的。"]}>
        <RepresentationVicreg />
      </Pictured>
      <P
        t={[
          "**The family.** **I-JEPA** (2023) takes one image, encodes a large visible *context* block, and predicts the target encoder's representations of several hidden *target* blocks of the same image, with an EMA target encoder and no hand-crafted augmentations. **V-JEPA** (2024) does the same for video: mask regions across space and time and predict their features; it was trained on about 2 million public videos with no text, no negatives and no pixel reconstruction. **V-JEPA 2** (June 2025) scaled this to over a million hours of internet video, then froze the encoder and trained an action-conditioned predictor, **V-JEPA 2-AC**, on under 62 hours of unlabelled robot video from the DROID dataset.",
          "**這個家族。** **I-JEPA**（2023）拿一張影像，編碼一大塊可見的*情境*區塊，去預測目標編碼器對同一張影像中幾個被遮住的*目標*區塊的表示；目標編碼器用 EMA，而且不用人工設計的資料增強。**V-JEPA**（2024）把同樣做法用在影片上：遮住跨越空間與時間的區域，預測它們的特徵；它用約兩百萬支公開影片訓練，不用文字、不用負樣本、也不重建像素。**V-JEPA 2**（2025 年 6 月）把規模擴大到超過一百萬小時的網路影片，接著凍結編碼器，用 DROID 資料集中不到 62 小時、沒有標註的機器人影片，訓練一個以動作為條件的預測器 **V-JEPA 2-AC**。",
        ]}
      />
      <P
        t={[
          "V-JEPA 2-AC plans the way the next page describes: model-predictive control with the cross-entropy method, choosing actions whose predicted representation is closest (in L1 distance) to the representation of a goal image, executing the first action and replanning. The paper reports zero-shot pick-and-place with Franka arms in two labs, with no data collected in those labs and no task-specific reward.",
          "V-JEPA 2-AC 的規劃方式就是下一頁介紹的：以交叉熵法做模型預測控制，選出預測表示與目標影像表示最接近（L1 距離）的動作，執行第一個動作再重新規劃。論文報告它在兩個實驗室中用 Franka 機械手臂零樣本完成抓取與放置，沒有在那些實驗室收集資料，也沒有針對任務的獎勵。",
        ]}
      />
      <p className="flex flex-wrap items-center gap-2">
        <Evidence level="demonstrated" />
        <span className="text-xs text-gray-500">
          <SiteLink to={["concept", "planning", "cem"]} label={["Planning with a model (CEM)", "用模型規劃（CEM）"]} />
        </span>
      </p>
      <Figure
        caption={[
          "48 points in three clusters, each seen twice with noise ($v_i$ and $v'_i$ in $\\mathbb R^4$). A linear encoder $z = Wv$ embeds a view in 2-D; a linear predictor guesses $z'_i$ from $z_i$. Gray shapes: targets $z'_i$; amber dots: predictions; full-batch gradient descent, step by step. With the term **off**, nothing stops the trivial answer $W \\to 0$ and the cloud shrinks to the origin. Switch it **on** (any time, even after a collapse) and VICReg's variance and covariance terms hold each dimension's spread near $\\gamma = 1$. A toy: linear maps, full batches, both branches trained by gradient; real JEPAs use deep encoders and an EMA target instead of VICReg.",
          "48 個點分成三群，每個點帶雜訊地被看兩次（$\\mathbb R^4$ 中的 $v_i$ 與 $v'_i$）。線性編碼器 $z = Wv$ 把一個視角嵌入二維；線性預測器從 $z_i$ 猜 $z'_i$。灰色形狀：目標 $z'_i$；琥珀色點：預測；全批次梯度下降，一步一步走。防塌縮項**關閉**時，沒有任何東西阻止平凡解 $W \\to 0$，點雲縮到原點。把它**打開**（任何時候都可以，即使已經塌縮），VICReg 的變異數與共變異數項會讓每個維度的散布維持在 $\\gamma = 1$ 附近。這是玩具：線性映射、全批次、兩個分支都用梯度訓練；真正的 JEPA 用深層編碼器和 EMA 目標，而不是 VICReg。",
        ]}
      >
        <JepaCollapse />
      </Figure>
      <P
        t={[
          "**What to notice.** With the term off, the prediction loss falls towards zero *while* the cloud vanishes: by the only measure the model is given, it is getting better. That is why collapse is dangerous; the training curve looks like success. With the term on, the prediction loss stays above zero, because the noise in the two views is genuinely unpredictable and the encoder is no longer allowed to hide it by shrinking. The three clusters stay apart: the representation keeps what the two views share.",
          "**值得注意的地方。** 防塌縮項關閉時，預測損失趨近於零，*同時*點雲消失：以模型唯一被告知的標準來看，它越來越好。這就是塌縮危險之處：訓練曲線看起來像成功。打開防塌縮項後，預測損失停在零以上，因為兩個視角中的雜訊本來就無法預測，而編碼器不再被允許靠縮小來掩蓋它。三個群保持分開：表示保留了兩個視角共有的東西。",
        ]}
      />
      <Py
        title="python/wm/jepa_toy.py"
        code={pyRegion(jepaSrc, "regulariser")}
        note={[
          "The anti-collapse terms and their gradient, written out by hand in numpy (the demo runs the same model, ported to TypeScript); a test checks the gradient against finite differences, that the spread falls below $10^{-4}$ in 300 steps without them, and that it stays above 1.5 with them.",
          "防塌縮項及其梯度，用 numpy 親手寫出（示範執行的是同一個模型，移植成 TypeScript）；測試會用有限差分檢查梯度，並確認沒有這兩項時 300 步內散布降到 $10^{-4}$ 以下，有這兩項時維持在 1.5 以上。",
        ]}
      />
      <Sources
        items={[
          { label: "LeCun (2022), A Path Towards Autonomous Machine Intelligence (OpenReview)", url: "https://openreview.net/forum?id=BZ5a1r-kVsf" },
          arxiv("2301.08243", "Assran et al. (2023), Self-Supervised Learning from Images with a Joint-Embedding Predictive Architecture (I-JEPA)"),
          arxiv("2404.08471", "Bardes et al. (2024), Revisiting Feature Prediction for Learning Visual Representations from Video (V-JEPA)"),
          arxiv("2506.09985", "Assran et al. (2025), V-JEPA 2: Self-Supervised Video Models Enable Understanding, Prediction and Planning"),
          arxiv("2006.07733", "Grill et al. (2020), Bootstrap Your Own Latent (BYOL)"),
          arxiv("2105.04906", "Bardes, Ponce & LeCun (2021), VICReg"),
          arxiv("2102.06810", "Tian, Chen & Ganguli (2021), Understanding Self-Supervised Learning Dynamics without Contrastive Pairs"),
        ]}
      />
      <HistoryLinks ids={["lecun-path", "jepa"]} />
    </Section>
  );
}

export default function Representation({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <Compress n={1} />
      <Jepa n={2} />
    </Page>
  );
}
