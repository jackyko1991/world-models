/**
 * The three losses most world models are trained with, as plain functions on number arrays.
 * - reconstruction: how far a decoded observation is from the real one (mean squared error, or the Gaussian
 *   negative log-likelihood it comes from);
 * - KL: how far the encoder's distribution over latents (the posterior q) is from a prior p: in a VAE p = N(0, I);
 *   in an RSSM (PlaNet, Dreamer) p is the dynamics model's prediction, so the KL term trains the prediction;
 * - latent prediction: how far a predicted embedding is from the embedding of what really happened (JEPA-style),
 *   with no pixels involved.
 */

// #region reconstruction
/** Mean squared error between an observation x and its reconstruction x̂. */
export function mse(x: number[], xHat: number[]): number {
  return x.reduce((a, v, i) => a + (v - xHat[i]) ** 2, 0) / x.length;
}

/** −log N(x; x̂, σ²I), summed over dimensions: MSE scaled by 1/(2σ²) plus a constant. */
export function gaussianNll(x: number[], xHat: number[], sigma = 1): number {
  const c = 0.5 * Math.log(2 * Math.PI * sigma * sigma);
  return x.reduce((a, v, i) => a + (v - xHat[i]) ** 2 / (2 * sigma * sigma) + c, 0);
}
// #endregion reconstruction

// #region kl
/** A diagonal Gaussian: a mean and a standard deviation per latent dimension. */
export interface DiagGaussian {
  mean: number[];
  std: number[];
}

/** KL(q ‖ p) for diagonal Gaussians, in closed form: Σ log(σp/σq) + (σq² + (μq − μp)²) / (2σp²) − ½. */
export function klGaussian(q: DiagGaussian, p: DiagGaussian): number {
  return q.mean.reduce((a, mq, i) => {
    const sq = q.std[i];
    const sp = p.std[i];
    return a + Math.log(sp / sq) + (sq * sq + (mq - p.mean[i]) ** 2) / (2 * sp * sp) - 0.5;
  }, 0);
}

/** The VAE's KL term: KL(q ‖ N(0, I)) = ½ Σ (μ² + σ² − 1 − log σ²). */
export function klStandardNormal(q: DiagGaussian): number {
  return q.mean.reduce((a, m, i) => a + 0.5 * (m * m + q.std[i] ** 2 - 1 - Math.log(q.std[i] ** 2)), 0);
}
// #endregion kl

// #region latent
/**
 * Latent prediction: squared distance between the predicted embedding and the target embedding. In training the
 * target is held fixed (no gradient flows into it) and comes from a slowly updated copy of the encoder; without such
 * care, mapping every input to the same constant makes this loss zero (collapse).
 */
export function latentPrediction(predicted: number[], target: number[]): number {
  return predicted.reduce((a, v, i) => a + (v - target[i]) ** 2, 0);
}

/** Cosine-similarity version, used by some methods: 2 − 2 cos(ẑ, z), between 0 (same direction) and 4. */
export function cosineLoss(predicted: number[], target: number[]): number {
  const dot = predicted.reduce((a, v, i) => a + v * target[i], 0);
  const n = Math.hypot(...predicted) * Math.hypot(...target);
  return 2 - (2 * dot) / n;
}
// #endregion latent

// #region elbo
/** A VAE's loss for one observation: reconstruction plus β times the KL to the prior (β = 1 is the ELBO). */
export function vaeLoss(x: number[], xHat: number[], q: DiagGaussian, beta = 1): number {
  return gaussianNll(x, xHat) + beta * klStandardNormal(q);
}
// #endregion elbo
