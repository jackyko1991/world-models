"""
Planning by search over action sequences (Concepts > Planning and imagination > cem; Coding Skills > Planning in
code > cem). A plan is a flat vector of actions; `cost` scores it by rolling it through a model.

- Random shooting: draw N plans from one fixed Gaussian, keep the cheapest.
- Cross-entropy method (Rubinstein 1999): draw N plans from a Gaussian, keep the K cheapest (the elites), refit the
  Gaussian's mean and standard deviation to the elites, repeat.
- Model-predictive control: plan, carry out only the first action, then plan again from where you land.

All randomness comes from a numpy Generator passed in, so every run is reproducible.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, TypeVar

import numpy as np

Cost = Callable[[np.ndarray], float]  # plan -> J


@dataclass(frozen=True)
class CemOptions:
    samples: int = 60  # plans drawn per iteration (N)
    elites: int = 6  # plans kept per iteration (K)
    bound: float = 1.0  # each action is clipped to [-bound, bound]
    min_std: float = 0.02  # a floor for the standard deviation, so the search never freezes completely


CEM_DEFAULTS = CemOptions()


@dataclass
class CemIteration:
    """Everything one CEM iteration did, for a demo to draw."""

    mean: np.ndarray
    std: np.ndarray
    plans: np.ndarray  # (N, D)
    costs: np.ndarray  # (N,)
    elites: np.ndarray  # indices into `plans`, cheapest first
    next_mean: np.ndarray
    next_std: np.ndarray


@dataclass
class CemResult:
    best: np.ndarray
    best_cost: float
    mean: np.ndarray
    history: list[CemIteration]


# region cem
def cem_iteration(cost: Cost, mean: np.ndarray, std: np.ndarray, o: CemOptions, rng: np.random.Generator) -> CemIteration:
    """One CEM iteration: sample, score, keep the elites, refit."""
    # 1. sample N plans from the current Gaussian, clipped to the action bounds
    noise = rng.standard_normal((o.samples, len(mean)))
    plans = np.clip(mean + std * noise, -o.bound, o.bound)
    # 2. score each plan by rolling it through the model
    costs = np.array([cost(p) for p in plans])
    # 3. keep the K cheapest
    elites = np.argsort(costs, kind="stable")[: o.elites]
    # 4. refit the Gaussian to the elites
    next_mean, next_std = refit(plans[elites], o.min_std)
    return CemIteration(mean, std, plans, costs, elites, next_mean, next_std)


def refit(elite_plans: np.ndarray, min_std: float) -> tuple[np.ndarray, np.ndarray]:
    """The elites' mean and standard deviation (per action) become the next Gaussian."""
    next_mean = elite_plans.mean(axis=0)
    next_std = np.maximum(min_std, elite_plans.std(axis=0))
    return next_mean, next_std


def cem(cost: Cost, mean: np.ndarray, std: np.ndarray, iters: int, o: CemOptions, rng: np.random.Generator) -> CemResult:
    """CEM for a few iterations from N(mean, std^2); returns the best plan seen and every iteration."""
    best, best_cost, history = mean, np.inf, []
    for _ in range(iters):
        it = cem_iteration(cost, mean, std, o, rng)
        history.append(it)
        if it.costs[it.elites[0]] < best_cost:
            best, best_cost = it.plans[it.elites[0]], float(it.costs[it.elites[0]])
        mean, std = it.next_mean, it.next_std
    return CemResult(best, best_cost, mean, history)
# endregion


def random_shooting(cost: Cost, mean: np.ndarray, std: np.ndarray, samples: int, bound: float, rng: np.random.Generator) -> tuple[np.ndarray, float]:
    """Random shooting: `samples` plans from one fixed N(mean, std^2); the cheapest wins. Returns (best, best_cost)."""
    plans = np.clip(mean + std * rng.standard_normal((samples, len(mean))), -bound, bound)
    costs = np.array([cost(p) for p in plans])
    i = int(np.argmin(costs))
    return plans[i], float(costs[i])


S = TypeVar("S")


# region mpc
def mpc(
    state: S,
    steps: int,
    plan_cost: Callable[[S], Cost],
    act: Callable[[S, np.ndarray], S],
    action_dim: int,
    horizon: int,
    o: CemOptions,
    iters: int,
    init_std: float,
    rng: np.random.Generator,
) -> list[S]:
    """
    Model-predictive control: at every real step, plan a whole sequence with CEM, carry out only its first action,
    then shift the plan one step forward as the next warm start (a receding horizon).
    `plan_cost(state)` returns the cost of a plan from that state; `act` is the real system.
    """
    D = action_dim * horizon
    mean = np.zeros(D)
    visited = [state]
    for _ in range(steps):
        plan = cem(plan_cost(state), mean, np.full(D, init_std), iters, o, rng)
        state = act(state, plan.best[:action_dim])  # only the first action is carried out
        visited.append(state)
        mean = np.concatenate([plan.mean[action_dim:], np.zeros(action_dim)])  # warm start
    return visited
# endregion
