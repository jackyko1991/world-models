"""Dyna-Q against Q-learning on Sutton & Barto's maze at equal real steps; agreement with src/models/dyna.ts."""

import numpy as np

from wm.dyna import DYNA_MAZE, DynaOptions, DynaRun, average_curve, dyna_q, episodes_by_step, greedy, maze_step, q_update, shortest_path

SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]


def test_the_maze():
    assert shortest_path(DYNA_MAZE) == 14
    assert maze_step(DYNA_MAZE, 1 * 9 + 1, 1)[0] == 1 * 9 + 1  # (1, 1) moving right hits the wall at (1, 2)


def steps_to_5(n: int, seed: int) -> int:
    """Real steps until the 5th arrival at the goal (a run that never gets there counts as all its steps)."""
    ends = dyna_q(DYNA_MAZE, DynaOptions(n=n, seed=seed)).episode_ends
    return ends[4] if len(ends) > 4 else 4000


def test_dyna_q_needs_fewer_real_steps_than_q_learning():
    q, d5, d50 = (np.mean([steps_to_5(n, seed) for seed in SEEDS]) for n in (0, 5, 50))
    assert d5 < 0.6 * q, (q, d5)
    assert d50 < d5, (d5, d50)


def test_the_first_episode_is_the_same_for_every_n():
    for seed in SEEDS[:4]:
        first = [dyna_q(DYNA_MAZE, DynaOptions(n=n, steps=1500, seed=seed)).episode_ends[0] for n in (0, 50)]
        assert first[0] == first[1]


def test_more_imagined_updates_give_more_episodes():
    c0, c10 = average_curve(DYNA_MAZE, 0, SEEDS), average_curve(DYNA_MAZE, 10, SEEDS)
    for t in (1000, 2000, 3000, 4000):
        assert c10[t] > c0[t], (t, c10[t], c0[t])


def test_the_trained_greedy_policy_walks_the_shortest_path():
    run = dyna_q(DYNA_MAZE, DynaOptions(n=50, seed=3))
    rng, s, steps = np.random.default_rng(0), DYNA_MAZE.start, 0
    while s != DYNA_MAZE.goal and steps < 100:
        s, steps = maze_step(DYNA_MAZE, s, greedy(run.q, s, rng))[0], steps + 1
    assert steps == shortest_path(DYNA_MAZE)


def test_agrees_with_typescript(fixture):
    f = fixture("dyna")
    mz = f["maze"]
    assert (mz["rows"], mz["cols"], frozenset(mz["walls"]), mz["start"], mz["goal"]) == (
        DYNA_MAZE.rows, DYNA_MAZE.cols, DYNA_MAZE.walls, DYNA_MAZE.start, DYNA_MAZE.goal,
    )
    for st in f["steps"]:
        assert maze_step(DYNA_MAZE, st["s"], st["a"]) == (st["next"], st["reward"], st["done"])
    assert shortest_path(DYNA_MAZE) == f["shortestPath"]
    q = np.array(f["q0"]).reshape(-1, 4)
    for tr in f["transitions"]:
        q_update(q, tr["s"], tr["a"], tr["reward"], tr["next"], tr["terminal"], f["alpha"], f["gamma"])
    np.testing.assert_allclose(q.ravel(), f["q"], rtol=0, atol=1e-9)
    curve = episodes_by_step(DynaRun(f["episodeEnds"], q), 100)
    np.testing.assert_array_equal(curve, f["episodesByStep"])
