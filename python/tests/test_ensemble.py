"""
The ensemble: members agree where the data was and disagree beyond it, the learned noise matches the true noise,
fans are reproducible, the ensemble's fan widens where a single stochastic model stays overconfident, the ensemble's
predicted uncertainty is better calibrated out of the data than the noise alone, and agreement with the TypeScript
port (src/models/ensemble.ts) for given random features and data.
"""

import numpy as np
import pytest

from wm.ensemble import (
    DATA_RANGE,
    SIGMA,
    Ensemble,
    Member,
    disagreement,
    fan,
    fit_ensemble,
    normal_cdf,
    normal_quantile,
    predict_delta,
    reliability,
    ridge_fit,
    spread,
)


@pytest.fixture(scope="module")
def e() -> Ensemble:
    return fit_ensemble()


def mean_sd(e: Ensemble, a: float, b: float) -> float:
    return float(np.mean([disagreement(e, x)[1] for x in np.linspace(a, b, 21)]))


def test_the_normal_cdf_and_its_inverse():
    assert abs(normal_cdf(1.959964) - 0.975) < 1e-6
    assert abs(normal_quantile(0.95) - 1.644854) < 1e-5
    assert abs(normal_cdf(0) - 0.5) < 1e-9


def test_learned_noise_is_close_to_the_true_noise_level(e):
    assert abs(e.sigma - SIGMA) < 0.01


# region disagreement
def test_members_agree_inside_the_data_and_disagree_outside_it(e):
    inside = mean_sd(e, *DATA_RANGE)
    outside = mean_sd(e, DATA_RANGE[1] + 0.5, DATA_RANGE[1] + 4)
    assert inside < SIGMA / 2
    assert outside > 5 * inside
# endregion


def test_fans_are_reproducible_a_deterministic_model_draws_one_line(e):
    a, b = fan("ensemble", e, 0.5, 20, 10), fan("ensemble", e, 0.5, 20, 10)
    assert all(ma == mb and np.array_equal(xa, xb) for (ma, xa), (mb, xb) in zip(a, b))
    assert len(fan("deterministic", e, 0.5, 20, 10)) == 1


def test_leaving_the_data_the_ensemble_fan_widens_beyond_the_single_stochastic_model(e):
    H = 25
    sto = spread(fan("stochastic", e, 0.5, H, 40))
    ens = spread(fan("ensemble", e, 0.5, H, 40))
    assert ens[H] > 3 * sto[H]


# region calibration
def test_out_of_the_data_noise_alone_is_overconfident_adding_disagreement_repairs_most_of_it(e):
    in_data = reliability(e, "aleatoric", DATA_RANGE)
    out_aleatoric = reliability(e, "aleatoric", (3, 6))
    out_total = reliability(e, "total", (3, 6))
    assert in_data["error"] < 0.1
    assert out_aleatoric["observed"][8] < 0.5  # the 90 % interval covers far less than 90 %
    assert out_total["error"] < out_aleatoric["error"] / 2
# endregion


def test_agrees_with_typescript(fixture):
    f = fixture("ensemble")
    # the ridge fit, for the random features and the data the TypeScript side drew
    r = f["ridge"]
    w = ridge_fit(np.array(r["omega"]), np.array(r["phase"]), np.array(r["xs"]), np.array(r["ys"]))
    np.testing.assert_allclose(w, r["w"], rtol=0, atol=1e-9)
    # predictions and disagreement of the TypeScript ensemble's members
    members = [Member(np.array(m["omega"]), np.array(m["phase"]), np.array(m["w"])) for m in f["members"]]
    e = Ensemble(members, f["sigma"])
    for m, d in zip(members, f["members"]):
        np.testing.assert_allclose(predict_delta(m, np.array(f["xs"])), d["predictions"], rtol=0, atol=1e-9)
    for x, d in zip(f["xs"], f["disagreement"]):
        mean, sd = disagreement(e, x)
        assert abs(mean - d["mean"]) < 1e-9 and abs(sd - d["sd"]) < 1e-9
    (_, xs), = fan("deterministic", e, 0.5, 20, 1)
    np.testing.assert_allclose(xs, f["deterministic"], rtol=0, atol=1e-9)
    np.testing.assert_allclose(spread([(0, np.array(p)) for p in f["spreadPaths"]]), f["spread"], rtol=0, atol=1e-9)
    for z, v in f["cdf"]:
        assert abs(normal_cdf(z) - v) < 1e-9
    for p, z in f["quantile"]:
        assert abs(normal_quantile(p) - z) < 1e-9
