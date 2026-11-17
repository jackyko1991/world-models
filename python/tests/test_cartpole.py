"""
Cart-pole: the equations of motion against values worked out by hand, RK4 against an independent fine Euler
integration, energy conservation without friction or force, mirror symmetry, the learned linear model (it recovers
the hand-derived linearisation, and its rollout error grows with the horizon), and agreement with the TypeScript port
(src/models/cartpole.ts).
"""

import numpy as np

from wm.cartpole import (
    CART_MASS,
    DT,
    G,
    HALF_LENGTH,
    POLE_MASS,
    derivs,
    energy,
    error_vs_horizon,
    fit_linear,
    learned,
    learned_weights,
    linear_model,
    rollout,
    step,
)


# region reference
def test_accelerations_at_rest_tilted_0_1_rad_match_the_hand_calculation():
    # theta_acc = g sin(theta) / (l (4/3 - m cos^2(theta) / M)),  x_acc = -m l theta_acc cos(theta) / M,
    # with M = 1.1 kg, m = 0.1 kg, l = 0.5 m
    _, x_acc, _, theta_acc = derivs(np.array([0, 0, 0.1, 0]), 0.0)
    assert abs(theta_acc - 1.573785) < 1e-6
    assert abs(x_acc - -0.071178) < 1e-6
# endregion


def test_one_rk4_step_agrees_with_10000_tiny_euler_steps():
    s0 = np.array([0.1, -0.3, 0.2, 0.5])
    x, h = s0.copy(), DT / 10_000
    for _ in range(10_000):
        x = x + h * derivs(x, 3.0)
    np.testing.assert_allclose(step(s0, 3.0), x, rtol=0, atol=1e-5)


# region energy
def test_with_no_friction_and_no_force_energy_is_conserved_over_2_s():
    states = rollout(step, np.array([0, 0, 0.2, 0]), np.zeros(100))  # 100 steps of 0.02 s
    e0 = energy(states[0])
    for s in states:
        assert abs(energy(s) - e0) <= 1e-5 * abs(e0)  # RK4 drifts, but by less than 0.001 %
    # and the pole really moved: it fell well past horizontal
    assert abs(states[100][2]) > np.pi / 2
# endregion


def test_mirror_symmetry_flipping_the_state_and_the_force_flips_the_next_state():
    s = np.array([0.3, 0.2, -0.15, 0.4])
    np.testing.assert_allclose(step(-s, -4.0), -step(s, 4.0), rtol=0, atol=1e-12)


def test_the_fitted_linear_model_recovers_the_linearisation_about_upright():
    W = learned_weights()
    k = G / (HALF_LENGTH * (4 / 3 - POLE_MASS / (CART_MASS + POLE_MASS)))  # d(theta_acc)/d(theta) at theta = 0
    assert abs(W[2, 3] - DT) < 1e-3  # theta' depends on theta_dot with weight dt
    assert abs(W[3, 2] - k * DT) < 0.01 * k * DT  # theta_dot' depends on theta with weight k dt
    # near upright, one step is very accurate
    s = np.array([0.1, 0.1, 0.03, -0.05])
    assert np.linalg.norm(learned(s, 2.0) - step(s, 2.0)) < 1e-4


# region horizon
def test_rollout_error_grows_with_the_horizon_and_faster_than_the_one_step_error():
    err = error_vs_horizon(learned, 50)
    r, one_step = err["rollout"], err["one_step"]
    for a, b in [(1, 5), (5, 10), (10, 25), (25, 50)]:
        assert r[b] > r[a], f"error at {b} > error at {a}"
    assert r[50] > 5 * one_step[50]  # compounding: rollout error >> one-step error
    assert r[1] < 1e-4
# endregion


def test_agrees_with_typescript(fixture):
    f = fixture("cartpole")
    assert f["constants"] == {"G": G, "CART_MASS": CART_MASS, "POLE_MASS": POLE_MASS, "HALF_LENGTH": HALF_LENGTH, "DT": DT}
    for case in f["cases"]:
        s = np.array(case["s"])
        np.testing.assert_allclose(derivs(s, case["force"]), case["derivs"], rtol=0, atol=1e-9)
        np.testing.assert_allclose(step(s, case["force"]), case["step"], rtol=0, atol=1e-9)
        assert abs(energy(s) - case["energy"]) < 1e-9
    fit = f["fit"]
    W = fit_linear(np.array(fit["inputs"]), np.array(fit["forces"]), np.array(fit["targets"]))
    np.testing.assert_allclose(W, fit["weights"], rtol=0, atol=1e-9)
    np.testing.assert_allclose(linear_model(W)(np.array(fit["s"]), fit["force"]), fit["prediction"], rtol=0, atol=1e-9)
