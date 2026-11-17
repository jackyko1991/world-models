"""Spectral bias, read off training snapshots: the 1-D target signal, the Fourier features a network can be given,
and how much of each frequency a prediction has recovered.

The snapshots come from scripts/fourier_fit.py (a small MLP fitted with and without Fourier features, saved to
public/models/fourier-fit.json). The browser runs the same readouts, ported to TypeScript (src/models/fourierFit.ts).
"""

import numpy as np

from wm.nerf_tiny import positional_encoding


# region signal
def signal(components: list[dict], x) -> np.ndarray:
    """The target Σ_k a_k sin(2π c_k x + φ_k), for components {cycles c, amplitude a, phase φ}."""
    x = np.asarray(x, dtype=float)
    return sum(c["amplitude"] * np.sin(2 * np.pi * c["cycles"] * x + c["phase"]) for c in components)
# endregion


# region encoding
def features(x, frequencies: int) -> np.ndarray:
    """What the network sees for inputs x (n,): x itself (frequencies = 0, the plain network), or NeRF's positional
    encoding γ(x) = (x, sin(2^k π x), cos(2^k π x)), k < frequencies, as an (n, 1 + 2·frequencies) array."""
    x = np.asarray(x, dtype=float)[:, None]
    return x if frequencies == 0 else positional_encoding(x, frequencies)
# endregion


# region readouts
def amplitude_at(y, cycles: float) -> float:
    """The amplitude of `cycles` in samples y_n at x_n = n/N (one Fourier coefficient):
    for a pure a·sin(2π k x + φ) with k < N/2 it returns a exactly."""
    y = np.asarray(y, dtype=float)
    N = len(y)
    angle = 2 * np.pi * cycles * np.arange(N) / N
    return float(2 / N * np.hypot(y @ np.cos(angle), y @ np.sin(angle)))


def recovered(components: list[dict], target, prediction) -> np.ndarray:
    """How much of each target component a prediction has (1 = all of it): 1 − (its amplitude left in the error)
    / (its amplitude in the target), floored at 0."""
    error = np.asarray(target, dtype=float) - np.asarray(prediction, dtype=float)
    return np.array([max(0.0, 1 - amplitude_at(error, c["cycles"]) / c["amplitude"]) for c in components])


def mse(a, b) -> float:
    """Mean squared error between a prediction and the target on the grid."""
    return float(np.mean((np.asarray(a, dtype=float) - np.asarray(b, dtype=float)) ** 2))
# endregion
