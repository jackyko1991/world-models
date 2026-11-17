"""CEM: converges on a quadratic's optimum, beats random shooting, MPC reaches the goal; agrees with src/models/cem.ts."""

import numpy as np

from wm.cem import CEM_DEFAULTS, CemOptions, cem, mpc, random_shooting, refit
from wm.pointmass import POINT_MASS, pm_cost, pm_goal_distance, pm_step


def test_cem_converges_on_a_shifted_quadratic():
    target = np.array([0.3, -0.5, 0.8, 0.1, -0.2, 0.6])
    D = len(target)
    out = cem(lambda p: float(np.sum((p - target) ** 2)), np.zeros(D), np.full(D, 0.5), 30, CemOptions(100, 10, 1.0, 1e-4), np.random.default_rng(1))
    np.testing.assert_allclose(out.mean, target, atol=0.01)
    assert out.best_cost < 1e-3
    best = [it.costs[it.elites[0]] for it in out.history]
    assert min(best) == out.best_cost  # the best plan ever seen is kept
    assert out.history[29].std.max() < out.history[0].std.max() / 10  # the Gaussian narrows


def test_cem_beats_random_shooting_on_the_point_mass():
    H = 25
    cost = lambda p: pm_cost(POINT_MASS, np.array(POINT_MASS.start), p)
    zeros, std = np.zeros(2 * H), np.full(2 * H, 0.7)
    cem_costs, rs_costs = [], []
    for seed in [1, 2, 3, 4, 5]:
        cem_costs.append(cem(cost, zeros, std, 6, CEM_DEFAULTS, np.random.default_rng(seed)).best_cost)
        rs_costs.append(random_shooting(cost, zeros, std, 6 * CEM_DEFAULTS.samples, 1.0, np.random.default_rng(seed))[1])
    assert all(c < r for c, r in zip(cem_costs, rs_costs)), (cem_costs, rs_costs)  # on every seed
    assert sum(cem_costs) < 0.85 * sum(rs_costs), (cem_costs, rs_costs)


def test_mpc_reaches_the_goal_around_the_obstacle():
    m = POINT_MASS
    for seed in (1, 2, 3):
        visited = mpc(
            np.array(m.start),
            50,
            lambda s: lambda p: pm_cost(m, s, p),
            lambda s, a: pm_step(m, s, a[0], a[1]),
            2,
            25,
            CEM_DEFAULTS,
            iters=4,
            init_std=0.6,
            rng=np.random.default_rng(seed),
        )
        distances = [pm_goal_distance(m, s) for s in visited]
        assert min(distances) < 0.03  # it gets to the goal ...
        assert distances[-1] < 0.2  # ... and stays near it
        ox, oy, r = m.obstacle
        assert all(np.hypot(s[0] - ox, s[1] - oy) > r - 0.02 for s in visited)  # without touching the obstacle


def test_agrees_with_typescript(fixture):
    """Same noise in, same plans, costs, elites and refit out (the random streams differ, so the noise is given)."""
    f = fixture("cem")
    o = f["options"]
    mean, std, noise, plans = (np.array(f[k]) for k in ("mean", "std", "noise", "plans"))
    np.testing.assert_allclose(np.clip(mean + std * noise, -o["bound"], o["bound"]), plans, rtol=0, atol=1e-9)
    costs = np.array([pm_cost(POINT_MASS, np.array(POINT_MASS.start), p) for p in plans])
    np.testing.assert_allclose(costs, f["costs"], rtol=0, atol=1e-9)
    elites = np.argsort(costs, kind="stable")[: o["elites"]]
    assert elites.tolist() == f["elites"]
    next_mean, next_std = refit(plans[elites], o["minStd"])
    np.testing.assert_allclose(next_mean, f["nextMean"], rtol=0, atol=1e-9)
    np.testing.assert_allclose(next_std, f["nextStd"], rtol=0, atol=1e-9)
