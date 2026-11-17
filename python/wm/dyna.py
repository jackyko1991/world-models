"""
Tabular Q-learning and Dyna-Q on a small maze (Concepts > Planning and imagination > imagination; Coding Skills >
Planning in code > dyna). The maze is the one in Sutton & Barto's Example 8.1: 6 x 9 cells, start on the left, goal
top right, reward 1 on reaching the goal and 0 otherwise.

Dyna-Q (Sutton 1990) is Q-learning plus a table model of the transitions seen so far: after every real step it makes
`n` extra Q-learning updates on transitions replayed from the model ("imagined" steps). With n = 0 it is plain
Q-learning.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Maze:
    rows: int
    cols: int
    walls: frozenset[int]  # wall cells, as row * cols + col
    start: int
    goal: int


def _cell(r: int, c: int) -> int:
    return r * 9 + c


# Sutton & Barto (2018), Example 8.1 (Figure 8.2): the Dyna maze.
DYNA_MAZE = Maze(
    rows=6,
    cols=9,
    walls=frozenset({_cell(1, 2), _cell(2, 2), _cell(3, 2), _cell(4, 5), _cell(0, 7), _cell(1, 7), _cell(2, 7)}),
    start=_cell(2, 0),
    goal=_cell(0, 8),
)

# Actions: up, right, down, left (row step, column step).
MOVES = ((-1, 0), (0, 1), (1, 0), (0, -1))


def maze_step(m: Maze, s: int, a: int) -> tuple[int, float, bool]:
    """The true maze: (next, reward, done). A move into a wall or off the grid leaves you where you are."""
    r, c = s // m.cols + MOVES[a][0], s % m.cols + MOVES[a][1]
    blocked = r < 0 or r >= m.rows or c < 0 or c >= m.cols or r * m.cols + c in m.walls
    nxt = s if blocked else r * m.cols + c
    return nxt, (1.0 if nxt == m.goal else 0.0), nxt == m.goal


@dataclass(frozen=True)
class DynaOptions:
    n: int = 0  # imagined updates per real step (0 = Q-learning)
    steps: int = 4000  # real steps to run
    alpha: float = 0.1
    gamma: float = 0.95
    epsilon: float = 0.1
    seed: int = 0


def greedy(q: np.ndarray, s: int, rng: np.random.Generator) -> int:
    """The greedy action, ties broken at random (so an untrained agent wanders instead of walking into a wall forever)."""
    ties = np.flatnonzero(q[s] == q[s].max())
    return int(ties[rng.integers(len(ties))])


@dataclass
class DynaRun:
    episode_ends: list[int]  # the real step (1-based) at which each episode reached the goal
    q: np.ndarray  # Q[s, a] after the run


# region dyna
def q_update(q: np.ndarray, s: int, a: int, reward: float, nxt: int, terminal: bool, alpha: float, gamma: float) -> None:
    """One Q-learning update, in place. At the goal there is no future, so the target is just the reward."""
    target = reward + (0.0 if terminal else gamma * q[nxt].max())
    q[s, a] += alpha * (target - q[s, a])


def dyna_q(m: Maze, o: DynaOptions) -> DynaRun:
    act_rng = np.random.default_rng(o.seed)  # acting
    imagine_rng = np.random.default_rng(o.seed + 7919)  # imagining: its own stream, so every n shares episode 1
    q = np.zeros((m.rows * m.cols, 4))
    model: dict[tuple[int, int], tuple[float, int]] = {}  # (s, a) -> (reward, next) seen last time
    seen: list[tuple[int, int]] = []  # the keys of `model`, to pick one at random
    episode_ends, s = [], m.start
    for t in range(1, o.steps + 1):
        # act in the real maze (epsilon-greedy) and learn from it: plain Q-learning
        a = int(act_rng.integers(4)) if act_rng.random() < o.epsilon else greedy(q, s, act_rng)
        nxt, reward, done = maze_step(m, s, a)
        q_update(q, s, a, reward, nxt, nxt == m.goal, o.alpha, o.gamma)
        # remember the transition in the table model
        if (s, a) not in model:
            seen.append((s, a))
        model[(s, a)] = (reward, nxt)
        # imagine: n more updates on transitions replayed from the model
        for _ in range(o.n):
            ks, ka = seen[imagine_rng.integers(len(seen))]
            sim_reward, sim_next = model[(ks, ka)]
            q_update(q, ks, ka, sim_reward, sim_next, sim_next == m.goal, o.alpha, o.gamma)
        if done:
            episode_ends.append(t)
        s = m.start if done else nxt
    return DynaRun(episode_ends, q)
# endregion


def episodes_by_step(run: DynaRun, steps: int) -> np.ndarray:
    """Episodes completed by each real step 0..steps (index t = episodes finished within the first t real steps)."""
    out = np.zeros(steps + 1)
    for e in run.episode_ends:
        out[e] += 1
    return np.cumsum(out)


def average_curve(m: Maze, n: int, seeds: list[int], base: DynaOptions = DynaOptions()) -> np.ndarray:
    """The learning curve averaged over seeds: mean episodes completed against real steps."""
    runs = [episodes_by_step(dyna_q(m, DynaOptions(n, base.steps, base.alpha, base.gamma, base.epsilon, seed)), base.steps) for seed in seeds]
    return np.mean(runs, axis=0)


def shortest_path(m: Maze) -> float:
    """The shortest path length from start to goal (breadth-first search), for reference."""
    dist, queue = {m.start: 0}, deque([m.start])
    while queue:
        s = queue.popleft()
        if s == m.goal:
            return dist[s]
        for a in range(4):
            nxt = maze_step(m, s, a)[0]
            if nxt not in dist:
                dist[nxt] = dist[s] + 1
                queue.append(nxt)
    return float("inf")
