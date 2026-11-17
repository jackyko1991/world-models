/** Concepts ▸ 3D scene models ▸ section "volume": density, transmittance and the volume-rendering sum. */
import { Question, Sub } from "../../../demos/SectionText.tsx";
import VolumeRay from "../../../demos/VolumeRay.tsx";
import { Callout, Figure, HistoryLinks, List, P, Pictured, Section, SiteLink, Sources } from "../../kit.tsx";
import { VolumeIntegralPicture, VolumeSegmentPicture, VolumeSumPicture, VolumeWeightsPicture } from "../../../demos/pictures/VolumePictures.tsx";

export default function Volume({ n }: { n: number }) {
  return (
    <Section page="scenes" id="volume" n={n} title={["Volume rendering", "體積渲染"]}>
      <Question t={["How does a ray through a cloud of density turn into one pixel's colour?", "一條穿過密度雲的光線，怎樣變成一個像素的顏色？"]} />
      <P
        t={[
          "Picture fog lit from inside. Follow one ray from the eye into it: every short stretch of fog gives off a little light of its own colour, and also blocks some of the light coming from further away. What reaches the eye is the sum of all those contributions, each dimmed by the fog in front of it. That is the whole idea; the rest is making it precise enough to compute.",
          "想像一團從內部發光的霧。從眼睛沿一條光線走進去：每一小段霧都會發出一點自己顏色的光，同時也擋住一部分從更遠處來的光。到達眼睛的，就是所有這些貢獻的總和，而每一份都被它前方的霧削弱過。整個想法就是這樣；其餘的工作是把它說得夠精確，好讓電腦能算。",
        ]}
      />
      <P
        t={[
          "A scene is two fields over space. The **density** $\\sigma(\\mathbf{x}) \\ge 0$ is the chance per unit length that light is absorbed at $\\mathbf{x}$ (zero in empty space, large inside a solid), and $\\mathbf{c}(\\mathbf{x})$ is the colour emitted there. A ray from the camera centre $\\mathbf{o}$ in direction $\\mathbf{d}$ is $\\mathbf{r}(t) = \\mathbf{o} + t\\mathbf{d}$, between a near bound $t_n$ and a far bound $t_f$.",
          "場景是空間上的兩個場。**密度** $\\sigma(\\mathbf{x}) \\ge 0$ 是光在 $\\mathbf{x}$ 處每單位長度被吸收的機率（空處為零，實體內部很大），$\\mathbf{c}(\\mathbf{x})$ 則是那裡發出的顏色。從相機中心 $\\mathbf{o}$ 沿方向 $\\mathbf{d}$ 出發的光線寫成 $\\mathbf{r}(t) = \\mathbf{o} + t\\mathbf{d}$，介於近界 $t_n$ 與遠界 $t_f$ 之間。",
        ]}
      />
      <P
        t={[
          "The **transmittance** $T(t)$ is the chance that light travels from $t_n$ to $t$ without being absorbed. Over a short step $dt$ it shrinks by the factor $1 - \\sigma\\,dt$, so $dT/dt = -\\sigma T$ and",
          "**透射率** $T(t)$ 是光從 $t_n$ 走到 $t$ 而不被吸收的機率。走一小步 $dt$，它乘上 $1 - \\sigma\\,dt$，所以 $dT/dt = -\\sigma T$，於是",
        ]}
      />
      <Pictured
        tex="T(t) = \exp\!\Big(-\int_{t_n}^{t} \sigma(\mathbf{r}(s))\,ds\Big), \qquad C = \int_{t_n}^{t_f} T(t)\,\sigma(\mathbf{r}(t))\,\mathbf{c}(\mathbf{r}(t))\,dt."
        caption={[
          "Light given off at a point $t$ inside the cloud heads back to the camera and is dimmed by all the matter between $t_n$ and $t$ (the shaded stretch): $T(t)$ is the share that gets through. The pixel adds up these surviving glows over every $t$.",
          "雲內某點 $t$ 發出的光往相機走，途中被 $t_n$ 到 $t$ 之間的所有物質削弱（陰影段）：$T(t)$ 是能通過的比例。像素就是把每個 $t$ 存活下來的光加總。",
        ]}
      >
        <VolumeIntegralPicture />
      </Pictured>
      <P
        t={[
          "Read the colour integral term by term: light emitted at $t$ (in proportion to how much matter is there, $\\sigma$, with colour $\\mathbf{c}$) that survives the trip back to the camera ($T$). This is the emission–absorption model that Kajiya and Von Herzen used to ray-trace clouds in 1984 and that Max wrote down in this form in 1995.",
          "逐項讀這個顏色積分：在 $t$ 處發出的光（與那裡的物質多寡 $\\sigma$ 成正比，顏色為 $\\mathbf{c}$），乘上它一路回到相機還存活的比例（$T$）。這就是卡吉雅與馮·赫岑在 1984 年用來以光線追蹤畫雲的發射–吸收模型，馬克斯在 1995 年把它寫成這個形式。",
        ]}
      />

      <Sub t={["From the integral to a sum", "從積分到總和"]} />
      <P
        t={[
          "A computer cannot integrate an arbitrary field exactly, so we take samples $t_1 < t_2 < \\dots < t_N$ along the ray and pretend $\\sigma$ and $\\mathbf{c}$ are constant on each segment $[t_i, t_{i+1})$, whose length is $\\delta_i = t_{i+1} - t_i$. Inside segment $i$ the transmittance then decays exponentially from its value $T_i$ at the start, $T(t_i + s) = T_i e^{-\\sigma_i s}$, and the segment's share of the integral can be done by hand:",
          "電腦無法精確積分任意的場，所以我們沿光線取樣 $t_1 < t_2 < \\dots < t_N$，並假設 $\\sigma$ 與 $\\mathbf{c}$ 在每一段 $[t_i, t_{i+1})$ 上是常數，段長 $\\delta_i = t_{i+1} - t_i$。於是在第 $i$ 段內，透射率從起點的值 $T_i$ 開始指數衰減，$T(t_i + s) = T_i e^{-\\sigma_i s}$，而這一段對積分的貢獻可以手算出來：",
        ]}
      />
      <Pictured
        tex="\int_0^{\delta_i} T_i e^{-\sigma_i s}\,\sigma_i\,\mathbf{c}_i\,ds = T_i\big(1 - e^{-\sigma_i\delta_i}\big)\,\mathbf{c}_i."
        caption={[
          "One constant slab: light entering from behind fades exponentially inside it, so $e^{-\\sigma_i\\delta_i}$ passes and $1 - e^{-\\sigma_i\\delta_i}$ is stopped. The slab glows with exactly that weight, and its glow is dimmed by $T_i$ on the way to the camera.",
          "一片常數薄層：從後方進入的光在其中指數衰減，所以通過 $e^{-\\sigma_i\\delta_i}$、擋下 $1 - e^{-\\sigma_i\\delta_i}$。薄層正好以這個權重發光，而它的光在前往相機的路上被 $T_i$ 削弱。",
        ]}
      >
        <VolumeSegmentPicture />
      </Pictured>
      <P t={["Adding the segments gives the sum NeRF uses:", "把各段加起來，就得到 NeRF 使用的總和："]} />
      <Pictured
        tex="C \approx \sum_{i=1}^{N} \underbrace{T_i\,(1 - e^{-\sigma_i\delta_i})}_{w_i}\,\mathbf{c}_i, \qquad T_i = \exp\!\Big(-\sum_{j<i}\sigma_j\delta_j\Big) = \prod_{j<i}(1-\alpha_j), \qquad \alpha_i = 1 - e^{-\sigma_i\delta_i}."
        caption={[
          "Slabs in a row, darker for denser. The amber band is what the camera can still see: each slab takes away its fraction $\\alpha_j$, so the band's height before slab $i$ is $T_i = \\prod_{j<i}(1-\\alpha_j)$, and slab $i$ contributes $w_i = T_i\\alpha_i$ of its colour.",
          "排成一列的薄層，越密越深。琥珀色光帶是相機還看得見的部分：每片薄層拿走自己的比例 $\\alpha_j$，所以第 $i$ 片之前的光帶高度是 $T_i = \\prod_{j<i}(1-\\alpha_j)$，而第 $i$ 片貢獻其顏色的 $w_i = T_i\\alpha_i$。",
        ]}
      >
        <VolumeSumPicture />
      </Pictured>
      <List
        items={[
          [
            "$\\alpha_i$ is the **opacity** of segment $i$: the chance the ray stops inside it. A thin or empty segment has $\\alpha_i \\approx \\sigma_i\\delta_i \\approx 0$; a long stretch of solid has $\\alpha_i \\to 1$.",
            "$\\alpha_i$ 是第 $i$ 段的**不透明度**：光線在這一段內停下的機率。薄或空的段落 $\\alpha_i \\approx \\sigma_i\\delta_i \\approx 0$；一長段實體則 $\\alpha_i \\to 1$。",
          ],
          [
            "$T_i$ is the chance the ray reaches sample $i$ at all, and $w_i = T_i\\alpha_i$ is the chance it stops **there**: sample $i$'s weight in the pixel.",
            "$T_i$ 是光線能走到第 $i$ 個取樣點的機率，$w_i = T_i\\alpha_i$ 則是它恰好停在**那裡**的機率：第 $i$ 個取樣點在像素中所占的權重。",
          ],
          [
            "Written with $\\alpha$, this is front-to-back alpha compositing, the same rule 3D Gaussian splatting uses for its sorted splats.",
            "用 $\\alpha$ 寫出來，這就是由前到後的 alpha 合成，三維高斯潑濺對排序後的潑濺點用的也是同一條規則。",
          ],
        ]}
      />

      <Sub t={["Why the weights sum to $1 - T_{\\text{final}}$", "為什麼權重加總為 $1 - T_{\\text{final}}$"]} />
      <P
        t={[
          "Since $T_{i+1} = T_i(1 - \\alpha_i)$, each weight is a difference of neighbouring transmittances, $w_i = T_i\\alpha_i = T_i - T_{i+1}$. The sum telescopes:",
          "因為 $T_{i+1} = T_i(1 - \\alpha_i)$，每個權重都是相鄰兩個透射率的差，$w_i = T_i\\alpha_i = T_i - T_{i+1}$。總和會逐項相消：",
        ]}
      />
      <Pictured
        tex="\sum_{i=1}^{N} w_i = (T_1 - T_2) + (T_2 - T_3) + \dots + (T_N - T_{N+1}) = 1 - T_{\text{final}}, \qquad T_1 = 1."
        caption={[
          "Transmittance falls in steps from $T_1 = 1$; each drop is a weight $w_i$. Stacked, the drops fill exactly $1 - T_{\\text{final}}$, and the gray remainder $T_{\\text{final}}$ is the light left over for the background.",
          "透射率從 $T_1 = 1$ 一級級下降；每一級落差就是一個權重 $w_i$。把落差疊起來，剛好填滿 $1 - T_{\\text{final}}$，剩下的灰色部分 $T_{\\text{final}}$ 就是留給背景的光。",
        ]}
      >
        <VolumeWeightsPicture />
      </Pictured>
      <P
        t={[
          "So the weights are a probability distribution over where the ray stops, and the missing mass $T_{\\text{final}}$ is the chance it passes through everything. That remainder is exactly where the background goes: the pixel is $C + T_{\\text{final}}\\,\\mathbf{c}_{\\text{bg}}$. Every weight lies in $[0, 1]$ and they never add up to more than one, whatever the densities, so the sum can never invent light, and the identity holds exactly for any sample spacing; the samples only decide how well the sum approximates the integral.",
          "所以這些權重是「光線停在哪裡」的機率分布，缺少的質量 $T_{\\text{final}}$ 則是它穿過一切的機率。背景正好填進這個餘數：像素是 $C + T_{\\text{final}}\\,\\mathbf{c}_{\\text{bg}}$。不論密度多少，每個權重都在 $[0, 1]$ 之間，總和也不會超過一，所以這個總和不會憑空造出光；而且這個恆等式對任何取樣間距都精確成立，取樣只決定這個總和有多接近積分。",
        ]}
      />

      <Figure
        caption={[
          "Drag the camera (or use the buttons; with the slice focused, arrow keys move it and Q/E turn it). White dots are samples, amber bars across the ray are the weights $w_i$, and the chart plots them with the transmittance $T$ (gray). *Fine samples* adds NeRF's second pass (sky), drawn where the weights are. A toy: a 2-D slice, density made of four Gaussian blobs, a white background.",
          "拖曳相機（或用按鈕；選取切面後，方向鍵移動相機，Q／E 轉向）。白點是取樣點，橫跨光線的琥珀色長條是權重 $w_i$，下方圖表畫出它們與透射率 $T$（灰色）。*細取樣* 會加上 NeRF 的第二輪取樣（天藍色），落在權重大的地方。這是玩具示範：二維切面、由四個高斯團塊組成的密度、白色背景。",
        ]}
      >
        <VolumeRay />
      </Figure>
      <List
        items={[
          [
            "**The first surface wins.** Aim through the dense yellow or blue blob: the weights pile up where the ray enters it, $T$ drops towards zero, and whatever lies behind hardly counts.",
            "**第一個表面勝出。** 讓光線穿過濃密的黃色或藍色團塊：權重堆在光線進入它的地方，$T$ 掉到接近零，後面的東西幾乎不算數。",
          ],
          [
            "**The sum checks itself.** The line under the slice shows $\\sum_i w_i$ and $1 - T_{\\text{final}}$: equal for every camera and every $N$.",
            "**總和會自我檢查。** 切面下方那一行顯示 $\\sum_i w_i$ 與 $1 - T_{\\text{final}}$：對每個相機位置、每個 $N$ 都相等。",
          ],
          [
            "**Too few samples miss thin things.** With $N$ around 4 the small yellow blob can fall between samples and vanish, or a single sample can stand for a long, wrongly coloured segment. Raise $N$ and the pixel settles. NeRF spends its samples where the weights are instead of everywhere, which is what *fine samples* shows.",
            "**取樣太少會漏掉細的東西。** $N$ 大約 4 時，小小的黃色團塊可能落在兩個取樣點之間而消失，或者一個取樣點代表了一長段顏色不對的區間。把 $N$ 調高，像素就穩定下來。NeRF 把取樣點花在權重大的地方，而不是平均撒開，這就是 *細取樣* 所示範的。",
          ],
        ]}
      />
      <Callout kind="note" title={["Differentiable by construction", "天生可微分"]}>
        <P
          t={[
            "Every step of the sum is smooth in $\\sigma_i$ and $\\mathbf{c}_i$. If the densities and colours come from a model with parameters, the gradient of a pixel's error flows back through the sum to those parameters. That is all NeRF needs, next section.",
            "這個總和的每一步對 $\\sigma_i$ 與 $\\mathbf{c}_i$ 都是平滑的。如果密度與顏色來自一個帶參數的模型，像素誤差的梯度就能穿過這個總和，傳回那些參數。NeRF 需要的就只有這一點，見下一節。",
          ]}
        />
        <p>
          <SiteLink to={["skills", "rendering", "rays"]} label={["The code: camera rays and a volume-rendering function", "程式碼：相機光線與體積渲染函式"]} />
        </p>
      </Callout>
      <Sources
        items={[
          { label: "Kajiya & Von Herzen (1984), Ray tracing volume densities, SIGGRAPH", url: "https://doi.org/10.1145/964965.808594" },
          { label: "Max (1995), Optical models for direct volume rendering, IEEE TVCG", url: "https://doi.org/10.1109/2945.468400" },
          { label: "Mildenhall et al. (2020), NeRF, §4 (the quadrature)", url: "https://arxiv.org/abs/2003.08934" },
        ]}
      />
      <HistoryLinks ids={["volume-rendering"]} />
    </Section>
  );
}
