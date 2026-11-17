/** Concepts ▸ 3D scene models ▸ section "nerf": a scene stored in an MLP, positional encoding and spectral bias. */
import FourierFit from "../../../demos/FourierFit.tsx";
import NerfOrbit from "../../../demos/NerfOrbit.tsx";
import { Question, Sub } from "../../../demos/SectionText.tsx";
import { Callout, Figure, HistoryLinks, List, P, Pictured, Section, SiteLink, Sources } from "../../kit.tsx";
import { NerfEncodingPicture, NerfFieldPicture } from "../../../demos/pictures/NerfPictures.tsx";

export default function Nerf({ n }: { n: number }) {
  return (
    <Section page="scenes" id="nerf" n={n} title={["NeRF", "NeRF"]}>
      <Question
        t={[
          "How can a small neural network store a whole scene, and why does it need Fourier features to see fine detail?",
          "一個小神經網路怎麼存下整個場景？為什麼它需要傅立葉特徵才看得見細節？",
        ]}
      />
      <P
        t={[
          "The previous section rendered a field we wrote down by hand: four blobs. NeRF (Mildenhall et al., 2020) asks the reverse question. Given photos of a scene from known cameras, find the field. Its answer is to let a neural network **be** the field, and to fit it through the volume-rendering sum, which is differentiable.",
          "上一節渲染的是我們親手寫下的場：四個團塊。NeRF（Mildenhall 等人，2020）問的是反方向的問題：給定從已知相機拍的照片，把這個場找出來。它的答案是讓一個神經網路**就是**那個場，並透過可微分的體積渲染總和來擬合它。",
        ]}
      />
      <Pictured
        tex="F_\Theta : (\mathbf{x}, \mathbf{d}) \mapsto (\sigma, \mathbf{c}), \qquad \mathcal{L}(\Theta) = \sum_{\mathbf{r} \in \text{batch}} \big\| \hat{C}_\Theta(\mathbf{r}) - C_{\text{photo}}(\mathbf{r}) \big\|^2."
        caption={[
          "A point $\\mathbf{x}$ on a camera ray and the direction $\\mathbf{d}$ it is seen from go into the network $F_\\Theta$, which answers with a density $\\sigma$ and a colour $\\mathbf{c}$. The volume sum along the ray turns those answers into a pixel $\\hat{C}_\\Theta(\\mathbf{r})$; training pulls it towards the photo's pixel.",
          "相機光線上的一點 $\\mathbf{x}$ 與看它的方向 $\\mathbf{d}$ 輸入網路 $F_\\Theta$，網路回答一個密度 $\\sigma$ 和一個顏色 $\\mathbf{c}$。沿光線的體積總和把這些答案變成像素 $\\hat{C}_\\Theta(\\mathbf{r})$；訓練則把它拉向照片中的像素。",
        ]}
      >
        <NerfFieldPicture />
      </Pictured>
      <List
        items={[
          [
            "$F_\\Theta$ is a multilayer perceptron (MLP) with weights $\\Theta$; $\\mathbf{x}$ is a 3-D point and $\\mathbf{d}$ the viewing direction. The density $\\sigma$ depends on $\\mathbf{x}$ only, so the geometry is the same from every side; the colour $\\mathbf{c}$ also sees $\\mathbf{d}$, which lets shiny surfaces change with the view.",
            "$F_\\Theta$ 是權重為 $\\Theta$ 的多層感知器（MLP）；$\\mathbf{x}$ 是三維點，$\\mathbf{d}$ 是觀看方向。密度 $\\sigma$ 只取決於 $\\mathbf{x}$，所以從哪一側看幾何都相同；顏色 $\\mathbf{c}$ 還會看 $\\mathbf{d}$，讓有光澤的表面能隨視角改變。",
          ],
          [
            "$\\hat{C}_\\Theta(\\mathbf{r})$ is the pixel the sum $\\sum_i T_i(1 - e^{-\\sigma_i\\delta_i})\\mathbf{c}_i$ produces when the network supplies $\\sigma_i, \\mathbf{c}_i$ at the samples of ray $\\mathbf{r}$; $C_{\\text{photo}}$ is the photo's pixel. Training samples random rays from all photos and follows the gradient of $\\mathcal{L}$.",
            "$\\hat{C}_\\Theta(\\mathbf{r})$ 是由網路在光線 $\\mathbf{r}$ 的取樣點提供 $\\sigma_i, \\mathbf{c}_i$ 後，總和 $\\sum_i T_i(1 - e^{-\\sigma_i\\delta_i})\\mathbf{c}_i$ 算出的像素；$C_{\\text{photo}}$ 是照片上的像素。訓練時從所有照片隨機抽光線，沿 $\\mathcal{L}$ 的梯度更新。",
          ],
          [
            "In the paper the network is 8 fully connected ReLU layers of 256 units for $\\sigma$ and a feature, then one 128-unit layer that adds $\\mathbf{d}$ for the colour. One scene took about 100–300k iterations, 1–2 days on one NVIDIA V100 GPU.",
            "論文中的網路是 8 層、每層 256 個單元的全連接 ReLU 層，輸出 $\\sigma$ 與一個特徵，再接一層加入 $\\mathbf{d}$ 的 128 單元層輸出顏色。一個場景約需 10 萬到 30 萬次迭代，在一張 NVIDIA V100 GPU 上約 1 至 2 天。",
          ],
        ]}
      />
      <P
        t={[
          "Nothing in the loss mentions 3-D. The geometry appears because a single field has to explain every photo at once: a density blob in the wrong place would be visible, in the wrong spot, from some other camera.",
          "損失函數裡完全沒有提到三維。幾何之所以出現，是因為同一個場必須同時解釋每一張照片：放錯位置的密度團塊，從另一台相機看就會出現在錯的地方。",
        ]}
      />

      <Sub t={["Positional encoding and spectral bias", "位置編碼與頻譜偏差"]} />
      <P
        t={[
          "Fed raw coordinates, the network renders blurry scenes. The reason is a general property of networks trained by gradient descent, **spectral bias** (Rahaman et al., 2019): they learn the low-frequency, slowly varying parts of a function first, and high frequencies (sharp edges, fine texture) very slowly. NeRF's fix is to feed each coordinate $p$ through sines and cosines at doubling frequencies:",
          "直接餵入原始座標，網路會渲染出模糊的場景。原因是以梯度下降訓練的網路的一個普遍性質，**頻譜偏差**（Rahaman 等人，2019）：它們先學會函數中低頻、變化緩慢的部分，高頻（銳利的邊緣、細緻的紋理）則學得非常慢。NeRF 的解法是把每個座標 $p$ 送進頻率逐次加倍的正弦與餘弦：",
        ]}
      />
      <Pictured
        tex="\gamma(p) = \big(\sin(2^0\pi p), \cos(2^0\pi p), \;\dots,\; \sin(2^{L-1}\pi p), \cos(2^{L-1}\pi p)\big)."
        caption={[
          "One coordinate $p$ is read off by sines (solid) and cosines (dashed) whose frequency doubles each row. Where the line at $p$ crosses the waves gives the features on the right: a small move in $p$ barely changes the slow rows but swings the fast ones.",
          "一個座標 $p$ 由頻率逐列加倍的正弦（實線）與餘弦（虛線）讀出。$p$ 處的直線與各條波的交點，就是右側的特徵：$p$ 稍微移動，慢的幾列幾乎不變，快的幾列卻大幅擺動。",
        ]}
      >
        <NerfEncodingPicture />
      </Pictured>
      <P
        t={[
          "NeRF uses $L = 10$ for $\\mathbf{x}$ and $L = 4$ for $\\mathbf{d}$. A high-frequency wiggle in $p$ is now a slow, nearly linear function of some feature, which the network learns easily. Tancik et al. (2020) explained why through the network's neural tangent kernel and showed that the frequencies act as a dial: too low and the fit is blurry, too high and it is noisy between the training points.",
          "NeRF 對 $\\mathbf{x}$ 用 $L = 10$，對 $\\mathbf{d}$ 用 $L = 4$。$p$ 上的高頻起伏，如今成了某個特徵的緩慢、近乎線性的函數，網路很容易學會。Tancik 等人（2020）透過網路的神經切線核解釋了原因，並指出這些頻率像一個旋鈕：太低，擬合會模糊；太高，訓練點之間會出現雜訊。",
        ]}
      />
      <Figure
        caption={[
          "The same small MLP fitted to a 1-D signal with three frequencies (1, 4 and 12 cycles), on $x$ itself (sky) and on $\\gamma(x)$ with $L = 6$ (amber). Step through training or press ▶. Snapshots were precomputed by `scripts/fourier_fit.py` (PyTorch, fixed seed); nothing is trained in the browser.",
          "同一個小 MLP 擬合一個含三種頻率（1、4 與 12 個週期）的一維訊號：以 $x$ 本身為輸入（天藍色），以及以 $L = 6$ 的 $\\gamma(x)$ 為輸入（琥珀色）。逐步瀏覽訓練過程，或按 ▶。快照由 `scripts/fourier_fit.py`（PyTorch，固定亂數種子）預先算好；瀏覽器裡不做任何訓練。",
        ]}
      >
        <FourierFit />
      </Figure>
      <List
        items={[
          [
            "**Low frequencies come first.** On raw $x$ the one-cycle wave is captured within a couple of hundred steps, the four-cycle wave only after about a thousand, and the twelve-cycle wave is still mostly missing at the end. That ordering is spectral bias.",
            "**低頻先來。** 以原始 $x$ 為輸入時，一個週期的波在兩三百步內就學會，四個週期的波要約一千步，而十二個週期的波到最後大多仍然缺席。這個先後順序就是頻譜偏差。",
          ],
          [
            "**Fourier features remove the wait.** With $\\gamma(x)$ all three frequencies arrive together in under a hundred steps, with the same network, optimiser and seed.",
            "**傅立葉特徵省去了等待。** 用 $\\gamma(x)$ 時，三個頻率在一百步內一起到位；網路、優化器與亂數種子都相同。",
          ],
        ]}
      />

      <Sub t={["Hierarchical sampling", "階層式取樣"]} />
      <P
        t={[
          "Most samples along a ray land in empty space or behind the first surface, where their weights are near zero. NeRF therefore renders each ray twice. A **coarse** network is evaluated at $N_c = 64$ stratified samples (one random point per equal bin). Its weights $w_i$, normalised, form a piecewise-constant probability density along the ray, and $N_f = 128$ more samples are drawn from it by inverse-transform sampling. A **fine** network then renders with all $N_c + N_f$ samples, most of them near the surface. Both are trained with the same photo loss. The *fine samples* button in the volume-rendering demo above does this second pass.",
          "沿光線的大多數取樣點落在空處或第一個表面之後，權重接近零。因此 NeRF 把每條光線渲染兩次。**粗**網路在 $N_c = 64$ 個分層取樣點上計算（每個等長區間隨機取一點）。它的權重 $w_i$ 經過正規化，構成沿光線的分段常數機率密度，再以反轉換取樣從中抽出 $N_f = 128$ 個新取樣點。接著**細**網路用全部 $N_c + N_f$ 個取樣點渲染，其中大多數在表面附近。兩者都以同樣的照片損失訓練。上面體積渲染示範中的 *細取樣* 按鈕做的就是這第二輪。",
        ]}
      />

      <Sub t={["A tiny NeRF you can orbit", "一個可以環繞的極小 NeRF"]} />
      <P
        t={[
          "Below is a real, if very small, NeRF. A script built a scene from a floor, two spheres and a box, rendered 40 photos of it at 48×48 pixels, and trained an MLP $\\gamma(\\mathbf{x}) \\mapsto (\\sigma, \\mathbf{c})$ on them through the volume-rendering sum. Your browser now runs that network for every sample of every pixel: the same model as `python/wm/nerf_tiny.py`, ported to TypeScript and written as plain loops.",
          "下面是一個真正的 NeRF，只是非常小。一支腳本用一塊地板、兩顆球與一個方塊搭出場景，以 48×48 像素拍了 40 張照片，再透過體積渲染總和，在這些照片上訓練一個 MLP $\\gamma(\\mathbf{x}) \\mapsto (\\sigma, \\mathbf{c})$。現在你的瀏覽器對每個像素的每個取樣點執行這個網路：與 `python/wm/nerf_tiny.py` 相同的模型，移植到 TypeScript，寫成普通迴圈。",
        ]}
      />
      <Figure
        caption={[
          "Orbit with the sliders or buttons; a coarse preview appears first, then full rows fill in. The dial shows the 40 training cameras from above (gray) and yours (amber). A toy: about 11k parameters (NeRF's network is far larger), no view direction (the scene is matte), one pass of 40 samples inside the scene's box instead of coarse and fine, trained for about three minutes on a laptop CPU by `scripts/tiny_nerf.py`.",
          "用滑桿或按鈕環繞；先出現粗略預覽，再逐列補上完整畫面。圓盤從上方顯示 40 台訓練相機（灰色）與你的相機（琥珀色）。這是玩具：約 1.1 萬個參數（NeRF 的網路大得多）、沒有觀看方向（場景是霧面的）、只在場景方盒內取 40 個點做一輪而非粗細兩輪，由 `scripts/tiny_nerf.py` 在筆電 CPU 上訓練約三分鐘。",
        ]}
      >
        <NerfOrbit />
      </Figure>
      <List
        items={[
          [
            "**Views between the training cameras still work.** The network never saw your exact viewpoint unless you land on a gray dot; the field it learned is 3-D, so new views come out of the same sum.",
            "**訓練相機之間的視角也行得通。** 除非你剛好停在灰點上，否則網路從沒看過你此刻的視角；它學到的場是三維的，所以新視角同樣由那個總和算出來。",
          ],
          [
            "**Look from below the training range** (elevation 5°) or straight down (70°): quality drops where no camera looked, a reminder that NeRF interpolates its photos rather than knowing the scene.",
            "**從訓練範圍之下**（仰角 5°）或幾乎正上方（70°）去看：沒有相機看過的地方品質會下降，提醒我們 NeRF 是在它的照片之間內插，而不是真的認識這個場景。",
          ],
          [
            "**It is slow.** Each frame is tens of thousands of network evaluations. Rendering cost, not storage, is NeRF's weak point, and the reason for the next two ideas.",
            "**它很慢。** 每一幀都要計算數萬次網路。NeRF 的弱點在渲染成本而非儲存空間，這也是接下來兩個想法的由來。",
          ],
        ]}
      />

      <Callout kind="tip" title={["Aside: Instant-NGP and hash grids", "旁註：Instant-NGP 與雜湊網格"]}>
        <P
          t={[
            "Müller et al. (2022) moved most of the work out of the MLP and into a lookup table. Space is covered by 16 grids of increasing resolution; at each level the corners of the cell around $\\mathbf{x}$ are hashed into a table of small trainable feature vectors, which are interpolated and concatenated across levels. A tiny MLP (hidden layers of 64 units) turns those features into density and colour. Hash collisions are left unresolved: colliding points share an entry and their gradients are averaged, so the points that matter most for the photos, near surfaces, dominate what the entry stores.",
            "Müller 等人（2022）把大部分工作從 MLP 移到一張查找表裡。空間由 16 層解析度遞增的網格覆蓋；在每一層，包住 $\\mathbf{x}$ 的格子各角點被雜湊到一張存放可訓練小特徵向量的表，取出後做內插，再把各層的結果串接起來。一個極小的 MLP（每層 64 個單元的隱藏層）把這些特徵轉成密度與顏色。雜湊碰撞不做處理：碰撞的點共用同一個表項，梯度被平均，所以對照片最重要的點，也就是表面附近的點，主導了這個表項存的內容。",
          ]}
        />
        <P
          t={[
            "With a fused GPU implementation, the paper reports training neural graphics primitives in a matter of seconds and rendering in tens of milliseconds at 1920×1080, against hours to days for the original NeRF. The trade is memory for speed: the tables hold most of the parameters.",
            "搭配融合的 GPU 實作，論文報告能在數秒內訓練好神經圖形基元，並在 1920×1080 解析度下以數十毫秒渲染，相較之下原始 NeRF 需要數小時到數天。這是以記憶體換取速度：大部分參數都存在這些表裡。",
          ]}
        />
        <p>
          <SiteLink to={["concept", "scenes", "gaussians"]} label={["Next: drop the network entirely, with Gaussians", "下一節：用高斯把網路整個拿掉"]} />
        </p>
      </Callout>
      <p>
        <SiteLink to={["skills", "rendering", "rays"]} label={["The code: positional encoding and the tiny NeRF's forward pass", "程式碼：位置編碼與極小 NeRF 的前向傳遞"]} />
      </p>
      <Sources
        items={[
          { label: "Mildenhall et al. (2020), NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis", url: "https://arxiv.org/abs/2003.08934" },
          { label: "Rahaman et al. (2019), On the Spectral Bias of Neural Networks", url: "https://arxiv.org/abs/1806.08734" },
          { label: "Tancik et al. (2020), Fourier Features Let Networks Learn High Frequency Functions in Low Dimensional Domains", url: "https://arxiv.org/abs/2006.10739" },
          { label: "Müller et al. (2022), Instant Neural Graphics Primitives with a Multiresolution Hash Encoding", url: "https://arxiv.org/abs/2201.05989" },
        ]}
      />
      <HistoryLinks ids={["nerf", "instant-ngp"]} />
    </Section>
  );
}
