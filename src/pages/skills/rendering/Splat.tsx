/** Coding Skills ▸ Rays and splats ▸ section "splat": projecting a 3-D Gaussian and alpha-compositing, in src/models/splat.ts. */
import SplatViewerSingle from "../../../demos/SplatViewerSingle.tsx";
import source from "../../../models/splat.ts?raw";
import { Code, Eq, Figure, HistoryLinks, P, Section, SiteLink, Sources } from "../../kit.tsx";

/** A real excerpt of splat.ts: from the line starting `start` through the next line that is exactly `}`. */
function excerpt(start: string): string {
  const lines = source.split("\n");
  const i = lines.findIndex((l) => l.startsWith(start));
  if (i < 0) throw new Error(`Splat: no "${start}" in splat.ts`);
  const j = lines.findIndex((l, k) => k > i && l === "}");
  const doc = i > 0 && lines[i - 1].startsWith("/**") ? i - 1 : i;
  return lines.slice(doc, j + 1).join("\n");
}

export default function Splat({ n }: { n: number }) {
  const project = [excerpt("export function perspectiveJacobian"), excerpt("export function projectCovariance")].join("\n\n");
  const blend = [excerpt("export function splatAlpha"), excerpt("export function compositeFrontToBack")].join("\n\n");
  return (
    <Section page="rendering" id="splat" n={n} title={["Projecting and compositing Gaussians", "投影與合成高斯"]}>
      <P t={["**What does it take to draw one 3-D Gaussian on the screen?**", "**在螢幕上畫出一個三維高斯需要什麼？**"]} />
      <P
        t={[
          "Three steps: move its mean through the camera; push its covariance through the **Jacobian** of the perspective divide, so the 3-D ellipsoid becomes a 2-D ellipse; then, at each pixel, turn the ellipse into an alpha and blend it over what is already there, nearest first. Here they are in `src/models/splat.ts`, the file every splat demo on this site runs.",
          "三個步驟：把平均點送過相機；把共變異數送過透視除法的**雅可比矩陣**，讓三維橢球變成二維橢圓；然後在每個像素把橢圓轉成 alpha，由近到遠疊到已有的顏色上。下面就是 `src/models/splat.ts` 中的程式碼，本站所有潑濺示範都執行這個檔案。",
        ]}
      />
      <Eq tex="\Sigma' = J\,W\,\Sigma\,W^\top J^\top,\qquad J = \frac{\partial(u, v)}{\partial(t_x, t_y, t_z)}" />
      <Code
        title="src/models/splat.ts"
        code={project}
        note={[
          "$J$ is $2\\times3$ (row-major in a flat array); `T = J W` is formed once, then $\\Sigma' = T\\Sigma T^\\top$, and `blur` adds the $0.3$ px² low-pass filter of 3DGS. Only the symmetric entries $[a, b, c]$ are kept.",
          "$J$ 是 $2\\times3$（以平面陣列按列儲存）；先算出 `T = J W`，再得 $\\Sigma' = T\\Sigma T^\\top$；`blur` 加上 3DGS 的 $0.3$ px² 低通濾波。只保留對稱的三個元素 $[a, b, c]$。",
        ]}
      />
      <Figure
        caption={[
          "**One Gaussian through a pinhole camera.** Gray: 500 samples of the 3-D Gaussian pushed through the exact projection. Amber: the EWA ellipses at 1σ and 2σ from `projectCovariance`. Bring it close ($z$ small), far off-axis, or make it long, and the samples bend away from the ellipse: the linearisation is only exact for a point.",
          "**一個高斯穿過針孔相機。** 灰：三維高斯的 500 個樣本，經過精確投影。琥珀：`projectCovariance` 算出的 1σ 與 2σ EWA 橢圓。讓它靠近（$z$ 小）、遠離光軸或拉長，樣本就會彎離橢圓：線性化只有在一個點上才精確。",
        ]}
      >
        <SplatViewerSingle />
      </Figure>
      <P
        t={[
          "Blending: sort by depth, then for each pixel accumulate $C \\mathrel{+}= c_i\\alpha_i T$ and $T \\mathrel{*}= 1-\\alpha_i$. Front to back gives the same colour as painting back to front (the tests check it), but it lets a pixel stop once $T$ is tiny. The full `composite` in the same file adds that early stop and loops over each splat's bounding box instead of over every pixel.",
          "混合：依深度排序，然後在每個像素累加 $C \\mathrel{+}= c_i\\alpha_i T$、$T \\mathrel{*}= 1-\\alpha_i$。由前往後與由後往前塗色結果相同（測試會檢查），但前者讓像素在 $T$ 很小時就能停下。同一檔案中完整的 `composite` 加上了這個提早停止，並且只走訪每個潑濺的外接框，而不是每個像素。",
        ]}
      />
      <Code
        title="src/models/splat.ts"
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
