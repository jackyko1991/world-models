"""
A fan of rollouts on a one-dimensional world, to tell apart the two kinds of uncertainty (Concepts > Stochasticity
and uncertainty; Coding Skills > Checking a world model).

The true world drifts to the right with a wobble and some noise:  x' = x + D(x) + sigma * eps,
D(x) = 0.3 (1 + 0.5 sin 2x), sigma = 0.05, eps ~ N(0, 1). The models only ever saw transitions with x in [0, 3].

- deterministic: one model, its mean prediction only: one line;
- stochastic: the same model plus its learned noise sigma_hat (aleatoric uncertainty): a spread of lines;
- ensemble: K models, each fitted to a bootstrap resample of the data with its own random features (as in PETS,
  Chua et al. 2018); each sampled trajectory follows one member and adds noise. Where the data was, the members
  agree; beyond it they disagree (epistemic uncertainty).
All randomness comes from a numpy Generator, np.random.default_rng(seed), so every fan is reproducible.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

import numpy as np

SIGMA = 0.05
DATA_RANGE = (0.0, 3.0)


def drift(x: float | np.ndarray) -> float | np.ndarray:
    """The true mean change per step."""
    return 0.3 * (1 + 0.5 * np.sin(2 * x))


def true_step(x: float, rng: np.random.Generator) -> float:
    """One step of the true world (noise drawn from rng)."""
    return x + drift(x) + SIGMA * rng.normal()


# region member
FEATURES = 16
RIDGE = 1e-2


@dataclass
class Member:
    """One ensemble member: D_hat(x) = sum_j w_j cos(omega_j x + b_j), random features fitted by ridge regression."""

    omega: np.ndarray  # (FEATURES,) frequencies
    phase: np.ndarray  # (FEATURES,) phases b_j
    w: np.ndarray  # (FEATURES,) weights


def phi(omega: np.ndarray, phase: np.ndarray, x: float | np.ndarray) -> np.ndarray:
    """The random features of x (or of each x in an array): shape (..., FEATURES)."""
    return np.cos(np.multiply.outer(x, omega) + phase)


def predict_delta(m: Member, x: float | np.ndarray) -> float | np.ndarray:
    """The member's predicted change D_hat(x)."""
    return phi(m.omega, m.phase, x) @ m.w


def ridge_fit(omega: np.ndarray, phase: np.ndarray, xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    """The ridge weights for given features: solve (P^T P + RIDGE I) w = P^T y."""
    P = phi(omega, phase, np.asarray(xs))  # (N, FEATURES)
    return np.linalg.solve(P.T @ P + RIDGE * np.eye(len(omega)), P.T @ np.asarray(ys))


def fit_member(xs: np.ndarray, ys: np.ndarray, rng: np.random.Generator) -> Member:
    """Fit one member to (x, D) pairs: draw its random features from rng, then solve the ridge normal equations."""
    omega = 1.5 * rng.normal(size=FEATURES)
    phase = rng.uniform(0, 2 * np.pi, size=FEATURES)
    return Member(omega, phase, ridge_fit(omega, phase, xs, ys))
# endregion


# region dataset
def dataset(n: int = 80, seed: int = 3) -> tuple[np.ndarray, np.ndarray]:
    """Logged transitions: x uniform in DATA_RANGE, D = x' - x from the true world."""
    rng = np.random.default_rng(seed)  # the only source of randomness: same seed, same data
    xs = rng.uniform(*DATA_RANGE, size=n)
    ys = np.array([true_step(x, rng) - x for x in xs])
    return xs, ys
# endregion


# region ensemble
@dataclass
class Ensemble:
    members: list[Member]
    sigma: float  # the learned noise level sigma_hat: the spread of the residuals on the training data


def fit_ensemble(K: int = 5, seed: int = 4, data: tuple[np.ndarray, np.ndarray] | None = None) -> Ensemble:
    """K members, each fitted to a bootstrap resample (draw n points with replacement) with its own random features."""
    xs, ys = dataset() if data is None else data
    rng = np.random.default_rng(seed)
    members = []
    for _ in range(K):
        idx = rng.integers(0, len(xs), size=len(xs))  # the bootstrap resample
        members.append(fit_member(xs[idx], ys[idx], rng))
    residuals = ys - predict_delta(members[0], xs)
    return Ensemble(members, float(np.sqrt(np.mean(residuals**2))))


def disagreement(e: Ensemble, x: float) -> tuple[float, float]:
    """Mean and spread (standard deviation across members) of the predicted change at x: the epistemic part."""
    p = np.array([predict_delta(m, x) for m in e.members])
    return float(p.mean()), float(p.std())
# endregion


# region fan
FanKind = Literal["true", "deterministic", "stochastic", "ensemble"]


def fan(kind: FanKind, e: Ensemble, x0: float, horizon: int, paths: int, seed: int = 1) -> list[tuple[int, np.ndarray]]:
    """
    `paths` rollouts of `horizon` steps from x0. Each path of the ensemble keeps one member for its whole length
    (PETS's "trajectory sampling"); paths cycle through the members. Returns, for each path, its member and x_0 ... x_H.
    """
    rng = np.random.default_rng(seed)
    out = []
    for p in range(1 if kind == "deterministic" else paths):
        m = p % len(e.members) if kind == "ensemble" else 0
        xs = [x0]
        for _ in range(horizon):
            x = xs[-1]
            if kind == "true":
                xs.append(true_step(x, rng))
            else:
                noise = 0.0 if kind == "deterministic" else e.sigma * rng.normal()
                xs.append(x + predict_delta(e.members[m], x) + noise)
        out.append((m, np.array(xs)))
    return out
# endregion


def spread(paths: list[tuple[int, np.ndarray]]) -> np.ndarray:
    """The spread (standard deviation across paths) of a fan at each step."""
    return np.array([xs for _, xs in paths]).std(axis=0)


def normal_cdf(z: float) -> float:
    """Phi(z), the standard normal CDF (Abramowitz & Stegun 7.1.26 for erf, error below 1.5e-7)."""
    x = abs(z) / math.sqrt(2)
    t = 1 / (1 + 0.3275911 * x)
    poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
    erf = 1 - poly * math.exp(-x * x)
    return 0.5 * (1 + erf) if z >= 0 else 0.5 * (1 - erf)


def normal_quantile(p: float) -> float:
    """The z with Phi(z) = p (bisection on normal_cdf)."""
    lo, hi = -10.0, 10.0
    for _ in range(80):
        mid = (lo + hi) / 2
        if normal_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# region calibration
LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]


def coverage(z: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Given |y - mu| / s for each test case, the fraction inside the central p-interval for each level p, and the
    calibration error: the mean gap between that fraction and p.
    """
    observed = np.array([np.mean(z <= normal_quantile((1 + p) / 2)) for p in LEVELS])
    return observed, float(np.mean(np.abs(observed - LEVELS)))


def reliability(e: Ensemble, kind: Literal["aleatoric", "total"], x_range: tuple[float, float], n: int = 400, seed: int = 9):
    """
    A reliability curve for one-step predictions at test points x in `x_range`. A calibrated model gives fraction ~ p.
    - "aleatoric": member 0 with its noise sigma_hat only;
    - "total": the ensemble mean, with variance sigma_hat^2 + (spread across members)^2.
    """
    rng = np.random.default_rng(seed)
    z = np.empty(n)
    for i in range(n):
        x = rng.uniform(*x_range)
        nxt = true_step(x, rng)
        if kind == "aleatoric":
            mean, sd = x + predict_delta(e.members[0], x), e.sigma
        else:
            d_mean, d_sd = disagreement(e, x)
            mean, sd = x + d_mean, math.sqrt(e.sigma**2 + d_sd**2)
        z[i] = abs(nxt - mean) / sd
    observed, error = coverage(z)
    return {"levels": LEVELS, "observed": observed, "error": error}
# endregion
