/** Coding Skills ▸ Rays and splats ▸ section "rays": camera rays, the volume-rendering loop and positional encoding. */
import { excerpt } from "../../../demos/excerpt.ts";
import PixelRays from "../../../demos/PixelRays.tsx";
import { Question, Sub } from "../../../demos/SectionText.tsx";
import VolumeRay from "../../../demos/VolumeRay.tsx";
import nerfSrc from "../../../models/nerfTiny.ts?raw";
import volumeSrc from "../../../models/volumeRender.ts?raw";
import { Code, Eq, Figure, List, P, Section, SiteLink, Sources } from "../../kit.tsx";

export default function Rays({ n }: { n: number }) {
  return (
    <Section page="rendering" id="rays" n={n} title={["Camera rays and a volume-rendering function", "相機光線與體積渲染函式"]}>
      <Question t={["How does a pixel become a ray, and a ray become a colour?", "一個像素怎麼變成一條光線，一條光線又怎麼變成一個顏色？"]} />
      <P
        t={[
          "Rendering a NeRF is three small functions in a row: turn a pixel into a ray, put samples along the ray, and composite what the field says at the samples. The code below is the code the demos on Concepts ▸ 3D scene models run, cut straight out of `src/models/volumeRender.ts` and `src/models/nerfTiny.ts`.",
          "渲染一個 NeRF 就是接連三個小函式：把像素變成光線、沿光線放取樣點、把場在取樣點的值合成起來。下面的程式碼正是「概念 ▸ 三維場景模型」那一頁的示範所執行的程式碼，直接從 `src/models/volumeRender.ts` 與 `src/models/nerfTiny.ts` 擷取。",
        ]}
      />

      <Sub t={["1. Intrinsics: from a pixel to a ray", "1. 內參：從像素到光線"]} />
      <P
        t={[
          "A pinhole camera is described by its **intrinsics**, the focal length $f$ in pixels and the principal point $(c_x, c_y)$ where the optical axis meets the image (here the image centre, $W/2$ and $H/2$), and its **extrinsics**, a rotation $R$ and a centre $\\mathbf{o}$ in the world. Pixel $(i, j)$, counted from the top-left corner, has its centre at $(i + \\tfrac12, j + \\tfrac12)$; dividing by $f$ puts it on the image plane at distance 1 in front of the camera:",
          "針孔相機由**內參**描述：以像素計的焦距 $f$，以及光軸與影像交會的主點 $(c_x, c_y)$（這裡取影像中心 $W/2$ 與 $H/2$）；再加上**外參**：世界座標中的旋轉 $R$ 與中心 $\\mathbf{o}$。從左上角數起的像素 $(i, j)$，其中心位於 $(i + \\tfrac12, j + \\tfrac12)$；除以 $f$ 就把它放到相機前方距離 1 的影像平面上：",
        ]}
      />
      <Eq tex="\mathbf{d} = \frac{R\,(x, y, -1)^\top}{\|R\,(x, y, -1)^\top\|}, \qquad x = \frac{i + \tfrac12 - c_x}{f}, \quad y = -\frac{j + \tfrac12 - c_y}{f}, \qquad f = \frac{W/2}{\tan(\text{fov}/2)}." />
      <P
        t={[
          "The camera looks along its own $-z$ axis with $y$ up (the OpenGL convention NeRF's synthetic scenes use), so image rows, which count downwards, get a minus sign. $R$'s columns are the camera's right, up and back directions in world coordinates.",
          "相機沿自身的 $-z$ 軸看出去，$y$ 朝上（NeRF 合成場景採用的 OpenGL 慣例），所以往下數的影像列要加負號。$R$ 的三行是相機的右、上、後三個方向在世界座標中的表示。",
        ]}
      />
      <Code code={excerpt(volumeSrc, "rays")} title="src/models/volumeRender.ts" />
      <Figure
        caption={[
          "One image row seen from above: a longer focal length narrows the field of view and bunches the rays together. The numbers are `cameraRay` for a camera at the origin with $R = I$.",
          "從上方看一列影像：焦距越長，視野越窄，光線越集中。數字由 `cameraRay` 算出，相機位於原點且 $R = I$。",
        ]}
      >
        <PixelRays />
      </Figure>

      <Sub t={["2. Samples along the ray", "2. 沿光線取樣"]} />
      <P
        t={[
          "The ray is cut into $N$ equal bins between a near and a far bound. Rendering takes the midpoint of each bin, so a frame is deterministic; training takes one uniform random point per bin (**stratified sampling**), so over many steps the network is queried at every depth, not only on a fixed lattice. The tiny NeRF takes its bounds from where the ray enters and leaves the scene's box (`rayBox`).",
          "在近界與遠界之間，把光線切成 $N$ 個等長區間。渲染時取每個區間的中點，所以每一幀都是確定的；訓練時在每個區間內均勻隨機取一點（**分層取樣**），於是經過許多步之後，網路在每個深度都被查詢過，而不只是固定的格點。極小 NeRF 的近界與遠界，取自光線進入與離開場景方盒的位置（`rayBox`）。",
        ]}
      />
      <Code code={excerpt(volumeSrc, "sampling")} title="src/models/volumeRender.ts" />

      <Sub t={["3. The quadrature loop", "3. 求積迴圈"]} />
      <P
        t={[
          "One pass, front to back, keeping the transmittance $T$ in a single variable. Each sample adds $w_i\\mathbf{c}_i$ with $w_i = T\\alpha_i$, then $T$ is multiplied by $1 - \\alpha_i = e^{-\\sigma_i\\delta_i}$:",
          "由前到後走一遍，把透射率 $T$ 存在一個變數裡。每個取樣點加上 $w_i\\mathbf{c}_i$，其中 $w_i = T\\alpha_i$，然後 $T$ 乘上 $1 - \\alpha_i = e^{-\\sigma_i\\delta_i}$：",
        ]}
      />
      <Code
        code={excerpt(volumeSrc, "quadrature")}
        title="src/models/volumeRender.ts"
        note={[
          "In PyTorch the same loop is vectorised over a batch of rays: $T_i$ is an exclusive cumulative product, `torch.cumprod` of $1 - \\alpha$ shifted by one sample.",
          "在 PyTorch 中，同一個迴圈會對一批光線向量化：$T_i$ 是排除自身的累積乘積，即把 $1 - \\alpha$ 的 `torch.cumprod` 往後移一個取樣點。",
        ]}
      />
      <Figure
        caption={[
          "The loop above, on one ray through four density blobs: drag the camera, change $N$, and compare the weights with $1 - T_{\\text{final}}$.",
          "上面的迴圈，作用在一條穿過四個密度團塊的光線上：拖曳相機、改變 $N$，比較權重總和與 $1 - T_{\\text{final}}$。",
        ]}
      >
        <VolumeRay compact />
      </Figure>

      <Sub t={["4. Positional encoding and the network", "4. 位置編碼與網路"]} />
      <P
        t={[
          "The encoding is two nested loops. Like NeRF's official code, it also passes $p$ itself through, so a 3-D point becomes $3 + 6L$ numbers ($L = 6$ gives 39). The order must match the training script exactly; a test checks it against numbers the script saved.",
          "編碼就是兩層巢狀迴圈。和 NeRF 官方程式碼一樣，它也把 $p$ 本身傳下去，所以一個三維點變成 $3 + 6L$ 個數（$L = 6$ 時為 39 個）。順序必須與訓練腳本完全一致；有一個測試把它和腳本存下的數字對照。",
        ]}
      />
      <Code code={excerpt(nerfSrc, "pe")} title="src/models/nerfTiny.ts" />
      <P
        t={[
          "The network is matrix–vector products with ReLU between them, written as loops over a row-major weight array, with softplus keeping $\\sigma \\ge 0$ and a sigmoid keeping the colour in $(0, 1)$. Scratch buffers are reused, so evaluating a point allocates almost nothing.",
          "網路就是一連串矩陣–向量乘積，中間夾著 ReLU，寫成對列優先權重陣列的迴圈；softplus 讓 $\\sigma \\ge 0$，sigmoid 讓顏色落在 $(0, 1)$。暫存緩衝區重複使用，所以計算一個點幾乎不配置記憶體。",
        ]}
      />
      <Code code={excerpt(nerfSrc, "mlp")} title="src/models/nerfTiny.ts" />
      <P t={["And a pixel puts the three steps together, with early ray termination:", "最後，一個像素把三個步驟串起來，並在光線提早終止："]} />
      <Code code={excerpt(nerfSrc, "pixel")} title="src/models/nerfTiny.ts" />

      <Sub t={["How the code is checked", "程式碼如何檢查"]} />
      <List
        items={[
          [
            "`tests/volumeRender.test.ts`: the weights sum to $1 - T_{\\text{final}}$ for random densities and spacings; a uniform slab gives exactly $e^{-\\sigma L}$; the pixel converges as $N$ grows; the centre ray hits the look-at point and the edge ray is half the field of view off; fine samples land where the weights are.",
            "`tests/volumeRender.test.ts`：對隨機的密度與間距，權重總和為 $1 - T_{\\text{final}}$；均勻平板恰好給出 $e^{-\\sigma L}$；$N$ 增大時像素收斂；中心光線指向注視點，邊緣光線偏離半個視野；細取樣點落在權重大的地方。",
          ],
          [
            "`tests/nerfTiny.test.ts`: $\\sigma$, colour and whole rendered pixels from the TypeScript forward pass match a float64 NumPy reference that `scripts/tiny_nerf.py` saved beside the weights, to within $10^{-4}$; early termination at $T < 10^{-3}$ moves a pixel by at most $10^{-3}$.",
            "`tests/nerfTiny.test.ts`：TypeScript 前向傳遞算出的 $\\sigma$、顏色與完整像素，與 `scripts/tiny_nerf.py` 存在權重旁的 float64 NumPy 參考值相差在 $10^{-4}$ 以內；在 $T < 10^{-3}$ 時提早終止，像素的變化最多 $10^{-3}$。",
          ],
        ]}
      />
      <p>
        <SiteLink to={["concept", "scenes", "nerf"]} label={["Back to the ideas: NeRF and spectral bias", "回到概念：NeRF 與頻譜偏差"]} />
      </p>
      <Sources
        items={[
          { label: "Mildenhall et al. (2020), NeRF", url: "https://arxiv.org/abs/2003.08934" },
          { label: "NeRF official code (bmild/nerf)", url: "https://github.com/bmild/nerf" },
          { label: "Max (1995), Optical models for direct volume rendering", url: "https://doi.org/10.1109/2945.468400" },
        ]}
      />
    </Section>
  );
}
