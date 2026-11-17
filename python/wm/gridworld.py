"""
A small gridworld with a true step function and a "learned" model that is wrong in two visible, explainable ways
(Concepts > What is a world model?; Coding Skills > States, models and rollouts).

The world: walls, floor, a strip of ice, a key and a locked door in front of the goal room. The true dynamics:
- a move into a wall (or into the door while it is locked and you hold no key) leaves you where you are;
- stepping onto ice makes you slide on in the same direction until you leave the ice or would hit a wall;
- stepping onto the key picks it up; walking into the door while holding the key opens it for good;
- reaching the goal gives reward 1.

The learned model stands in for a model fitted to logged transitions in which the agent never walked on ice and
never carried the key to the door. It has learned walls, floor, key pickup and reward, but believes ice is floor
(no slide) and that a door is a wall that never opens. Pure functions, no randomness: p(s'|s,a) is a point mass.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Callable, Literal, NamedTuple

# region types
# What a cell of the map is made of. The map never changes; what can change (key taken, door open) is in State.
Cell = Literal["wall", "floor", "ice", "key", "door", "goal"]

# The four moves.
Action = Literal["up", "down", "left", "right"]


@dataclass(frozen=True)
class State:
    """Everything the world needs to know to compute the next step."""

    row: int
    col: int
    has_key: bool = False  # the agent is carrying the key (so the key is no longer on the map)
    door_open: bool = False  # the door has been opened (it stays open)


# An observation is a picture of the world: one symbol per cell, with the agent drawn on top.
Frame = list[list[str]]


class Transition(NamedTuple):
    """One transition, as a model predicts it or as the world produces it."""

    next: State
    reward: float
# endregion


# The map, row by row: # wall, . floor, ~ ice, K key, D door, G goal, A where the agent starts.
MAP_TEXT = [
    "########",
    "#A..~~.#",
    "#.#....#",
    "#K#.##D#",
    "#.#.#..#",
    "#...#.G#",
    "########",
]

SYMBOL: dict[str, Cell] = {"#": "wall", ".": "floor", "~": "ice", "K": "key", "D": "door", "G": "goal", "A": "floor"}
CELL_SYMBOL: dict[Cell, str] = {"wall": "#", "floor": ".", "ice": "~", "key": "K", "door": "D", "goal": "G"}

MAP: list[list[Cell]] = [[SYMBOL[ch] for ch in line] for line in MAP_TEXT]
ROWS = len(MAP)
COLS = len(MAP[0])

ACTIONS: list[Action] = ["up", "down", "left", "right"]
DELTA: dict[Action, tuple[int, int]] = {"up": (-1, 0), "down": (1, 0), "left": (0, -1), "right": (0, 1)}


def start() -> State:
    """The start state: the agent on the "A" of the map, no key, door locked."""
    row = next(r for r, line in enumerate(MAP_TEXT) if "A" in line)
    return State(row, MAP_TEXT[row].index("A"))


def cell_at(s: State, row: int, col: int) -> Cell:
    """The cell as it looks in a given state: a taken key is floor, an opened door is floor."""
    c = MAP[row][col]
    if c == "key" and s.has_key:
        return "floor"
    if c == "door" and s.door_open:
        return "floor"
    return c


# region step
def true_step(s: State, a: Action) -> Transition:
    """The true world: one step of the dynamics and its reward."""
    dr, dc = DELTA[a]
    row, col, has_key, door_open = s.row, s.col, s.has_key, s.door_open

    def blocked(r: int, c: int) -> bool:
        cell = cell_at(State(row, col, has_key, door_open), r, c)
        return cell == "wall" or (cell == "door" and not has_key)

    if not blocked(row + dr, col + dc):
        row, col = row + dr, col + dc
        # ice: keep sliding while on ice and the next cell is free
        while MAP[row][col] == "ice" and not blocked(row + dr, col + dc):
            row, col = row + dr, col + dc
    if MAP[row][col] == "key":
        has_key = True
    if MAP[row][col] == "door":
        door_open = True
    nxt = State(row, col, has_key, door_open)
    return Transition(nxt, reward(nxt))


def learned_step(s: State, a: Action) -> Transition:
    """What the learned model predicts: it treats ice as floor and every door as a wall."""
    dr, dc = DELTA[a]
    row, col, has_key = s.row, s.col, s.has_key
    cell = cell_at(s, row + dr, col + dc)
    if cell != "wall" and cell != "door":  # blind spot 2: a door never opens
        row, col = row + dr, col + dc  # blind spot 1: no slide on ice
    if MAP[row][col] == "key":
        has_key = True
    nxt = replace(s, row=row, col=col, has_key=has_key)
    return Transition(nxt, reward(nxt))


def reward(s: State) -> float:
    """The reward model r(s'): 1 on the goal, 0 elsewhere."""
    return 1.0 if MAP[s.row][s.col] == "goal" else 0.0
# endregion


# region observe
def observe(s: State) -> Frame:
    """The observation model: draw the state as a frame (agent "A" on top of the cell it stands on)."""
    return [
        ["A" if (r, c) == (s.row, s.col) else CELL_SYMBOL[cell_at(s, r, c)] for c in range(COLS)]
        for r in range(ROWS)
    ]


def diff_cells(a: Frame, b: Frame) -> list[tuple[int, int]]:
    """The cells where two frames differ, as (row, col) pairs."""
    return [(r, c) for r, line in enumerate(a) for c, ch in enumerate(line) if ch != b[r][c]]
# endregion


# region rollout
Step = Callable[[State, Action], Transition]  # the world, or a model of it


def rollout(step: Step, s0: State, actions: list[Action]) -> list[State]:
    """Run a sequence of actions through a step function (the world or the model) and keep every state."""
    states = [s0]
    for a in actions:
        states.append(step(states[-1], a).next)
    return states
# endregion
