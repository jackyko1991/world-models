/**
 * The spectral-bias demo's data and the maths to read it: training snapshots of a small MLP fitted to a 1-D signal
 * with and without Fourier features (made offline by scripts/fourier_fit.py into public/models/fourier-fit.json),
 * and how much of each frequency a prediction has recovered. Pure functions, no DOM.
 */

export interface FourierFitRun {
  /** positional-encoding frequencies (0 = the plain network, which sees x itself) */
  frequencies: number;
  /** predictions on the grid, one array per snapshot */
  predictions: number[][];
  trainLoss: number[];
}

export interface FourierFitData {
  components: { cycles: number; amplitude: number; phase: number }[];
  train: { n: number; steps: number; lr: number; width: number; depth: number; seconds: number };
  grid: number;
  /** training step of each snapshot */
  steps: number[];
  target: number[];
  runs: { plain: FourierFitRun; fourier: FourierFitRun };
  encodingProbe: { x: number[]; frequencies: number; gamma: number[][] };
}

/** The target signal Σ a sin(2π k x + φ). */
export function signal(data: Pick<FourierFitData, "components">, x: number): number {
  return data.components.reduce((s, c) => s + c.amplitude * Math.sin(2 * Math.PI * c.cycles * x + c.phase), 0);
}

/**
 * The amplitude of `cycles` in samples y_n at x_n = n/N (one Fourier coefficient): for a pure a·sin(2πkx + φ)
 * with k < N/2 it returns a exactly.
 */
export function amplitudeAt(y: number[], cycles: number): number {
  const N = y.length;
  let re = 0;
  let im = 0;
  for (let n = 0; n < N; n++) {
    const a = (2 * Math.PI * cycles * n) / N;
    re += y[n] * Math.cos(a);
    im += y[n] * Math.sin(a);
  }
  return (2 / N) * Math.hypot(re, im);
}

/** How much of each target component a prediction has (1 = all of it), from the error's Fourier coefficients. */
export function recovered(data: FourierFitData, prediction: number[]): number[] {
  const err = prediction.map((p, i) => data.target[i] - p);
  return data.components.map((c) => Math.max(0, 1 - amplitudeAt(err, c.cycles) / c.amplitude));
}

/** Mean squared error of a prediction against the target on the grid. */
export const mse = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0) / a.length;
