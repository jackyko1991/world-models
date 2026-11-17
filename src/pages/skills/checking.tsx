/** Coding Skills ▸ Checking a world model (#/skills/checking[/<section>]): rollout error, calibration, sanity tests. */
import { useLang } from "@learnkit/web";
import { SKILLS_OUTLINES } from "../../curriculum.ts";
import { CartpoleErrorPlot } from "../../demos/CartpoleDemo.tsx";
import { RolloutCalibration } from "../../demos/RolloutFan.tsx";
import cartpoleSrc from "../../../python/wm/cartpole.py?raw";
import ensembleSrc from "../../../python/wm/ensemble.py?raw";
import cartpoleTest from "../../../python/tests/test_cartpole.py?raw";
import ensembleTest from "../../../python/tests/test_ensemble.py?raw";
import gridworldTest from "../../../python/tests/test_gridworld.py?raw";
import lossesTest from "../../../python/tests/test_losses.py?raw";
import { CoveragePicture } from "../../demos/pictures/CheckingPictures.tsx";
import { Callout, Figure, List, P, Page, Pictured, Py, pyRegion, Section, SiteLink, Sources, Table, type L } from "../kit.tsx";

const OUTLINE = SKILLS_OUTLINES.find((o) => o.id === "checking")!;
const PAGE = "checking";

export default function Checking({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <Section page={PAGE} id="tests" n={1} title={["Rollout error, calibration and sanity tests", "推演誤差、校準與基本檢查"]}>
        <P
          t={[
            "\"Good enough\" depends on the use. A model for planning ten steps ahead must be right for ten steps; a model whose uncertainty steers exploration must be honest about that uncertainty; any model must at least respect what you know for certain about the world. Those are three different checks, and a low training loss guarantees none of them. The code below is the book's Python (numpy) and its pytest tests; every figure is computed by the same functions, ported to TypeScript to run in the browser, and the tests also check that the two ports agree.",
            "「夠好」取決於用途。用來往前規劃十步的模型，必須在十步內都正確；用不確定性來引導探索的模型，必須對那份不確定性誠實；任何模型至少都必須遵守你確知的世界規律。這是三種不同的檢查，而訓練損失低，並不保證其中任何一種。下面的程式碼是本書的 Python（numpy）與它的 pytest 測試；每張圖都由同一批函式計算，只是移植到 TypeScript 在瀏覽器中執行，而測試也會檢查兩個版本是否一致。",
          ]}
        />

        <Sub n={1} t={["Rollout error against horizon", "推演誤差對步數"]} />
        <P
          t={[
            "Measure the error where you will use the model: run it open loop for $H$ steps from many starting states and compare with the truth at every step. Plot it against $H$, next to the one-step error (the model restarted from the true state each time). The gap between the two curves is compounding error.",
            "在你將使用模型的地方測量誤差：從許多起始狀態開迴路執行 $H$ 步，並在每一步與真實值比較。把它對 $H$ 作圖，旁邊放上單步誤差（每次都從真實狀態重新開始）。兩條曲線之間的差距，就是誤差累積。",
          ]}
        />
        <Py title="python/wm/cartpole.py" code={pyRegion(cartpoleSrc, "horizon")} />
        <Figure caption={["The learned linear cart-pole model, 40 starts, zero force, log scale. The one-step error stays small; the rollout error grows by orders of magnitude.", "學到的線性倒單擺模型，40 個起點、不施力、對數刻度。單步誤差一直很小；推演誤差則增長了好幾個數量級。"]}>
          <CartpoleErrorPlot />
        </Figure>
        <P
          t={[
            "As a test, assert the *shape*, not exact values that would break on any harmless change: the error grows over checkpoints, and the rollout error ends far above the one-step error.",
            "寫成測試時，檢查的是*形狀*，而不是任何無害改動都會打破的精確數值：誤差隨檢查點增長，而推演誤差最後遠高於單步誤差。",
          ]}
        />
        <Py title="python/tests/test_cartpole.py" code={pyRegion(cartpoleTest, "horizon")} />

        <Sub n={2} t={["Calibration of predicted uncertainty", "預測不確定性的校準"]} />
        <P
          t={[
            "A model that reports uncertainty makes a checkable promise: its central 90 % interval should contain the true outcome about 90 % of the time, its 50 % interval about half the time, and so on. A **reliability plot** tests the promise. For each nominal probability $p$, count the fraction of test outcomes that land inside the model's central $p$-interval. For a Gaussian prediction $\\mathcal N(\\mu, s^2)$, that interval is $|y - \\mu| \\le z_p\\, s$ with $z_p = \\Phi^{-1}\\!\\big(\\tfrac{1+p}{2}\\big)$:",
            "會回報不確定性的模型，做出了一個可以檢查的承諾：它的中央 90% 區間應該大約有 90% 的時候包含真實結果，50% 區間大約一半的時候包含，依此類推。**可靠度圖**用來檢驗這個承諾。對每個標稱機率 $p$，計算測試結果落在模型中央 $p$ 區間內的比例。對高斯預測 $\\mathcal N(\\mu, s^2)$ 而言，這個區間是 $|y - \\mu| \\le z_p\\, s$，其中 $z_p = \\Phi^{-1}\\!\\big(\\tfrac{1+p}{2}\\big)$：",
          ]}
        />
        <Pictured
          tex={"\\text{coverage}(p) = \\frac{1}{N}\\sum_{n=1}^{N} \\mathbf 1\\!\\left[\\frac{|y_n - \\mu_n|}{s_n} \\le z_p\\right], \\qquad \\text{calibration error} = \\frac{1}{|P|}\\sum_{p \\in P} |\\text{coverage}(p) - p|"}
          caption={[
            "Left: eight test cases at $p = 0.9$. Each amber bar is the predicted interval $\\mu_n \\pm z_p s_n$, each gray dot the true $y_n$; filled dots fall inside, hollow ones outside. Six of eight inside gives $\\text{coverage}(0.9) = 0.75$. Right: coverage against $p$; the calibration error is the average length of the gaps to the diagonal.",
            "左：$p = 0.9$ 時的八個測試案例。每根琥珀色長條是預測區間 $\\mu_n \\pm z_p s_n$，每個灰點是真實的 $y_n$；實心點落在區間內，空心點落在外面。八個中有六個在內，所以 $\\text{coverage}(0.9) = 0.75$。右：覆蓋率對 $p$ 的圖；校準誤差就是各點到對角線差距的平均長度。",
          ]}
        >
          <CoveragePicture />
        </Pictured>
        <P
          t={[
            "Below, the ensemble of Concepts ▸ Stochasticity and uncertainty is tested on one-step predictions, first with its noise estimate alone ($s = \\hat\\sigma$), then with the members' disagreement added ($s^2 = \\hat\\sigma^2 + \\mathrm{sd}_m^2$).",
            "下面拿「概念 ▸ 隨機性與不確定性」裡的集成模型做單步預測測試：先只用它的雜訊估計（$s = \\hat\\sigma$），再加上成員之間的分歧（$s^2 = \\hat\\sigma^2 + \\mathrm{sd}_m^2$）。",
          ]}
        />
        <Figure caption={["400 test transitions per curve (fixed seed). A curve below the diagonal is overconfident: its intervals are too narrow. A toy: one-dimensional, Gaussian predictions, five members.", "每條曲線用 400 個測試轉移（固定種子）。低於對角線的曲線代表過度自信：它的區間太窄。玩具示範：一維、高斯預測、五個成員。"]}>
          <RolloutCalibration />
        </Figure>
        <List
          items={[
            ["Inside the data, both curves hug the diagonal: the noise estimate is honest there (a little narrow, since it was measured on the training data itself).", "在資料範圍內，兩條曲線都貼近對角線：雜訊估計在那裡是誠實的（略窄一些，因為它是在訓練資料本身上量出來的）。"],
            ["Beyond the data, noise alone is badly overconfident: its 90 % intervals catch only about one outcome in eight. Adding disagreement brings the curve most of the way back.", "超出資料之後，只用雜訊會嚴重過度自信：它的 90% 區間大約只抓到八分之一的結果。加上分歧後，曲線大部分都回來了。"],
            ["Always test calibration on the states you will actually visit, including ones away from the training data, because that is where planners go.", "務必在你實際會造訪的狀態上檢驗校準，包括遠離訓練資料的狀態，因為規劃器正是會往那裡去。"],
          ]}
        />
        <Py title="python/wm/ensemble.py" code={pyRegion(ensembleSrc, "calibration")} />
        <Py title="python/tests/test_ensemble.py" code={pyRegion(ensembleTest, "calibration")} />

        <Sub n={3} t={["Sanity tests", "基本檢查"]} />
        <P
          t={[
            "Before trusting a learned model, make sure the thing it is compared against is right. Simulators have bugs too, and many of them can be caught with facts you know without running anything. Three kinds of test recur in this book.",
            "在信任學到的模型之前，先確定拿來比較的對象是正確的。模擬器也會有錯，而其中很多可以用不必執行任何東西就知道的事實抓出來。本書反覆用到三種測試。",
          ]}
        />
        <P
          t={[
            "**Conservation laws.** With no friction and no force, the cart-pole's mechanical energy must stay constant, even while the pole falls past horizontal. A sign error in the equations, or a wrong time step in the integrator, shows up at once.",
            "**守恆律。**在沒有摩擦、沒有推力時，倒單擺小車的力學能必須保持不變，即使擺桿倒過了水平也一樣。方程裡的正負號錯誤，或積分器的時間步長錯誤，都會立刻現形。",
          ]}
        />
        <Py title="python/tests/test_cartpole.py" code={pyRegion(cartpoleTest, "energy")} />
        <P
          t={[
            "**Reference outputs.** Work out a value by hand (or with an independent method) and check the code against it. For the pole at rest, tilted 0.1 rad, the equations reduce to $\\ddot\\theta = g\\sin\\theta / \\big(l(\\tfrac43 - m\\cos^2\\theta/M)\\big)$, which a calculator gives as 1.573785 rad/s².",
            "**參考輸出。**用手算（或用獨立的方法）算出一個值，再拿程式碼和它比對。擺桿靜止、傾斜 0.1 弧度時，方程化簡為 $\\ddot\\theta = g\\sin\\theta / \\big(l(\\tfrac43 - m\\cos^2\\theta/M)\\big)$，用計算機算出來是 1.573785 rad/s²。",
          ]}
        />
        <Py title="python/tests/test_cartpole.py" code={pyRegion(cartpoleTest, "reference")} />
        <P
          t={[
            "**Known behaviour, including known failures.** Test that a model is wrong exactly where you expect, not just right where you hope. The gridworld test pins down the learned model's blind spot at the door; the loss test checks a closed form against a Monte Carlo estimate, and that a collapsed encoder really does score a perfect zero.",
            "**已知的行為，包括已知的失敗。**測試模型恰好在你預期的地方出錯，而不只是在你希望的地方正確。格子世界的測試確認了學到的模型在門口的盲點；損失函數的測試把封閉形式與蒙地卡羅估計比對，並確認塌縮的編碼器真的得到完美的零分。",
          ]}
        />
        <Py title="python/tests/test_gridworld.py" code={pyRegion(gridworldTest, "door")} />
        <Py title="python/tests/test_losses.py" code={pyRegion(lossesTest, "kl")} />
        <Table
          head={[["Test file", "測試檔"], ["What it checks", "檢查什麼"]]}
          rows={[
            [["`python/tests/test_gridworld.py`", "`python/tests/test_gridworld.py`"], ["walls, ice slides, key and door, reward on the goal; the learned model agrees everywhere except on moves into ice or the door", "牆、冰面滑行、鑰匙與門、終點獎勵；學到的模型除了走進冰面或門以外處處一致"]],
            [["`python/tests/test_cartpole.py`", "`python/tests/test_cartpole.py`"], ["hand-derived accelerations, RK4 against 10 000 Euler steps, energy conservation, mirror symmetry, the fitted linearisation, error growing with horizon", "手算的加速度、RK4 對比 10 000 步歐拉法、能量守恆、鏡像對稱、擬合出的線性化、誤差隨步數增長"]],
            [["`python/tests/test_ensemble.py`", "`python/tests/test_ensemble.py`"], ["normal CDF and quantile, learned noise near the true noise, disagreement outside the data, fan width, calibration in and out of the data", "常態分布的累積分布函數與分位數、學到的雜訊接近真實雜訊、資料外的分歧、扇形寬度、資料內外的校準"]],
            [["`python/tests/test_losses.py`", "`python/tests/test_losses.py`"], ["MSE and Gaussian NLL, KL against Monte Carlo, the VAE special case, collapse scoring zero", "MSE 與高斯負對數似然、KL 對比蒙地卡羅、VAE 特例、塌縮得到零分"]],
            [["each file's `test_agrees_with_typescript`", "每個檔案的 `test_agrees_with_typescript`"], ["the TypeScript port gives the same numbers (within 1e-9) on given inputs: grid steps, cart-pole derivatives and RK4 steps, ridge fits for given random features, every loss", "TypeScript 版本在給定輸入上算出相同的數字（誤差在 1e-9 內）：格子世界的每一步、倒單擺的導數與 RK4 步、給定隨機特徵的嶺迴歸、每一種損失"]],
          ]}
        />
        <Callout kind="tip" title={["Run them", "執行它們"]}>
          <P
            t={[
              "From the repository root: `pixi run test-py` (or `python -m pytest python/tests`). Each file runs in about a second, and every random number comes from `np.random.default_rng(seed)` with a fixed seed, so a failure is always reproducible. The TypeScript port has its own tests (`pixi run test`), which also write the fixtures the agreement tests read.",
              "在儲存庫根目錄執行：`pixi run test-py`（或 `python -m pytest python/tests`）。每個檔案大約一秒跑完，而且每個亂數都來自固定種子的 `np.random.default_rng(seed)`，所以任何失敗都能重現。TypeScript 版本有自己的測試（`pixi run test`），它們也會寫出一致性測試所讀取的資料檔。",
            ]}
          />
        </Callout>
        <P
          t={[
            "A fourth kind, **known optima**, checks planners rather than models: on a problem whose best action is known, the planner must find it.",
            "第四種是**已知最佳解**，它檢查的是規劃器而非模型：在最佳動作已知的問題上，規劃器必須找到它。",
          ]}
        />
        <p>
          <SiteLink to={["concept", "planning", "cem"]} label={["Planning with a model", "用模型規劃"]} />
        </p>
        <Sources
          items={[
            { label: "Guo et al. (2017), On Calibration of Modern Neural Networks", url: "https://arxiv.org/abs/1706.04599" },
            { label: "Kuleshov et al. (2018), Accurate Uncertainties for Deep Learning Using Calibrated Regression", url: "https://arxiv.org/abs/1807.00263" },
            { label: "Chua et al. (2018), Deep Reinforcement Learning in a Handful of Trials using Probabilistic Dynamics Models (PETS)", url: "https://arxiv.org/abs/1805.12114" },
            { label: "Janner et al. (2019), When to Trust Your Model: Model-Based Policy Optimization (MBPO)", url: "https://arxiv.org/abs/1906.08253" },
            { label: "pytest documentation", url: "https://docs.pytest.org/" },
          ]}
        />
      </Section>
    </Page>
  );
}

/** A numbered subheading inside the section. */
function Sub({ n, t }: { n: number; t: L }) {
  const { pick } = useLang();
  return (
    <h3 className="pt-2 text-base font-semibold text-gray-900">
      {n} · {pick(t)}
    </h3>
  );
}
