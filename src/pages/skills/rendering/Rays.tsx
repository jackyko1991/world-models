/** Coding Skills ▸ Rays and splats ▸ section "rays": camera rays, the volume-rendering loop and positional encoding. */
import PixelRays from "../../../demos/PixelRays.tsx";
import { Question, Sub } from "../../../demos/SectionText.tsx";
import VolumeRay from "../../../demos/VolumeRay.tsx";
import nerfSrc from "../../../../python/wm/nerf_tiny.py?raw";
import volumeSrc from "../../../../python/wm/volume_render.py?raw";
import { Figure, List, P, Pictured, Py, pyRegion, Section, SiteLink, Sources } from "../../kit.tsx";
import { RaysPinholePicture } from "../../../demos/pictures/RaysPictures.tsx";

export default function Rays({ n }: { n: number }) {
  return (
    <Section page="rendering" id="rays" n={n} title={["Camera rays and a volume-rendering function", "相機光線與體積渲染函式"]}>
      <Question t={["How does a pixel become a ray, and a ray become a colour?", "一個像素怎麼變成一條光線，一條光線又怎麼變成一個顏色？"]} />
      <P
        t={[
          "Rendering a NeRF is three small functions in a row: turn a pixel into a ray, put samples along the ray, and composite what the field says at the samples. The code below is the model in readable numpy, cut straight out of `python/wm/volume_render.py` and `python/wm/nerf_tiny.py`; the demos on Concepts ▸ 3D scene models run the same model, ported to TypeScript, and tests check that the two agree.",
          "渲染一個 NeRF 就是接連三個小函式：把像素變成光線、沿光線放取樣點、把場在取樣點的值合成起來。下面的程式碼是以易讀的 numpy 寫成的模型，直接從 `python/wm/volume_render.py` 與 `python/wm/nerf_tiny.py` 擷取；「概念 ▸ 三維場景模型」那一頁的示範執行的是同一個模型移植到 TypeScript 的版本，並有測試檢查兩者一致。",
        ]}
      />

      <Sub t={["1. Intrinsics: from a pixel to a ray", "1. 內參：從像素到光線"]} />
      <P
        t={[
          "A pinhole camera is described by its **intrinsics**, the focal length $f$ in pixels and the principal point $(c_x, c_y)$ where the optical axis meets the image (here the image centre, $W/2$ and $H/2$), and its **extrinsics**, a rotation $R$ and a centre $\\mathbf{o}$ in the world. Pixel $(i, j)$, counted from the top-left corner, has its centre at $(i + \\tfrac12, j + \\tfrac12)$; dividing by $f$ puts it on the image plane at distance 1 in front of the camera:",
          "針孔相機由**內參**描述：以像素計的焦距 $f$，以及光軸與影像交會的主點 $(c_x, c_y)$（這裡取影像中心 $W/2$ 與 $H/2$）；再加上**外參**：世界座標中的旋轉 $R$ 與中心 $\\mathbf{o}$。從左上角數起的像素 $(i, j)$，其中心位於 $(i + \\tfrac12, j + \\tfrac12)$；除以 $f$ 就把它放到相機前方距離 1 的影像平面上：",
        ]}
      />
      <Pictured
        tex="\mathbf{d} = \frac{R\,(x, y, -1)^\top}{\|R\,(x, y, -1)^\top\|}, \qquad x = \frac{i + \tfrac12 - c_x}{f}, \quad y = -\frac{j + \tfrac12 - c_y}{f}, \qquad f = \frac{W/2}{\tan(\text{fov}/2)}."
        caption={[
          "Seen from above: the pinhole $\\mathbf{o}$, the image plane at distance $f$, and one pixel $i + \\tfrac12 - c_x$ pixels off the axis. Dividing that offset by $f$ gives $x$; the ray through the pixel centre, $(x, y, -1)$ turned by $R$ and normalised, is $\\mathbf{d}$. The edge rays span the field of view, so $\\tan(\\text{fov}/2) = (W/2)/f$.",
          "從上方看：針孔 $\\mathbf{o}$、距離 $f$ 處的影像平面，以及離光軸 $i + \\tfrac12 - c_x$ 個像素的一個像素。把這個偏移除以 $f$ 得到 $x$；穿過像素中心的光線，即經 $R$ 旋轉並正規化的 $(x, y, -1)$，就是 $\\mathbf{d}$。兩條邊緣光線張出視野，所以 $\\tan(\\text{fov}/2) = (W/2)/f$。",
        ]}
      >
        <RaysPinholePicture />
      </Pictured>
      <P
        t={[
          "The camera looks along its own $-z$ axis with $y$ up (the OpenGL convention NeRF's synthetic scenes use), so image rows, which count downwards, get a minus sign. $R$'s columns are the camera's right, up and back directions in world coordinates.",
          "相機沿自身的 $-z$ 軸看出去，$y$ 朝上（NeRF 合成場景採用的 OpenGL 慣例），所以往下數的影像列要加負號。$R$ 的三行是相機的右、上、後三個方向在世界座標中的表示。",
        ]}
      />
      <Py code={pyRegion(volumeSrc, "rays")} title="python/wm/volume_render.py" />
      <Figure
        caption={[
          "One image row seen from above: a longer focal length narrows the field of view and bunches the rays together. The numbers are `camera_ray` (here its TypeScript port) for a camera at the origin with $R = I$.",
          "從上方看一列影像：焦距越長，視野越窄，光線越集中。數字由 `camera_ray`（這裡是它的 TypeScript 移植版）算出，相機位於原點且 $R = I$。",
        ]}
      >
        <PixelRays />
      </Figure>

      <Sub t={["2. Samples along the ray", "2. 沿光線取樣"]} />
      <P
        t={[
          "The ray is cut into $N$ equal bins between a near and a far bound. Rendering takes the midpoint of each bin, so a frame is deterministic; training takes one uniform random point per bin (**stratified sampling**), so over many steps the network is queried at every depth, not only on a fixed lattice. The tiny NeRF takes its bounds from where the ray enters and leaves the scene's box (`ray_box`).",
          "在近界與遠界之間，把光線切成 $N$ 個等長區間。渲染時取每個區間的中點，所以每一幀都是確定的；訓練時在每個區間內均勻隨機取一點（**分層取樣**），於是經過許多步之後，網路在每個深度都被查詢過，而不只是固定的格點。極小 NeRF 的近界與遠界，取自光線進入與離開場景方盒的位置（`ray_box`）。",
        ]}
      />
      <Py code={pyRegion(volumeSrc, "sampling")} title="python/wm/volume_render.py" />

      <Sub t={["3. The quadrature loop", "3. 求積迴圈"]} />
      <P
        t={[
          "Front to back, the transmittance in front of sample $i$ is $T_i = \\prod_{j<i}(1 - \\alpha_j)$ with $1 - \\alpha_j = e^{-\\sigma_j\\delta_j}$: an exclusive cumulative product. Each sample contributes $w_i\\mathbf{c}_i$ with $w_i = T_i\\alpha_i$, and numpy does every sample at once:",
          "由前到後，取樣點 $i$ 前方的透射率是 $T_i = \\prod_{j<i}(1 - \\alpha_j)$，其中 $1 - \\alpha_j = e^{-\\sigma_j\\delta_j}$：一個排除自身的累積乘積。每個取樣點貢獻 $w_i\\mathbf{c}_i$，其中 $w_i = T_i\\alpha_i$，numpy 一次算完所有取樣點：",
        ]}
      />
      <Py
        code={pyRegion(volumeSrc, "quadrature")}
        title="python/wm/volume_render.py"
        note={[
          "The TypeScript port the demo runs writes the same sum as one loop that keeps $T$ in a single variable; in PyTorch the code above is vectorised over a batch of rays as well, with `torch.cumprod`.",
          "示範執行的 TypeScript 移植版把同一個總和寫成一個迴圈，把 $T$ 存在單一變數裡；在 PyTorch 中，上面的程式碼還會對一批光線向量化，用的是 `torch.cumprod`。",
        ]}
      />
      <Figure
        caption={[
          "The sum above, on one ray through four density blobs: drag the camera, change $N$, and compare the weights with $1 - T_{\\text{final}}$.",
          "上面的總和，作用在一條穿過四個密度團塊的光線上：拖曳相機、改變 $N$，比較權重總和與 $1 - T_{\\text{final}}$。",
        ]}
      >
        <VolumeRay compact />
      </Figure>

      <Sub t={["4. Positional encoding and the network", "4. 位置編碼與網路"]} />
      <P
        t={[
          "The encoding multiplies every coordinate by every frequency $2^k\\pi$ and takes sines and cosines. Like NeRF's official code, it also passes $p$ itself through, so a 3-D point becomes $3 + 6L$ numbers ($L = 6$ gives 39). The order must match the training script exactly; a test checks it against numbers the script saved.",
          "編碼把每個座標乘上每個頻率 $2^k\\pi$，再取正弦與餘弦。和 NeRF 官方程式碼一樣，它也把 $p$ 本身傳下去，所以一個三維點變成 $3 + 6L$ 個數（$L = 6$ 時為 39 個）。順序必須與訓練腳本完全一致；有一個測試把它和腳本存下的數字對照。",
        ]}
      />
      <Py code={pyRegion(nerfSrc, "pe")} title="python/wm/nerf_tiny.py" />
      <P
        t={[
          "The network is matrix products with ReLU between them, run on every sample of a ray at once, with softplus keeping $\\sigma \\ge 0$ and a sigmoid keeping the colour in $(0, 1)$. The weights are read from the same file the browser loads, `public/models/tiny-nerf.json`.",
          "網路就是一連串矩陣乘積，中間夾著 ReLU，一次作用在一條光線的所有取樣點上；softplus 讓 $\\sigma \\ge 0$，sigmoid 讓顏色落在 $(0, 1)$。權重讀自瀏覽器載入的同一個檔案 `public/models/tiny-nerf.json`。",
        ]}
      />
      <Py code={pyRegion(nerfSrc, "mlp")} title="python/wm/nerf_tiny.py" />
      <P
        t={[
          "And a pixel puts the three steps together. (The TypeScript port also stops a ray early once $T < 10^{-3}$, which skips most of the work behind a surface.)",
          "最後，一個像素把三個步驟串起來。（TypeScript 移植版還會在 $T < 10^{-3}$ 時提早終止光線，省下表面後方的大部分計算。）",
        ]}
      />
      <Py code={pyRegion(nerfSrc, "pixel")} title="python/wm/nerf_tiny.py" />

      <Sub t={["How the code is checked", "程式碼如何檢查"]} />
      <List
        items={[
          [
            "`python/tests/test_volume_render.py` (and its TypeScript twin `tests/volumeRender.test.ts`): the weights sum to $1 - T_{\\text{final}}$ for random densities and spacings; a uniform slab gives exactly $e^{-\\sigma L}$; the pixel converges as $N$ grows; the centre ray hits the look-at point and the edge ray is half the field of view off; fine samples land where the weights are.",
            "`python/tests/test_volume_render.py`（以及它的 TypeScript 對應 `tests/volumeRender.test.ts`）：對隨機的密度與間距，權重總和為 $1 - T_{\\text{final}}$；均勻平板恰好給出 $e^{-\\sigma L}$；$N$ 增大時像素收斂；中心光線指向注視點，邊緣光線偏離半個視野；細取樣點落在權重大的地方。",
          ],
          [
            "`python/tests/test_nerf_tiny.py`: $\\sigma$, colour and whole rendered pixels match a float64 NumPy reference that `scripts/tiny_nerf.py` saved beside the weights, to within $10^{-5}$; `tests/nerfTiny.test.ts` checks the TypeScript port against the same reference, and that early termination at $T < 10^{-3}$ moves a pixel by at most $10^{-3}$.",
            "`python/tests/test_nerf_tiny.py`：$\\sigma$、顏色與完整像素，與 `scripts/tiny_nerf.py` 存在權重旁的 float64 NumPy 參考值相差在 $10^{-5}$ 以內；`tests/nerfTiny.test.ts` 用同一組參考值檢查 TypeScript 移植版，並確認在 $T < 10^{-3}$ 時提早終止，像素的變化最多 $10^{-3}$。",
          ],
          [
            "Python and TypeScript agree: the TypeScript tests write their inputs and outputs (rays, `renderRay`, encodings, NeRF pixels) to `python/tests/fixtures/`, and the Python tests match them to within $10^{-9}$.",
            "Python 與 TypeScript 一致：TypeScript 測試把輸入與輸出（光線、`renderRay`、編碼、NeRF 像素）寫到 `python/tests/fixtures/`，Python 測試與之相差在 $10^{-9}$ 以內。",
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
