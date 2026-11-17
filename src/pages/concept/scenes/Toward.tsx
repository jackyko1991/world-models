/** Concepts ▸ 3D scene models ▸ section "toward": NeRF and 3DGS compared, moving scenes, and where they meet world models. */
import { RichText, useLang } from "@learnkit/web";
import MovingSplats from "../../../demos/MovingSplats.tsx";
import TowardDeform from "../../../demos/pictures/TowardDeform.tsx";
import { Evidence, Figure, HistoryLinks, List, P, Pictured, Section, SiteLink, Sources, Table, type L } from "../../kit.tsx";

function Txt({ t }: { t: L }) {
  const { pick } = useLang();
  return <RichText text={pick(t)} />;
}

export default function Toward({ n }: { n: number }) {
  return (
    <Section page="scenes" id="toward" n={n} title={["NeRF and 3DGS compared, and toward world models", "NeRF 與 3DGS 的比較，以及走向世界模型"]}>
      <p className="text-base font-medium text-gray-900">
        <Txt t={["Implicit or explicit: which kind of scene can a world model predict, edit and act in?", "隱式或顯式：哪一種場景能讓世界模型預測、編輯並在其中行動？"]} />
      </p>
      <P
        t={[
          "A world model needs a **state**: something it can roll forward in time, change when an action happens, and turn into a picture. NeRF and Gaussian splatting store the same kind of scene in opposite ways. A NeRF keeps it **implicitly**, spread through the weights of a network you can only query point by point. 3DGS keeps it **explicitly**, as a list of objects you can read, select and move.",
          "世界模型需要一個**狀態**：能隨時間往前推、在動作發生時改變、並能轉成畫面的東西。NeRF 和高斯潑濺用相反的方式儲存同一類場景。NeRF 把它**隱式**地分散在網路權重裡，只能逐點查詢；3DGS 把它**顯式**地存成一份清單，裡面的物件可以讀取、選取、移動。",
        ]}
      />
      <Table
        head={[
          ["", ""],
          ["NeRF (implicit)", "NeRF（隱式）"],
          ["3D Gaussian splatting (explicit)", "三維高斯潑濺（顯式）"],
        ]}
        rows={[
          [["**The scene is**", "**場景是**"], ["the weights of an MLP $(\\mathbf{x}, \\mathbf{d}) \\mapsto (\\sigma, \\mathbf{c})$", "一個多層感知器 $(\\mathbf{x}, \\mathbf{d}) \\mapsto (\\sigma, \\mathbf{c})$ 的權重"], ["a list of Gaussians $(\\mu, q, s, o, \\text{SH})$", "一份高斯清單 $(\\mu, q, s, o, \\text{SH})$"]],
          [["**A pixel costs**", "**一個像素要花**"], ["a ray march: the network queried at many samples", "一次光線步進：在許多取樣點查詢網路"], ["sorting, then blending the few splats that cover it", "排序，再混合蓋住它的少數潑濺"]],
          [["**Speed** (Mip-NeRF360 scenes)", "**速度**（Mip-NeRF360 場景）"], ["Mip-NeRF360: 0.06 frames/s; 48 h to train", "Mip-NeRF360：每秒 0.06 幀；訓練 48 小時"], ["134 frames/s; about 42 min to train", "每秒 134 幀；訓練約 42 分鐘"]],
          [["**Memory**", "**記憶體**"], ["8.6 MB (Mip-NeRF360)", "8.6 MB（Mip-NeRF360）"], ["734 MB (millions of Gaussians)", "734 MB（數百萬個高斯）"]],
          [["**Editing**", "**編輯**"], ["hard: every weight affects everywhere", "困難：每個權重都影響所有地方"], ["direct: select, move, delete, copy Gaussians", "直接：選取、移動、刪除、複製高斯"]],
          [["**Moving it in time**", "**讓它隨時間變化**"], ["add $t$ as an input, or warp the query points", "把 $t$ 加入輸入，或扭曲查詢點"], ["move each Gaussian: $\\mu(t), q(t)$", "移動每個高斯：$\\mu(t), q(t)$"]],
        ]}
      />
      <p className="text-xs text-gray-500">
        <Txt
          t={[
            "Speed and memory are from Table 1 of Kerbl et al. (2023), each method on the authors' hardware; hash-grid NeRFs such as Instant-NGP sit in between (9.4 frames/s, 48 MB).",
            "速度與記憶體數字取自 Kerbl 等人（2023）的表 1，各方法在作者的硬體上測量；像 Instant-NGP 這類雜湊網格 NeRF 介於兩者之間（每秒 9.4 幀、48 MB）。",
          ]}
        />{" "}
        <SiteLink to={["concept", "scenes", "nerf"]} label={["Back to NeRF", "回到 NeRF"]} />
      </p>

      <h3 className="pt-2 text-sm font-semibold text-gray-900">
        <Txt t={["Scenes that move: D-NeRF and 4D-GS", "會動的場景：D-NeRF 與 4D-GS"]} />
      </h3>
      <P
        t={[
          "Both representations were extended to time in the same way: keep one **canonical** scene, and learn a **deformation** that says where each part is at time $t$. D-NeRF (Pumarola et al., 2020) learns a network that maps a point at time $t$ back into the canonical space, where an ordinary NeRF is queried. 4D Gaussian splatting (Wu et al., 2023) keeps one set of canonical Gaussians and predicts how each one moves, turns and stretches at time $t$, from features in a decomposed 4-D voxel grid (in the manner of HexPlane) and a small MLP:",
          "兩種表示法都以同樣的方式延伸到時間：保留一個**標準（canonical）**場景，再學一個**形變**，說明每個部分在時間 $t$ 位於哪裡。D-NeRF（Pumarola 等人，2020）學一個網路，把時間 $t$ 的點映回標準空間，再在那裡查詢普通的 NeRF。四維高斯潑濺（4D-GS，Wu 等人，2023）保留一組標準高斯，並從一個分解的四維體素網格（仿 HexPlane）的特徵加上一個小型多層感知器，預測每個高斯在時間 $t$ 如何移動、旋轉與伸縮：",
        ]}
      />
      <Pictured
        tex="\mu(t) = \mu_0 + \Delta\mu(\mu_0, t),\qquad q(t) = \Delta q(\mu_0, t)\otimes q_0,\qquad s(t) = s_0 + \Delta s(\mu_0, t)."
        caption={[
          "Canonical Gaussians (gray, dashed, $t = 0$) and where the deformation puts them at $t_1$ and $t_2$ (amber): each mean slides by $\Delta\mu$ along a short path; one Gaussian also turns, $q(t)$, another stretches, $s(t)$. Drawn by hand, not learned.",
          "標準高斯（灰色虛線，$t = 0$），以及形變在 $t_1$、$t_2$ 把它們放到的位置（琥珀色）：每個平均沿短路徑移動 $\Delta\mu$；其中一個還會旋轉，$q(t)$，另一個會伸長，$s(t)$。圖是手繪的，不是學出來的。",
        ]}
      >
        <TowardDeform />
      </Pictured>
      <P
        t={[
          "4D-GS reports real-time rendering of dynamic scenes, 82 frames per second at 800×800 on an RTX 3090. In the demo below the deformation is written by hand instead of learned: a ball bounces (and squashes near the floor), a box spins, and its Gaussians turn with it, a small moon orbits.",
          "4D-GS 報告能即時渲染動態場景：在 RTX 3090 上以 800×800 達到每秒 82 幀。下面的示範中，形變是手寫的，不是學出來的：球在彈跳（靠近地板時被壓扁），方塊在旋轉、它的高斯跟著轉，一個小月亮在繞行。",
        ]}
      />
      <Figure
        caption={[
          "**A moving Gaussian scene.** About 1060 canonical Gaussians and a deformation field $\\mu(t), q(t)$ written by hand (`deform` in `python/wm/splat.py`; the demo runs the same model, ported to TypeScript), drawn by the same renderer as the scene above. **Show paths** traces where some of the means go over the whole clip. A toy: nothing here is learned from video.",
          "**一個會動的高斯場景。** 約 1060 個標準高斯，加上一個手寫的形變場 $\\mu(t), q(t)$（`python/wm/splat.py` 中的 `deform`；示範執行的是同一個模型，移植成 TypeScript），由與上面場景相同的渲染器繪製。**顯示軌跡**會描出部分平均點在整段片段中的去向。這是玩具：這裡沒有任何東西是從影片學來的。",
        ]}
      >
        <MovingSplats />
      </Figure>
      <P
        t={[
          "**What to notice.** The scene at every $t$ is the *same* Gaussians in new places, so each one keeps its identity: orbit the camera at a fixed $t$ and nothing changes but the view; change $t$ at a fixed camera and nothing changes but the motion. Time and viewpoint are separate knobs. A model that generates video frames has no such guarantee: it has to *remember* what was behind you.",
          "**留意之處。** 每個時間 $t$ 的場景都是*同一批*高斯換了位置，所以每個高斯都保有自己的身分：固定 $t$ 環繞相機，只有視角改變；固定相機改變 $t$，只有運動改變。時間與視角是兩個獨立的旋鈕。生成影片幀的模型沒有這種保證：它必須*記得*你背後有什麼。",
        ]}
      />

      <h3 className="pt-2 text-sm font-semibold text-gray-900">
        <Txt t={["Where they meet world models", "與世界模型交會之處"]} />
      </h3>
      <List
        items={[
          [
            "**Generated 3-D worlds, saved as splats.** World Labs made Marble available to everyone on 12 November 2025: it generates a persistent 3-D world from text, images or video, which can be edited and expanded, and exports it as Gaussian splats (which World Labs calls its highest-fidelity representation), as meshes, or as video. The generative model imagines; the explicit splat list keeps what it imagined still when you look away.",
            "**生成的三維世界，存成潑濺。** World Labs 在 2025 年 11 月 12 日向所有人開放 Marble：它從文字、圖片或影片生成一個持久、可編輯與擴展的三維世界，並匯出為高斯潑濺（World Labs 稱之為它最高保真的表示法）、網格或影片。生成模型負責想像；顯式的潑濺清單讓想像出的東西在你轉開視線時仍留在原處。",
          ],
          [
            "**Worlds as frames.** Google DeepMind's Genie 3 (August 2025) takes the other road: it generates the frames directly, in real time (720p at 24 frames per second), and keeps a world consistent for a few minutes without any explicit 3-D state. Its scene lives implicitly inside the model, like a NeRF's inside its weights, but generated rather than fitted.",
            "**以幀呈現的世界。** Google DeepMind 的 Genie 3（2025 年 8 月）走另一條路：它直接即時生成畫面（720p、每秒 24 幀），在沒有任何顯式三維狀態的情況下，讓世界保持數分鐘的一致。它的場景隱式地存在模型裡，就像 NeRF 的場景存在權重裡，只是由生成而非擬合得來。",
          ],
          [
            "**3DGS as a simulator for robots.** SplatSim (Qureshi et al., 2024) keeps a robot simulator's physics (PyBullet) but replaces its mesh rendering with Gaussian splats of a real scene, reconstructed from a video, so that a policy trained on RGB images in simulation sees something close to the real camera. Their manipulation policies, trained only in simulation, reached an average 86.25% success zero-shot on the real robot, against 97.5% for policies trained on real data.",
            "**把 3DGS 當作機器人模擬器。** SplatSim（Qureshi 等人，2024）保留機器人模擬器的物理（PyBullet），但把它的網格渲染換成從一段影片重建的真實場景高斯潑濺，讓在模擬中以 RGB 影像訓練的策略，看到接近真實相機的畫面。他們只在模擬中訓練的操作策略，零樣本部署到真實機器人上平均成功率為 86.25%，以真實資料訓練的策略則為 97.5%。",
          ],
        ]}
      />
      <div className="space-y-1.5 rounded-lg border border-gray-200 p-3 text-xs">
        <p className="flex flex-wrap items-baseline gap-2">
          <Evidence level="established" />
          <Txt t={["Explicit splats render far faster than MLP NeRFs at similar quality, and can be edited directly.", "在相近品質下，顯式潑濺比多層感知器 NeRF 渲染快得多，而且能直接編輯。"]} />
        </p>
        <p className="flex flex-wrap items-baseline gap-2">
          <Evidence level="demonstrated" />
          <Txt t={["Generated worlds exported as splats (Marble); splat scenes as photo-real simulators for robot policies (SplatSim).", "以潑濺匯出的生成世界（Marble）；把潑濺場景當作機器人策略的寫實模擬器（SplatSim）。"]} />
        </p>
        <p className="flex flex-wrap items-baseline gap-2">
          <Evidence level="speculative" />
          <Txt
            t={[
              "That a world model's predicted state should itself be an explicit 3-D scene (Gaussians moved by actions, as the demo moves them by $t$) rather than frames. As of November 2026 both roads are being followed.",
              "世界模型預測的狀態本身應該是一個顯式三維場景（由動作移動高斯，就像示範中由 $t$ 移動它們），而不是畫面。截至 2026 年 11 月，兩條路都有人在走。",
            ]}
          />
        </p>
      </div>
      <p>
        <SiteLink to={["concept", "history"]} label={["Both strands in the History", "歷史中的兩條線"]} />
      </p>
      <Sources
        items={[
          { label: "Kerbl et al. (2023), 3D Gaussian Splatting for Real-Time Radiance Field Rendering (Table 1)", url: "https://arxiv.org/abs/2308.04079" },
          { label: "Pumarola, Corona, Pons-Moll & Moreno-Noguer (2020), D-NeRF: Neural Radiance Fields for Dynamic Scenes", url: "https://arxiv.org/abs/2011.13961" },
          { label: "Wu et al. (2023), 4D Gaussian Splatting for Real-Time Dynamic Scene Rendering", url: "https://arxiv.org/abs/2310.08528" },
          { label: "World Labs (12 November 2025), Marble, our frontier multimodal world model", url: "https://www.worldlabs.ai/blog/marble-world-model" },
          { label: "Google DeepMind (2025), Genie 3: A new frontier for world models", url: "https://deepmind.google/discover/blog/genie-3-a-new-frontier-for-world-models/" },
          { label: "Qureshi et al. (2024), SplatSim: Zero-Shot Sim2Real Transfer of RGB Manipulation Policies Using Gaussian Splatting", url: "https://arxiv.org/abs/2409.10161" },
        ]}
      />
      <HistoryLinks ids={["marble", "genie-3"]} />
    </Section>
  );
}
