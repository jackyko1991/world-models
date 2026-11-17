"""
Losses: reconstruction is zero only for a perfect reconstruction and the Gaussian NLL is MSE rescaled; the KL
matches its closed form, a Monte Carlo estimate and the VAE special case; latent prediction is zero for a collapsed
(constant) encoder, which is why training must guard against collapse; and agreement with the TypeScript port
(src/models/losses.ts).
"""

import numpy as np

from wm.losses import DiagGaussian, cosine_loss, gaussian_nll, kl_gaussian, kl_standard_normal, latent_prediction, mse, vae_loss


def test_reconstruction_mse_and_the_gaussian_nll():
    assert mse([1, 2, 3], [1, 2, 3]) == 0
    assert abs(mse([0, 0], [1, 3]) - 5) < 1e-12
    # NLL with sigma = 1: 1/2 sum (x - x_hat)^2 + n * 1/2 log 2 pi
    assert abs(gaussian_nll([0, 0], [1, 3]) - (5 + np.log(2 * np.pi))) < 1e-12


# region kl
def test_kl_zero_for_equal_distributions_positive_otherwise_equal_to_a_monte_carlo_estimate():
    q = DiagGaussian(np.array([0.5, -1]), np.array([0.8, 0.3]))
    p = DiagGaussian(np.array([0, -0.5]), np.array([1.2, 0.6]))
    assert kl_gaussian(q, q) == 0
    assert kl_gaussian(q, p) > 0

    # E_q[log q(z) - log p(z)] by sampling z ~ q (fixed seed)
    def log_n(z, m, s):
        return -0.5 * np.log(2 * np.pi * s**2) - (z - m) ** 2 / (2 * s**2)

    rng = np.random.default_rng(42)
    z = q.mean + q.std * rng.normal(size=(200_000, 2))
    estimate = np.mean(np.sum(log_n(z, q.mean, q.std) - log_n(z, p.mean, p.std), axis=1))
    assert abs(estimate - kl_gaussian(q, p)) < 0.01
# endregion


def test_the_vae_kl_is_the_general_kl_with_a_standard_normal_prior():
    q = DiagGaussian(np.array([0.3, -2, 1]), np.array([0.5, 1, 2]))
    assert abs(kl_standard_normal(q) - kl_gaussian(q, DiagGaussian(np.zeros(3), np.ones(3)))) < 1e-12
    assert abs(vae_loss([1], [1], DiagGaussian(np.array([0.0]), np.array([1.0]))) - 0.5 * np.log(2 * np.pi)) < 1e-12


# region collapse
def test_latent_prediction_a_collapsed_encoder_scores_a_perfect_zero():
    constant = [0.7, 0.7]  # every input mapped to the same point
    assert latent_prediction(constant, constant) == 0
    assert latent_prediction([1, 0], [0, 1]) > 0
    assert abs(cosine_loss([2, 0], [5, 0])) < 1e-12  # scale does not matter
    assert abs(cosine_loss([1, 0], [-1, 0]) - 4) < 1e-12
# endregion


def test_agrees_with_typescript(fixture):
    for c in fixture("losses")["cases"]:
        q = DiagGaussian(np.array(c["q"]["mean"]), np.array(c["q"]["std"]))
        p = DiagGaussian(np.array(c["p"]["mean"]), np.array(c["p"]["std"]))
        x, x_hat = np.array(c["x"]), np.array(c["xHat"])
        got = {
            "mse": mse(x, x_hat),
            "gaussianNll": gaussian_nll(x, x_hat, c["sigma"]),
            "klGaussian": kl_gaussian(q, p),
            "klStandardNormal": kl_standard_normal(q),
            "latentPrediction": latent_prediction(x, x_hat),
            "cosineLoss": cosine_loss(x, x_hat),
            "vaeLoss": vae_loss(x, x_hat, q, 0.5),
        }
        for key, value in got.items():
            assert abs(value - c[key]) < 1e-9, key
