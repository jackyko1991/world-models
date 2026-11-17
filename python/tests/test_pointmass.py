"""The point mass: exact rollouts, the cost's terms, and agreement with the TypeScript port (src/models/pointmass.ts)."""

import numpy as np

from wm.pointmass import POINT_MASS, PointMass, pm_cost, pm_goal_distance, pm_rollout, pm_step


def test_zero_force_only_decays_the_velocity():
    path = pm_rollout(POINT_MASS, np.array([0, 0, 1, 0.0]), np.zeros(20))
    np.testing.assert_allclose(path[1:, 2], path[:-1, 2] * (1 - POINT_MASS.dt * POINT_MASS.drag), atol=1e-12)


def test_actions_are_clipped():
    s = np.array([0, 0, 1, 0.0])
    np.testing.assert_array_equal(pm_step(POINT_MASS, s, 5, -3), pm_step(POINT_MASS, s, 1, -1))


def test_cost_terms():
    m = POINT_MASS
    at_goal = np.array([*m.goal, 0, 0])
    assert pm_cost(m, at_goal, np.zeros(10)) == 0
    assert pm_goal_distance(m, at_goal) == 0
    straight = np.tile([0.75, 0.55], 15)  # straight at the obstacle
    assert pm_cost(m, np.array(m.start), straight) > 20


def test_agrees_with_typescript(fixture):
    f = fixture("pointmass")
    o = f["model"]["obstacle"]
    m = PointMass(f["model"]["dt"], f["model"]["drag"], f["model"]["gain"], tuple(f["model"]["start"]), tuple(f["model"]["goal"]), (o["x"], o["y"], o["r"]))
    assert m == POINT_MASS
    for case in f["cases"]:
        s, actions = np.array(case["s"]), np.array(case["actions"])
        np.testing.assert_allclose(pm_step(m, s, actions[0], actions[1]), case["step"], rtol=0, atol=1e-9)
        np.testing.assert_allclose(pm_rollout(m, s, actions), case["path"], rtol=0, atol=1e-9)
        assert abs(pm_cost(m, s, actions) - case["cost"]) < 1e-9
