"""
Cart-pole: the true simulator and a learned linear model (Concepts > Dynamics and rollouts; Coding Skills > States,
models and rollouts and > Checking a world model).

The true dynamics are the classic equations of Barto, Sutton & Anderson (1983), in the corrected form given by
Florian (2007), without friction: a cart of mass 1 kg on a rail, a uniform pole of mass 0.1 kg and half-length
0.5 m hinged on it, gravity 9.8 m/s^2, a horizontal force F on the cart. theta = 0 is upright, theta > 0 leans right.
They are integrated with classical fourth-order Runge-Kutta at a fixed step dt = 0.02 s (the step OpenAI Gym uses).

The learned model is linear, s' = A s + B F + c, fitted by least squares to 2000 one-step transitions of the
simulator from random states near upright (fixed seed). It is good for one step near where its data lies and
worse further away, and in a rollout it is fed its own predictions, so its error compounds.
"""

from __future__ import annotations

from functools import cache
from typing import Callable

import numpy as np

# region state
# State [x, x_dot, theta, theta_dot]: cart position (m), cart velocity (m/s), pole angle (rad), angular velocity (rad/s).
# The action is one number: the horizontal force F on the cart, in newtons.
CartState = np.ndarray  # shape (4,)
# endregion

# region step
G = 9.8
CART_MASS = 1.0
POLE_MASS = 0.1
HALF_LENGTH = 0.5  # half the pole's length (m)
DT = 0.02  # the simulator's time step (s)


def derivs(s: CartState, force: float) -> CartState:
    """ds/dt for force F (N): the frictionless cart-pole equations of motion."""
    _, x_dot, theta, theta_dot = s
    total = CART_MASS + POLE_MASS
    sin, cos = np.sin(theta), np.cos(theta)
    temp = (force + POLE_MASS * HALF_LENGTH * theta_dot**2 * sin) / total
    theta_acc = (G * sin - cos * temp) / (HALF_LENGTH * (4 / 3 - POLE_MASS * cos**2 / total))
    x_acc = temp - POLE_MASS * HALF_LENGTH * theta_acc * cos / total
    return np.array([x_dot, x_acc, theta_dot, theta_acc])


def step(s: CartState, force: float, dt: float = DT) -> CartState:
    """One step of the true simulator: classical Runge-Kutta (RK4) over dt, force held constant."""
    s = np.asarray(s, dtype=float)
    k1 = derivs(s, force)
    k2 = derivs(s + dt / 2 * k1, force)
    k3 = derivs(s + dt / 2 * k2, force)
    k4 = derivs(s + dt * k3, force)
    return s + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
# endregion


# region rollout
# A one-step model: the true simulator, or a learned approximation of it.
Model = Callable[[CartState, float], CartState]


def rollout(model: Model, s0: CartState, forces: list[float] | np.ndarray) -> np.ndarray:
    """Feed a model its own predictions for as many steps as there are forces; returns s_0 ... s_H, shape (H + 1, 4)."""
    states = [np.asarray(s0, dtype=float)]
    for f in forces:
        states.append(model(states[-1], f))
    return np.array(states)
# endregion


def energy(s: CartState) -> float:
    """Total mechanical energy (J): kinetic of cart and pole (translation and rotation about its centre) plus potential."""
    _, x_dot, theta, theta_dot = s
    m, l = POLE_MASS, HALF_LENGTH
    kinetic = (
        0.5 * (CART_MASS + m) * x_dot**2
        + m * l * x_dot * theta_dot * np.cos(theta)
        + (2 / 3) * m * l**2 * theta_dot**2
    )
    return float(kinetic + m * G * l * np.cos(theta))


# region fit
def features(states: np.ndarray, forces: np.ndarray) -> np.ndarray:
    """Features of each input: the state, the force and a constant 1 (for the bias c). Shape (N, 6)."""
    states = np.atleast_2d(states)
    forces = np.atleast_1d(forces)
    return np.column_stack([states, forces, np.ones(len(forces))])


def linear_model(W: np.ndarray) -> Model:
    """A linear model s' = A s + B F + c, with W of shape (4, 6) holding [A | B | c] row by row."""
    return lambda s, f: W @ features(s, f)[0]


def fit_linear(inputs: np.ndarray, forces: np.ndarray, targets: np.ndarray, lam: float = 1e-6) -> np.ndarray:
    """Least squares for all four outputs at once: solve (Z^T Z + lam I) W^T = Z^T Y (lam tiny, for stability)."""
    Z = features(inputs, forces)  # (N, 6)
    Y = np.asarray(targets)  # (N, 4)
    W_t = np.linalg.solve(Z.T @ Z + lam * np.eye(Z.shape[1]), Z.T @ Y)  # (6, 4)
    return W_t.T
# endregion


# region data
def training_data(n: int = 2000, seed: int = 7) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Training data: random states near upright (|theta| of about 0.05 rad) and random forces, one true step each."""
    rng = np.random.default_rng(seed)
    inputs = rng.normal(0.0, [0.5, 0.5, 0.05, 0.3], size=(n, 4))
    forces = rng.uniform(-10, 10, size=n)
    targets = np.array([step(s, f) for s, f in zip(inputs, forces)])
    return inputs, forces, targets
# endregion


@cache
def learned_weights() -> np.ndarray:
    """The learned model's fixed weights (fitted once, deterministically, from training_data())."""
    return fit_linear(*training_data())


def learned(s: CartState, f: float) -> CartState:
    """The learned linear model, s' = A s + B F + c."""
    return linear_model(learned_weights())(s, f)


def state_error(a: CartState, b: CartState) -> float:
    """Euclidean distance between two states."""
    return float(np.linalg.norm(np.asarray(a) - np.asarray(b)))


# region horizon
def error_vs_horizon(model: Model, horizon: int, starts: int = 40, seed: int = 11) -> dict[str, np.ndarray]:
    """
    Mean error against horizon, over `starts` random initial states (fixed seed) and zero force:
    - rollout: the model is fed its own predictions (open loop), as when it imagines the future;
    - one_step: at every step the model starts again from the true state (its single-step error only).
    """
    rng = np.random.default_rng(seed)
    rollout_err = np.zeros(horizon + 1)
    one_step_err = np.zeros(horizon + 1)
    forces = np.zeros(horizon)
    for _ in range(starts):
        s0 = rng.normal(0.0, [0.2, 0.2, 0.05, 0.1])
        truth = rollout(step, s0, forces)
        imagined = rollout(model, s0, forces)
        for t in range(1, horizon + 1):
            rollout_err[t] += state_error(imagined[t], truth[t]) / starts
            one_step_err[t] += state_error(model(truth[t - 1], 0.0), truth[t]) / starts
    return {"rollout": rollout_err, "one_step": one_step_err}
# endregion
