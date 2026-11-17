"""
The three losses most world models are trained with, as plain numpy functions (Coding Skills > States, models and
rollouts).
- reconstruction: how far a decoded observation is from the real one (mean squared error, or the Gaussian
  negative log-likelihood it comes from);
- KL: how far the encoder's distribution over latents (the posterior q) is from a prior p: in a VAE p = N(0, I);
  in an RSSM (PlaNet, Dreamer) p is the dynamics model's prediction, so the KL term trains the prediction;
- latent prediction: how far a predicted embedding is from the embedding of what really happened (JEPA-style),
  with no pixels involved.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


# region reconstruction
def mse(x: np.ndarray, x_hat: np.ndarray) -> float:
    """Mean squared error between an observation x and its reconstruction x_hat."""
    return float(np.mean((np.asarray(x) - np.asarray(x_hat)) ** 2))


def gaussian_nll(x: np.ndarray, x_hat: np.ndarray, sigma: float = 1.0) -> float:
    """-log N(x; x_hat, sigma^2 I), summed over dimensions: squared error over 2 sigma^2, plus a constant."""
    sq = (np.asarray(x) - np.asarray(x_hat)) ** 2
    return float(np.sum(sq / (2 * sigma**2) + 0.5 * np.log(2 * np.pi * sigma**2)))
# endregion


# region kl
@dataclass
class DiagGaussian:
    """A diagonal Gaussian: a mean and a standard deviation per latent dimension."""

    mean: np.ndarray
    std: np.ndarray


def kl_gaussian(q: DiagGaussian, p: DiagGaussian) -> float:
    """KL(q || p) for diagonal Gaussians, in closed form: sum log(sp/sq) + (sq^2 + (mq - mp)^2) / (2 sp^2) - 1/2."""
    mq, sq = np.asarray(q.mean), np.asarray(q.std)
    mp, sp = np.asarray(p.mean), np.asarray(p.std)
    return float(np.sum(np.log(sp / sq) + (sq**2 + (mq - mp) ** 2) / (2 * sp**2) - 0.5))


def kl_standard_normal(q: DiagGaussian) -> float:
    """The VAE's KL term: KL(q || N(0, I)) = 1/2 sum (mu^2 + sigma^2 - 1 - log sigma^2)."""
    m, s = np.asarray(q.mean), np.asarray(q.std)
    return float(np.sum(0.5 * (m**2 + s**2 - 1 - np.log(s**2))))
# endregion


# region latent
def latent_prediction(predicted: np.ndarray, target: np.ndarray) -> float:
    """
    Latent prediction: squared distance between the predicted embedding and the target embedding. In training the
    target is held fixed (no gradient flows into it) and comes from a slowly updated copy of the encoder; without such
    care, mapping every input to the same constant makes this loss zero (collapse).
    """
    return float(np.sum((np.asarray(predicted) - np.asarray(target)) ** 2))


def cosine_loss(predicted: np.ndarray, target: np.ndarray) -> float:
    """Cosine-similarity version, used by some methods: 2 - 2 cos(z_hat, z), between 0 (same direction) and 4."""
    a, b = np.asarray(predicted, dtype=float), np.asarray(target, dtype=float)
    return float(2 - 2 * (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b)))
# endregion


# region elbo
def vae_loss(x: np.ndarray, x_hat: np.ndarray, q: DiagGaussian, beta: float = 1.0) -> float:
    """A VAE's loss for one observation: reconstruction plus beta times the KL to the prior (beta = 1 is the ELBO)."""
    return gaussian_nll(x, x_hat) + beta * kl_standard_normal(q)
# endregion
