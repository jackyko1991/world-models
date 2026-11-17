/**
 * Coding Skills ▸ rollout: the KL term as a picture. The posterior q = N(μ, σ²) (amber) against the prior p (gray):
 * either N(0, 1) as in a VAE, or a "predicted" prior N(0.8, 0.5²) as in an RSSM, where the KL trains the prediction.
 * The number shown is `klGaussian(q, p)` from losses.ts.
 */
import { useLang } from "@learnkit/web";
import { useState } from "react";
import { klGaussian } from "../models/losses.ts";
import { DemoButton, Slider } from "../pages/kit.tsx";
import { Axes, COLOR, Legend, makeScale, path } from "./RolloutPlot.tsx";

const pdf = (x: number, m: number, s: number) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));

export default function RolloutLossDemo() {
  const { pick } = useLang();
  const [mu, setMu] = useState(1);
  const [sd, setSd] = useState(0.5);
  const [prior, setPrior] = useState<"vae" | "rssm">("vae");
  const p = prior === "vae" ? { m: 0, s: 1 } : { m: 0.8, s: 0.5 };
  const kl = klGaussian({ mean: [mu], std: [sd] }, { mean: [p.m], std: [p.s] });
  const xs = Array.from({ length: 241 }, (_, i) => -4 + i / 30);
  const sc = makeScale(360, 190, [-4, 4], [0, 1.6], { pad: { l: 34, r: 10, t: 10, b: 32 } });
  return (
    <div className="w-full max-w-[400px] space-y-2">
      <div className="flex flex-wrap justify-center gap-2">
        <DemoButton active={prior === "vae"} onClick={() => setPrior("vae")}>
          {pick(["VAE prior N(0, 1)", "VAE 先驗 N(0, 1)"])}
        </DemoButton>
        <DemoButton active={prior === "rssm"} onClick={() => setPrior("rssm")}>
          {pick(["RSSM: predicted prior", "RSSM：預測出的先驗"])}
        </DemoButton>
      </div>
      <svg viewBox="0 0 360 190" className="h-auto w-full" role="img" aria-label={pick(["Two Gaussian densities and the KL between them", "兩個高斯密度及其 KL"])}>
        <Axes s={sc} clipId="kl-clip" xTicks={[-4, -2, 0, 2, 4]} yTicks={[0, 0.5, 1, 1.5]} xLabel={pick(["latent z", "潛在變數 z"])} yLabel={pick(["density", "機率密度"])}>
          <path d={path(sc, xs, xs.map((x) => pdf(x, p.m, p.s)))} fill="none" stroke={COLOR.truth} strokeWidth="2" strokeDasharray="5 3" />
          <path d={path(sc, xs, xs.map((x) => pdf(x, mu, sd)))} fill="none" stroke={COLOR.model} strokeWidth="2.5" />
        </Axes>
        <text x="350" y="24" fontSize="12" textAnchor="end" fill={COLOR.model} fontFamily="monospace">
          KL(q‖p) = {kl.toFixed(3)}
        </text>
      </svg>
      <Legend
        items={[
          { color: COLOR.model, label: pick(["q: encoder's posterior", "q：編碼器的後驗"]) },
          { color: COLOR.truth, label: pick(["p: prior", "p：先驗"]), dashed: true },
        ]}
      />
      <div className="flex flex-col items-center gap-1">
        <Slider label={["mean $\\mu_q$", "平均 $\\mu_q$"]} value={mu} min={-3} max={3} step={0.1} onChange={setMu} format={(v) => v.toFixed(1)} />
        <Slider label={["std $\\sigma_q$", "標準差 $\\sigma_q$"]} value={sd} min={0.1} max={2} step={0.05} onChange={setSd} format={(v) => v.toFixed(2)} />
      </div>
    </div>
  );
}
