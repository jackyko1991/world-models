"""A toy joint-embedding predictive architecture (JEPA), trained by hand-written gradient descent.

N points x_i in R^D come in three clusters. Each is seen twice with noise: two views v_i and v'_i. A linear encoder
z = W v maps a view to 2-D, and a linear predictor p = A z + b guesses the embedding of the other view from this one.

The prediction loss alone is minimised by W = 0: every point embedded at the same place, so every prediction is
perfect. Plain gradient descent finds that answer and the cloud *collapses*. VICReg's two extra terms (a hinge on
each dimension's standard deviation, and a penalty on the off-diagonal covariance) rule it out.

Every gradient below is written by hand, so you can follow the chain rule line by line.
"""

from dataclasses import dataclass, replace

import numpy as np

DIM = 4  # input dimension D
EMB = 2  # embedding dimension


@dataclass
class ToyData:
    v: np.ndarray  # [N, D] first view of every point
    vp: np.ndarray  # [N, D] second view
    cluster: np.ndarray  # [N] cluster of every point (0, 1, 2), for colouring


@dataclass
class ToyState:
    W: np.ndarray  # [EMB, DIM] encoder
    A: np.ndarray  # [EMB, EMB] predictor
    b: np.ndarray  # [EMB] predictor bias
    step: int = 0


def make_data(rng: np.random.Generator, n: int = 48, noise: float = 0.45) -> ToyData:
    """Three cluster centres; each point is a centre plus a little scatter, and each view adds its own noise."""
    centres = 1.2 * rng.standard_normal((3, DIM))
    cluster = np.arange(n) % 3
    x = centres[cluster] + 0.35 * rng.standard_normal((n, DIM))
    v = x + noise * rng.standard_normal((n, DIM))
    vp = x + noise * rng.standard_normal((n, DIM))
    return ToyData(v, vp, cluster)


def init_state(rng: np.random.Generator) -> ToyState:
    """A random encoder, and a predictor that starts as the identity (predict "the same embedding")."""
    return ToyState(W=0.5 * rng.standard_normal((EMB, DIM)), A=np.eye(EMB), b=np.zeros(EMB))


def embed(s: ToyState, d: ToyData) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Embeddings z = W v and z' = W v' of both views (rows), and the predictions A z + b of z' from z."""
    z = d.v @ s.W.T
    zp = d.vp @ s.W.T
    pred = z @ s.A.T + s.b
    return z, zp, pred


def stats(z: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """Per-dimension mean and (unbiased) variance of a set of embeddings, and the covariance of the two dimensions."""
    n = len(z)
    mean = z.mean(axis=0)
    c = z - mean
    variance = (c**2).sum(axis=0) / (n - 1)
    cov = float((c[:, 0] * c[:, 1]).sum() / (n - 1))
    return mean, variance, cov


def spread(s: ToyState, d: ToyData) -> float:
    """Total variance of the first views' embeddings (the trace of their covariance): 0 means collapse."""
    _, variance, _ = stats(embed(s, d)[0])
    return float(variance.sum())


# region regulariser
def vicreg(z: np.ndarray, gamma: float, wv: float, wc: float, eps: float = 1e-4) -> tuple[float, np.ndarray]:
    """VICReg's anti-collapse terms on a batch of embeddings z ([N, 2]), and their gradient dL/dz ([N, 2]).

        variance:    wv * sum_k max(0, gamma - sd_k),   sd_k = sqrt(Var z_k + eps)   keep every dimension spread
        covariance:  wc * sum_{j != k} C_jk^2 / EMB = wc * 2 C_01^2 / EMB            decorrelate the dimensions
    """
    n = len(z)
    mean, variance, cov = stats(z)
    c = z - mean  # centred embeddings
    sd = np.sqrt(variance + eps)
    loss = wv * np.maximum(0.0, gamma - sd).sum() + wc * 2 * cov**2 / EMB

    # d sd_k / d z_ik = c_ik / ((n - 1) sd_k); the hinge only pushes while sd_k < gamma
    grad = -wv * (sd < gamma) * c / ((n - 1) * sd)
    # d C_01 / d z_i0 = c_i1 / (n - 1) and vice versa: each dimension's gradient uses the *other* dimension
    grad += wc * 4 * cov * c[:, ::-1] / ((n - 1) * EMB)
    return float(loss), grad
# endregion


# region step
def train_step(
    s: ToyState,
    d: ToyData,
    anti_collapse: bool,
    lr: float = 0.05,
    gamma: float = 1.0,
    var_weight: float = 1.0,
    cov_weight: float = 0.5,
) -> tuple[ToyState, float, float]:
    """One full-batch gradient step on the prediction loss (+ the VICReg terms on both views when switched on).

    Returns the new state, and the prediction loss and anti-collapse loss *before* the step.
    """
    n = len(d.v)
    z, zp, pred = embed(s, d)

    # prediction loss (1/N) sum_i ||A z_i + b - z'_i||^2
    r = pred - zp  # residuals, [N, 2]
    prediction = float((r**2).sum() / n)
    g = 2 * r / n  # dL/dpred_i
    grad_A = g.T @ z  # pred = A z + b
    grad_b = g.sum(axis=0)
    grad_z = g @ s.A  # back through the predictor
    grad_zp = -g  # the target branch is trained too (no stop-gradient here)

    regulariser = 0.0
    if anti_collapse:
        for emb, grad in ((z, grad_z), (zp, grad_zp)):
            loss, g_reg = vicreg(emb, gamma, var_weight, cov_weight)
            regulariser += loss
            grad += g_reg

    # chain rule into the encoder: z_i = W v_i, so dL/dW = sum_i dL/dz_i v_i^T (both views share W)
    grad_W = grad_z.T @ d.v + grad_zp.T @ d.vp

    new = ToyState(W=s.W - lr * grad_W, A=s.A - lr * grad_A, b=s.b - lr * grad_b, step=s.step + 1)
    return new, prediction, regulariser
# endregion


def train(s: ToyState, d: ToyData, anti_collapse: bool, steps: int, **options) -> tuple[ToyState, list[float]]:
    """Run ``steps`` gradient steps from s; returns the final state and the spread after every step."""
    history = []
    for _ in range(steps):
        s = train_step(s, d, anti_collapse, **options)[0]
        history.append(spread(s, d))
    return s, history


def with_W(s: ToyState, W: np.ndarray) -> ToyState:
    """A copy of s with another encoder (for finite differences)."""
    return replace(s, W=W)
