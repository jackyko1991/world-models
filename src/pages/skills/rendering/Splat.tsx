/** Coding Skills ▸ Rays and splats ▸ section "splat": projecting a 3-D Gaussian and alpha-compositing, in python/wm/splat.py. */
import SplatViewerSingle from "../../../demos/SplatViewerSingle.tsx";
import SplatProjection from "../../../demos/pictures/SplatProjection.tsx";
import source from "../../../../python/wm/splat.py?raw";
import { Figure, HistoryLinks, P, Pictured, Py, pyRegion, Section, SiteLink, Sources } from "../../kit.tsx";

export default function Splat({ n }: { n: number }) {
  const project = [pyRegion(source, "perspective_jacobian"), pyRegion(source, "project_covariance")].join("\n\n\n");
  const blend = [pyRegion(source, "splat_alpha"), pyRegion(source, "composite_front_to_back")].join("\n\n\n");
  return (
    <Section page="rendering" id="splat" n={n} title={["Projecting and compositing Gaussians", "投影與合成高斯"]}>
      <P t={["**What does it take to draw one 3-D Gaussian on the screen?**", "**在螢幕上畫出一個三維高斯需要什麼？**"]} />
      <P
        t={[
          "Three steps: move its mean through the camera; push its covariance through the **Jacobian** of the perspective divide, so the 3-D ellipsoid becomes a 2-D ellipse; then, at each pixel, turn the ellipse into an alpha and blend it over what is already there, nearest first. Here they are in `python/wm/splat.py`; every splat demo on this site runs the same model, ported to TypeScript.",
          "三個步驟：把平均點送過相機；把共變異數送過透視除法的**雅可比矩陣**，讓三維橢球變成二維橢圓；然後在每個像素把橢圓轉成 alpha，由近到遠疊到已有的顏色上。下面就是 `python/wm/splat.py` 中的程式碼；本站所有潑濺示範執行的是同一個模型，移植成 TypeScript。",
        ]}
      />
      <Pictured
        tex="\Sigma' = J\,W\,\Sigma\,W^\top J^\top,\qquad J = \frac{\partial(u, v)}{\partial(t_x, t_y, t_z)}"
        caption={[
          "$W$ only changes the axes the ellipsoid is written in; $J$ flattens it onto the image as the 2-D ellipse $\Sigma'$. Below: the real projection $u = f t_x/t_z$ curves with depth and $J$ is its tangent at $\mu$, so $\Sigma'$ is close for small splats and only approximate for large ones.",
          "$W$ 只改變描述橢球所用的座標軸；$J$ 把它壓平到影像上，成為二維橢圓 $\Sigma'$。下方：真正的投影 $u = f t_x/t_z$ 隨深度彎曲，$J$ 是它在 $\mu$ 的切線；所以 $\Sigma'$ 對小潑濺很接近，對大潑濺只是近似。",
        ]}
      >
        <SplatProjection />
      </Pictured>
      <Py
        title="python/wm/splat.py"
        code={project}
        note={[
          "$J$ is $2\\times3$; `T = J @ cam.W` is formed once, then $\\Sigma' = T\\Sigma T^\\top$, and `blur` adds the $0.3$ px² low-pass filter of 3DGS.",
          "$J$ 是 $2\\times3$；先算出 `T = J @ cam.W`，再得 $\\Sigma' = T\\Sigma T^\\top$；`blur` 加上 3DGS 的 $0.3$ px² 低通濾波。",
        ]}
      />
      <Figure
        caption={[
          "**One Gaussian through a pinhole camera.** Gray: 500 samples of the 3-D Gaussian pushed through the exact projection. Amber: the EWA ellipses at 1σ and 2σ from `project_covariance`. Bring it close ($z$ small), far off-axis, or make it long, and the samples bend away from the ellipse: the linearisation is only exact for a point.",
          "**一個高斯穿過針孔相機。** 灰：三維高斯的 500 個樣本，經過精確投影。琥珀：`project_covariance` 算出的 1σ 與 2σ EWA 橢圓。讓它靠近（$z$ 小）、遠離光軸或拉長，樣本就會彎離橢圓：線性化只有在一個點上才精確。",
        ]}
      >
        <SplatViewerSingle />
      </Figure>
      <P
        t={[
          "Blending: sort by depth, then for each pixel accumulate $C \\mathrel{+}= c_i\\alpha_i T$ and $T \\mathrel{*}= 1-\\alpha_i$. Front to back gives the same colour as painting back to front (the tests check it), but it lets a pixel stop once $T$ is tiny. The full `composite` in the same file adds that early stop and updates each splat's bounding box at once instead of looping over every pixel.",
          "混合：依深度排序，然後在每個像素累加 $C \\mathrel{+}= c_i\\alpha_i T$、$T \\mathrel{*}= 1-\\alpha_i$。由前往後與由後往前塗色結果相同（測試會檢查），但前者讓像素在 $T$ 很小時就能停下。同一檔案中完整的 `composite` 加上了這個提早停止，並且一次更新每個潑濺外接框內的像素，而不是逐一走訪每個像素。",
        ]}
      />
      <Py
        title="python/wm/splat.py"
        code={blend}
        note={["`ALPHA_MIN = 1/255` and `ALPHA_MAX = 0.99` are the thresholds of the 3DGS rasteriser.", "`ALPHA_MIN = 1/255` 與 `ALPHA_MAX = 0.99` 是 3DGS 光柵化器的門檻。"]}
      />
      <p>
        <SiteLink to={["concept", "scenes", "gaussians"]} label={["The concept page, with a fitted scene", "概念頁，含一個擬合好的場景"]} />
      </p>
      <Sources
        items={[
          { label: "Zwicker, Pfister, van Baar & Gross (2001), EWA volume splatting", url: "https://doi.org/10.1109/VISUAL.2001.964490" },
          { label: "Kerbl et al. (2023), 3D Gaussian Splatting for Real-Time Radiance Field Rendering", url: "https://arxiv.org/abs/2308.04079" },
          { label: "graphdeco-inria/gaussian-splatting: the reference implementation", url: "https://github.com/graphdeco-inria/gaussian-splatting" },
        ]}
      />
      <HistoryLinks ids={["ewa", "gaussian-splatting"]} />
    </Section>
  );
}
