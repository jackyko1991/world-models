"""wm.jepa_toy: with only the prediction loss the embeddings collapse; with VICReg's terms they stay spread; the
hand-written gradient matches finite differences; and a few steps agree with the TypeScript port."""

import numpy as np
import pytest

from wm.jepa_toy import ToyData, ToyState, embed, init_state, make_data, spread, stats, train, train_step, with_W

STEPS = 300


@pytest.fixture
def setup():
    return make_data(np.random.default_rng(4)), init_state(np.random.default_rng(2))


def test_without_the_term_the_cloud_shrinks_to_a_point(setup):
    data, start = setup
    state, history = train(start, data, anti_collapse=False, steps=STEPS)
    assert spread(start, data) > 0.5
    assert history[-1] < 1e-4
    assert train_step(state, data, anti_collapse=False)[1] < 1e-4  # the prediction loss is (almost) perfect
    assert history[50] < history[0] and history[150] < history[50] and history[299] < history[150]


def test_with_the_vicreg_terms_every_dimension_keeps_its_spread(setup):
    data, start = setup
    state, history = train(start, data, anti_collapse=True, steps=STEPS)
    assert min(history[50:]) > 1.5
    _, variance, cov = stats(embed(state, data)[0])
    assert np.all(np.sqrt(variance) > 0.8)
    assert abs(cov) < 0.2


def test_switching_the_term_on_after_a_collapse_spreads_the_cloud_again(setup):
    data, start = setup
    collapsed, _ = train(start, data, anti_collapse=False, steps=150)
    healed, _ = train(collapsed, data, anti_collapse=True, steps=300)
    assert spread(collapsed, data) < 1e-2 and spread(healed, data) > 1.5


@pytest.mark.parametrize("anti_collapse", [False, True])
def test_the_analytic_gradient_matches_central_differences(setup, anti_collapse):
    data, start = setup
    lr, h = 1e-6, 1e-6
    after = train_step(start, data, anti_collapse, lr=lr)[0]
    analytic = (start.W - after.W) / lr

    def loss(W):
        _, prediction, regulariser = train_step(with_W(start, W), data, anti_collapse)
        return prediction + regulariser

    for k in range(start.W.shape[0]):
        for j in range(start.W.shape[1]):
            e = np.zeros_like(start.W)
            e[k, j] = h
            numeric = (loss(start.W + e) - loss(start.W - e)) / (2 * h)
            assert abs(analytic[k, j] - numeric) < 1e-5 * max(1, abs(numeric))


def test_agrees_with_the_typescript_port(fixture):
    fx = fixture("jepa_toy")
    data = ToyData(np.array(fx["v"]), np.array(fx["vp"]), np.arange(len(fx["v"])) % 3)
    start = ToyState(np.array(fx["W"]), np.array(fx["A"]), np.array(fx["b"]))
    mean, variance, cov = stats(embed(start, data)[0])
    np.testing.assert_allclose(mean, fx["stats"]["mean"], atol=1e-9)
    np.testing.assert_allclose(variance, fx["stats"]["variance"], atol=1e-9)
    assert abs(cov - fx["stats"]["cov"]) < 1e-9
    for run in fx["runs"]:
        s = start
        for expected in run["steps"]:
            s, prediction, regulariser = train_step(s, data, run["antiCollapse"])
            for name in ("W", "A", "b"):
                np.testing.assert_allclose(getattr(s, name), expected[name], rtol=0, atol=1e-9)
            assert abs(prediction - expected["prediction"]) < 1e-9
            assert abs(regulariser - expected["regulariser"]) < 1e-9
            assert abs(spread(s, data) - expected["spread"]) < 1e-9
