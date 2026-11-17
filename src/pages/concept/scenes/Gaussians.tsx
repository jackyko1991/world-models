/** Concepts ▸ 3D scene models ▸ section "gaussians": 3D Gaussian splatting, with a 2-D fitting demo and a small 3DGS viewer. */
import { RichText, useLang } from "@learnkit/web";
import Splat2D from "../../../demos/Splat2D.tsx";
import SplatViewer from "../../../demos/SplatViewer.tsx";
import GaussiansColour from "../../../demos/pictures/GaussiansColour.tsx";
import GaussiansComposite from "../../../demos/pictures/GaussiansComposite.tsx";
import GaussiansCovariance from "../../../demos/pictures/GaussiansCovariance.tsx";
import GaussiansProjection from "../../../demos/pictures/GaussiansProjection.tsx";
import { Callout, Figure, HistoryLinks, List, P, Pictured, Section, SiteLink, Sources, Table } from "../../kit.tsx";

export default function Gaussians({ n }: { n: number }) {
  return (
    <Section page="scenes" id="gaussians" n={n} title={["3D Gaussian splatting", "三維高斯潑濺"]}>
      <p className="text-base font-medium text-gray-900">
        <Lbl t={["How do millions of coloured blobs, sorted and blended, reproduce a photo-real scene in real time?", "數百萬個彩色團塊經過排序與混合，怎麼即時重現照片般真實的場景？"]} />
      </p>
      <P
        t={[
          "NeRF asks a network about hundreds of points along every ray. Gaussian splatting turns the work around, as Lee Westover's **splatting** did in 1990: keep the scene as an explicit list of fuzzy, coloured ellipsoids, throw each one **at the screen**, and blend the footprints in depth order. No network is evaluated when drawing, so it is fast; and because the list is the scene, you can move, delete or copy parts of it.",
          "NeRF 要沿每一條光線向網路詢問數百個點。高斯潑濺把工作反過來做，正如 Lee Westover 在 1990 年的**潑濺**：把場景存成一份顯式清單，裡面是模糊的彩色橢球；把每個橢球**丟向螢幕**，再依深度順序混合它們的足跡。繪製時不用計算任何網路，所以很快；而且清單本身就是場景，你可以移動、刪除或複製其中的部分。",
        ]}
      />

      <h3 className="pt-2 text-sm font-semibold text-gray-900">{"1 · "}<Lbl t={["One Gaussian", "一個高斯"]} /></h3>
      <P
        t={[
          "Each primitive is a 3-D Gaussian with mean $\\mu$ (its centre) and covariance $\\Sigma$ (its shape): $G(\\mathbf{x}) = \\exp\\!\\big(-\\tfrac12(\\mathbf{x}-\\mu)^\\top\\Sigma^{-1}(\\mathbf{x}-\\mu)\\big)$. A covariance must be symmetric and positive definite, which plain gradient descent on its six entries would soon break. So 3DGS stores a rotation (a unit quaternion $q$, giving $R$) and three scales $S = \\operatorname{diag}(s_1, s_2, s_3)$ instead, and builds",
          "每個基本元素是一個三維高斯，平均 $\\mu$（中心）與共變異數 $\\Sigma$（形狀）：$G(\\mathbf{x}) = \\exp\\!\\big(-\\tfrac12(\\mathbf{x}-\\mu)^\\top\\Sigma^{-1}(\\mathbf{x}-\\mu)\\big)$。共變異數必須對稱且正定，直接對它的六個元素做梯度下降，很快就會破壞這個性質。所以 3DGS 改存一個旋轉（單位四元數 $q$，給出 $R$）與三個尺度 $S = \\operatorname{diag}(s_1, s_2, s_3)$，再組成",
        ]}
      />
      <Pictured
        tex="\Sigma = R\,S\,S^\top R^\top"
        caption={[
          "A unit sphere, stretched by $S$ to semi-axes $s_1, s_2, s_3$, then turned by $R$: whatever the optimiser does to $q$ and $s$, the covariance built this way is always a real ellipsoid.",
          "單位球先被 $S$ 拉伸成半軸 $s_1, s_2, s_3$，再被 $R$ 旋轉：不管最佳化器怎麼改 $q$ 與 $s$，這樣組出的共變異數永遠是真正的橢球。",
        ]}
      >
        <GaussiansCovariance />
      </Pictured>
      <P
        t={[
          "which is symmetric and positive definite for any $q$ and non-zero scales (its eigenvectors are the columns of $R$, its eigenvalues $s_i^2$). Each Gaussian also has an **opacity** $o \\in (0, 1)$ and a **colour that depends on the viewing direction** $\\mathbf{d}$, stored as spherical-harmonic coefficients $k_\\ell$ per colour channel. With degree 0 and 1, as in this page's demos,",
          "對任何 $q$ 與非零尺度，它都對稱且正定（特徵向量是 $R$ 的各行，特徵值是 $s_i^2$）。每個高斯還有一個**不透明度** $o \\in (0, 1)$，以及一個**隨觀看方向** $\\mathbf{d}$ **改變的顏色**，以每個色彩通道的球諧係數 $k_\\ell$ 儲存。用到 0 階與 1 階時（本頁示範就是如此），",
        ]}
      />
      <Pictured
        tex="c(\mathbf{d}) = \tfrac12 + C_0 k_0 + C_1\,(-d_y k_1 + d_z k_2 - d_x k_3),\qquad C_0 = \tfrac{1}{2\sqrt{\pi}},\ C_1 = \tfrac{\sqrt3}{2\sqrt\pi}."
        caption={[
          "The same splat shows a different colour to each viewing direction $\mathbf{d}$. The ring is $c(\mathbf{d})$ for every direction in the plane: $k_0$ sets its average, $k_1, k_2, k_3$ tilt it across directions (degree 1 is linear in $\mathbf{d}$).",
          "同一個潑濺從不同觀看方向 $\mathbf{d}$ 看，顏色不同。環上是平面中每個方向的 $c(\mathbf{d})$：$k_0$ 決定平均，$k_1, k_2, k_3$ 決定它隨方向的傾斜（1 階對 $\mathbf{d}$ 是線性的）。",
        ]}
      >
        <GaussiansColour />
      </Pictured>
      <P
        t={[
          "The original paper goes up to degree 3 (16 coefficients per channel), so one Gaussian is 59 numbers: 3 for $\\mu$, 4 for $q$, 3 for $s$, 1 for $o$ and 48 for colour. Ours are 23.",
          "原論文用到 3 階（每通道 16 個係數），所以一個高斯有 59 個數：$\\mu$ 3 個、$q$ 4 個、$s$ 3 個、$o$ 1 個，顏色 48 個。我們的是 23 個。",
        ]}
      />

      <h3 className="pt-2 text-sm font-semibold text-gray-900">{"2 · "}<Lbl t={["Onto the screen: the EWA Jacobian", "投影到螢幕：EWA 雅可比矩陣"]} /></h3>
      <P
        t={[
          "The camera first moves the mean into camera coordinates, $\\mathbf{t} = W(\\mu - \\mathbf{p}_{\\text{cam}})$ ($W$ is the view rotation), then divides by depth: $u = f_x t_x/t_z + c_x$, $v = f_y t_y/t_z + c_y$. That divide is not linear, so a Gaussian does not stay exactly Gaussian. Zwicker, Pfister, van Baar and Gross's **EWA splatting** (2001) replaces it by its tangent at the mean, the Jacobian",
          "相機先把平均移到相機座標 $\\mathbf{t} = W(\\mu - \\mathbf{p}_{\\text{cam}})$（$W$ 是視角旋轉），再除以深度：$u = f_x t_x/t_z + c_x$、$v = f_y t_y/t_z + c_y$。這個除法不是線性的，所以高斯投影後並不完全是高斯。Zwicker、Pfister、van Baar 與 Gross 的 **EWA 潑濺**（2001）在平均處以切線取代它，也就是雅可比矩陣",
        ]}
      />
      <Pictured
        tex="J = \begin{pmatrix} f_x/t_z & 0 & -f_x t_x/t_z^2 \\ 0 & f_y/t_z & -f_y t_y/t_z^2 \end{pmatrix},\qquad \Sigma' = J\,W\,\Sigma\,W^\top J^\top"
        caption={[
          "$W$ turns the world into the camera's frame; the rays that graze the ellipsoid $\Sigma$ cross the image plane and bound its footprint $\Sigma'$. $J$ treats the divide by depth as linear near $\mu$, so the footprint comes out an exact ellipse.",
          "$W$ 把世界轉到相機座標；擦過橢球 $\Sigma$ 的光線穿過影像平面，圍出它的足跡 $\Sigma'$。$J$ 把深度除法在 $\mu$ 附近當成線性，所以足跡恰好是一個橢圓。",
        ]}
      >
        <GaussiansProjection />
      </Pictured>
      <P
        t={[
          "and a linear map of a Gaussian is a Gaussian, so the footprint is a 2-D Gaussian with covariance $\\Sigma'$ ($2\\times2$). 3DGS adds $0.3$ to its diagonal so no splat is thinner than about a pixel; ours does too. The tests check $\\Sigma'$ against a finite-difference Jacobian of the real projection, and against samples pushed through it.",
          "高斯經線性映射後仍是高斯，所以足跡是共變異數為 $\\Sigma'$（$2\\times2$）的二維高斯。3DGS 會在其對角線加上 $0.3$，讓潑濺不會比約一個像素還細；我們也這麼做。測試會拿 $\\Sigma'$ 與真實投影的有限差分雅可比矩陣、以及經投影的樣本做比對。",
        ]}
      />

      <h3 className="pt-2 text-sm font-semibold text-gray-900">{"3 · "}<Lbl t={["Sort, then blend front to back", "排序，再由前往後混合"]} /></h3>
      <P
        t={[
          "Sort the Gaussians by depth $t_z$. At pixel $\\mathbf{x}$, splat $i$ covers a fraction $\\alpha_i = o_i \\exp\\!\\big(-\\tfrac12 (\\mathbf{x}-\\mu_i')^\\top \\Sigma_i'^{-1} (\\mathbf{x}-\\mu_i')\\big)$, where $\\mu_i'$ is its projected mean, and the colour is",
          "依深度 $t_z$ 排序高斯。在像素 $\\mathbf{x}$，潑濺 $i$ 蓋住比例 $\\alpha_i = o_i \\exp\\!\\big(-\\tfrac12 (\\mathbf{x}-\\mu_i')^\\top \\Sigma_i'^{-1} (\\mathbf{x}-\\mu_i')\\big)$（$\\mu_i'$ 是投影後的平均），顏色為",
        ]}
      />
      <Pictured
        tex="C(\mathbf{x}) = \sum_i c_i\,\alpha_i\,T_i,\qquad T_i = \prod_{j<i} (1-\alpha_j)."
        caption={[
          "One pixel's line of sight through three splats sorted by depth. The light still getting through, $T$, steps down at each one; the step $\alpha_i T_i$, drawn in the splat's colour, is its share of $C(\mathbf{x})$. The third splat is the most opaque but gets the least.",
          "一個像素的視線依深度穿過三個潑濺。仍能穿透的光 $T$ 每遇一個就往下一階；這一階 $\alpha_i T_i$（以該潑濺的顏色畫出）就是它在 $C(\mathbf{x})$ 中的份額。第三個潑濺最不透明，分到的卻最少。",
        ]}
      >
        <GaussiansComposite />
      </Pictured>
      <P
        t={[
          "This is the same sum as volume rendering's quadrature, with $\\alpha_i$ in place of $1 - e^{-\\sigma_i\\delta_i}$. Going front to back, $T$ only shrinks, so a pixel can stop once $T < 10^{-4}$: most of the list is never touched. The real rasteriser cuts the screen into 16×16 tiles and sorts per tile on the GPU; ours sorts once per frame on the CPU.",
          "這和體積渲染的求積是同一個和，只是以 $\\alpha_i$ 取代 $1 - e^{-\\sigma_i\\delta_i}$。由前往後時 $T$ 只會變小，所以一旦 $T < 10^{-4}$，像素就能停下：清單的大部分根本不必碰。真正的光柵化器把螢幕切成 16×16 的圖塊，在 GPU 上逐塊排序；我們則在 CPU 上每幀排序一次。",
        ]}
      />
      <p>
        <SiteLink to={["concept", "scenes", "volume"]} label={["Compare the volume-rendering sum", "對照體積渲染的求和"]} />{" "}
        · <SiteLink to={["skills", "rendering", "splat"]} label={["See it in code", "看程式碼"]} />
      </p>

      <h3 className="pt-2 text-sm font-semibold text-gray-900">{"4 · "}<Lbl t={["Fitting, densifying, pruning", "擬合、增密、修剪"]} /></h3>
      <P
        t={[
          "Every step of that pipeline is differentiable, so the Gaussians are fitted to photos by gradient descent on the difference between rendered and real pixels (3DGS uses $0.8\\,\\mathcal{L}_1 + 0.2\\,\\mathcal{L}_{\\text{D-SSIM}}$). Gradient descent can move, stretch and recolour Gaussians but not create them, so training also runs **adaptive density control** every 100 steps:",
          "整條流程每一步都可微分，所以高斯用梯度下降擬合照片，最小化渲染像素與真實像素的差（3DGS 用 $0.8\\,\\mathcal{L}_1 + 0.2\\,\\mathcal{L}_{\\text{D-SSIM}}$）。梯度下降能移動、拉伸、重新上色，卻無法生出新高斯，所以訓練中每 100 步還會做一次**自適應密度控制**：",
        ]}
      />
      <List
        items={[
          [
            "a Gaussian whose mean keeps getting a large positional gradient (above a threshold, $0.0002$ in the paper) is in a region the model cannot fit yet. If it is **small**, it is **cloned** (an extra copy that the gradient then pulls apart); if it is **large**, it is **split** into two children sampled from it, each with scales divided by $1.6$;",
            "平均持續收到大位置梯度（超過門檻，論文中為 $0.0002$）的高斯，所在區域模型還擬合不好。它若**小**就**複製**（多一份拷貝，再由梯度拉開）；若**大**就**分裂**成兩個從它取樣的子高斯，尺度各除以 $1.6$；",
          ],
          [
            "Gaussians whose opacity falls below a small threshold are **pruned**; every 3000 steps all opacities are pulled down to near zero, so that only the Gaussians the picture needs climb back.",
            "不透明度低於小門檻的高斯會被**修剪**；每 3000 步把所有不透明度壓到接近零，只有畫面需要的高斯會再爬回來。",
          ],
        ]}
      />

      <Figure
        caption={[
          "**2-D splatting fitting a picture.** 16 Gaussians grow to about 150 over 2000 Adam steps (precomputed by `scripts/splat2d.py`; each snapshot is rendered here by the model in `python/wm/splat.py`, ported to TypeScript). Click the right-hand picture to pick the Gaussian that contributes most to a pixel. A toy: 2-D, no camera, list order as depth, a 64×64 picture, mean-squared error instead of L1 + D-SSIM, and one opacity reset at step 800 instead of every 3000.",
          "**二維潑濺擬合一張圖片。** 16 個高斯在 2000 步 Adam 中增加到約 150 個（由 `scripts/splat2d.py` 預先計算；每張快照在這裡由 `python/wm/splat.py` 的模型渲染，移植成 TypeScript）。點右邊的圖片，選出對該像素貢獻最大的高斯。這是玩具版：二維、沒有相機、以清單順序當深度、64×64 的圖片、用均方誤差而非 L1 + D-SSIM，而且只在第 800 步重設一次不透明度，而不是每 3000 步。",
        ]}
      >
        <Splat2D />
      </Figure>
      <P
        t={[
          "**What to notice.** Step through the snapshots right after densification (steps 101, 201, 301): the PSNR **drops**, because each split leaves two children where one parent was, and then recovers within a hundred steps as they find their places. New Gaussians gather on edges (the sun's rim, the hill line, the reflection) where the gradient was large; flat sky keeps a few big ones. At step 800 the opacity reset washes the picture out, and it comes back. In this run, almost every densification is a split (the Gaussians are mostly wider than the 3-pixel split threshold) and nothing ends below the pruning threshold.",
          "**留意之處。** 逐張看增密之後的快照（第 101、201、301 步）：PSNR 會**下降**，因為每次分裂都把一個父高斯換成兩個子高斯，接著在一百步內它們各就各位，PSNR 回升。新高斯聚集在梯度大的邊緣（太陽的邊、山稜線、倒影）；平坦的天空只留幾個大高斯。第 800 步的不透明度重設讓畫面一片淡白，然後又恢復。在這次執行中，幾乎所有增密都是分裂（高斯大多比 3 像素的分裂門檻寬），也沒有高斯落到修剪門檻以下。",
        ]}
      />

      <Figure
        caption={[
          "**A small 3DGS scene, rendered in your browser.** A floor, a sphere, a box and a cylinder, ray-traced by `scripts/splat3d.py` from 40 cameras at 96×96; Gaussians were placed on the surfaces (as 3DGS starts from structure-from-motion points), then fitted to those views with Adam. Here every frame projects all of them with $J W \\Sigma W^\\top J^\\top$, sorts by depth and composites front to back on the CPU at 192×144. Simplified: no densification during fitting, colour up to SH degree 1, a scene that was never photographed.",
          "**一個小型 3DGS 場景，在你的瀏覽器裡渲染。** 地板、球、方塊與圓柱，由 `scripts/splat3d.py` 從 40 台相機以 96×96 光線追蹤；高斯先放在表面上（如同 3DGS 從運動恢復結構的點出發），再用 Adam 擬合這些視圖。這裡每一幀都以 $J W \\Sigma W^\\top J^\\top$ 投影全部高斯、依深度排序，並在 CPU 上以 192×144 由前往後合成。簡化之處：擬合時不增密、顏色只到 1 階球諧、場景從未被真正拍攝過。",
        ]}
      >
        <SplatViewer />
      </Figure>
      <P
        t={[
          "**What to notice.** Turn on the ellipses: the Gaussians on the floor and the box faces are flat discs lying in the surface, and they turn into thin slivers when seen edge-on, which is the EWA projection at work. Orbit to a low angle and the sphere's highlight moves a little: that is the degree-1 spherical harmonics. Go much closer than the training cameras ever were and the scene breaks up into blobs: a splat scene is only as good as the views it was fitted to.",
          "**留意之處。** 打開橢圓：地板與方塊表面上的高斯是貼著表面的扁圓盤，從側面看時變成細條，這就是 EWA 投影在起作用。環繞到低角度時，球上的高光會稍微移動：這是 1 階球諧函數。靠得比任何訓練相機都近時，場景會散成一團團：潑濺場景的好壞，取決於擬合它所用的視圖。",
        ]}
      />
      <Table
        head={[
          ["Kerbl et al. (2023), Mip-NeRF360 scenes", "Kerbl 等人（2023），Mip-NeRF360 場景"],
          ["PSNR", "PSNR"],
          ["Training", "訓練時間"],
          ["Frames per second", "每秒幀數"],
          ["Memory", "記憶體"],
        ]}
        rows={[
          [["Mip-NeRF360 (an MLP)", "Mip-NeRF360（多層感知器）"], ["27.69", "27.69"], ["48 h", "48 小時"], ["0.06", "0.06"], ["8.6 MB", "8.6 MB"]],
          [["Instant-NGP (big)", "Instant-NGP（大）"], ["25.59", "25.59"], ["7.5 min", "7.5 分鐘"], ["9.43", "9.43"], ["48 MB", "48 MB"]],
          [["3DGS, 30k steps", "3DGS，3 萬步"], ["27.21", "27.21"], ["42 min", "42 分鐘"], ["134", "134"], ["734 MB", "734 MB"]],
        ]}
      />
      <Callout kind="note" title={["The trade", "取捨"]}>
        <p>
          <Lbl
            t={[
              "From Table 1 of the 3DGS paper (each method timed on the authors' own hardware): Gaussians render about two thousand times faster than Mip-NeRF360 at similar quality and train in under an hour instead of two days, but the explicit list is about 85 times larger than the network.",
              "出自 3DGS 論文的表 1（各方法在作者自己的硬體上計時）：在相近品質下，高斯渲染比 Mip-NeRF360 快約兩千倍，訓練不到一小時而不是兩天；代價是顯式清單比網路大約 85 倍。",
            ]}
          />
        </p>
      </Callout>
      <Sources
        items={[
          { label: "Westover (1990), Footprint evaluation for volume rendering (SIGGRAPH)", url: "https://doi.org/10.1145/97880.97919" },
          { label: "Zwicker, Pfister, van Baar & Gross (2001), EWA volume splatting (IEEE Visualization)", url: "https://doi.org/10.1109/VISUAL.2001.964490" },
          { label: "Zwicker, Pfister, van Baar & Gross (2002), EWA splatting (IEEE TVCG 8(3))", url: "https://doi.org/10.1109/TVCG.2002.1021576" },
          { label: "Kerbl, Kopanas, Leimkühler & Drettakis (2023), 3D Gaussian Splatting for Real-Time Radiance Field Rendering", url: "https://arxiv.org/abs/2308.04079" },
          { label: "3D Gaussian splatting project page (Inria)", url: "https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/" },
        ]}
      />
      <HistoryLinks ids={["splatting", "ewa", "gaussian-splatting"]} />
    </Section>
  );
}

/** Inline bilingual text (for headings and callouts). */
function Lbl({ t }: { t: readonly [string, string] }) {
  const { pick } = useLang();
  return <RichText text={pick(t)} />;
}
