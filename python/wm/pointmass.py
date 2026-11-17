"""
A 2-D point mass that must reach a goal around a round obstacle: the toy system the CEM planner works on
(Concepts > Planning and imagination > cem).

State [x, y, vx, vy] in a [-1, 1]^2 arena; the action is a force [ax, ay], each component clipped to [-1, 1].
Semi-implicit Euler with light drag, so a rollout is cheap and exact (the planner's "model" here is the true
dynamics; the page says so).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class PointMass:
    dt: float = 0.1
    drag: float = 0.5
    gain: float = 2.5  # force scale: an action of 1 accelerates by `gain` per second
    start: tuple[float, float, float, float] = (-0.75, -0.55, 0.0, 0.0)
    goal: tuple[float, float] = (0.7, 0.55)
    obstacle: tuple[float, float, float] = (0.0, 0.0, 0.3)  # centre x, centre y, radius


POINT_MASS = PointMass()


# region step
def pm_step(m: PointMass, s: np.ndarray, ax: float, ay: float) -> np.ndarray:
    """One step of the true dynamics: the force changes the velocity, the new velocity moves the mass."""
    x, y, vx, vy = s
    vx = vx + m.dt * (m.gain * np.clip(ax, -1, 1) - m.drag * vx)
    vy = vy + m.dt * (m.gain * np.clip(ay, -1, 1) - m.drag * vy)
    return np.array([x + m.dt * vx, y + m.dt * vy, vx, vy])


def pm_rollout(m: PointMass, s: np.ndarray, actions: np.ndarray) -> np.ndarray:
    """Roll out a flat plan [ax0, ay0, ax1, ay1, ...]; returns the visited states, shape (T + 1, 4), first is `s`."""
    path = [np.asarray(s, dtype=float)]
    for ax, ay in np.reshape(actions, (-1, 2)):
        path.append(pm_step(m, path[-1], ax, ay))
    return np.array(path)
# endregion


# region cost
def pm_cost(m: PointMass, s: np.ndarray, actions: np.ndarray) -> float:
    """
    The cost J of a plan: squared distance to the goal at every step (the last one counted 5 times), a small effort
    penalty, and a steep penalty for entering the obstacle or leaving the arena.
    """
    xy = pm_rollout(m, s, actions)[1:, :2]  # the positions the plan visits
    d2 = np.sum((xy - m.goal) ** 2, axis=1)
    d2[-1] *= 5  # where the plan ends matters most
    ox, oy, r = m.obstacle
    inside = r - np.hypot(xy[:, 0] - ox, xy[:, 1] - oy)  # > 0 inside the obstacle
    hit = np.where(inside > 0, 20 + 200 * inside, 0.0)
    out = np.where(np.any(np.abs(xy) > 1, axis=1), 20.0, 0.0)
    effort = 0.01 * np.sum(np.clip(actions, -1, 1) ** 2)
    return float(np.sum(d2 + hit + out) + effort)
# endregion


def pm_goal_distance(m: PointMass, s: np.ndarray) -> float:
    """Distance from a state to the goal."""
    return float(np.hypot(s[0] - m.goal[0], s[1] - m.goal[1]))
