"""
Monte Carlo tree search with UCT (Kocsis & Szepesvari 2006) on tic-tac-toe (Concepts > Planning and imagination >
muzero). Each iteration has four phases, written as separate functions: selection (walk down by the UCT score),
expansion (add one untried move), simulation (play random moves to the end) and backup (add the result to every node
on the path).

Here the search uses the true rules (`play`, `winner`). MuZero searches the same way but inside a *learned* model,
sketched by `MuZeroModel` at the end: no board is ever reconstructed.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Generic, Optional, TypeVar

import numpy as np

Board = tuple[int, ...]  # 9 cells, row by row: 1 = X, -1 = O, 0 = empty

LINES = ((0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6))


# region rules
def winner(b: Board) -> Optional[int]:
    """1 or -1 for a win, 0 for a draw, None while the game goes on."""
    for i, j, k in LINES:
        if b[i] != 0 and b[i] == b[j] == b[k]:
            return b[i]
    return None if 0 in b else 0


def to_move(b: Board) -> int:
    """Whose turn it is: X (1) moves first."""
    return -1 if b.count(1) > b.count(-1) else 1


def legal(b: Board) -> list[int]:
    """The empty cells, or none once the game is over."""
    return [i for i, v in enumerate(b) if v == 0] if winner(b) is None else []


def play(b: Board, i: int) -> Board:
    """The board after the player to move takes cell i."""
    return b[:i] + (to_move(b),) + b[i + 1 :]
# endregion


@dataclass(eq=False)
class Node:
    board: Board
    move: int = -1  # the move that led here (-1 at the root)
    parent: Optional[Node] = None
    children: list[Node] = field(default_factory=list)
    untried: list[int] = field(default_factory=list)
    n: int = 0  # visits
    w: float = 0.0  # total result, from the point of view of the player who made `move`


def new_node(board: Board, move: int = -1, parent: Optional[Node] = None) -> Node:
    return Node(tuple(board), move, parent, [], legal(tuple(board)))


# region mcts
def uct(child: Node, c: float) -> float:
    """The UCT score of a child: its mean result plus an exploration bonus that shrinks as it is visited."""
    return child.w / child.n + c * math.sqrt(math.log(child.parent.n) / child.n)


def select(root: Node, c: float = math.sqrt(2)) -> list[Node]:
    """1. Selection: from the root, follow the best UCT child while every move of the node has been tried."""
    path, node = [root], root
    while not node.untried and node.children:
        node = max(node.children, key=lambda ch: uct(ch, c))  # the first of equals wins
        path.append(node)
    return path


def expand(leaf: Node, rng: np.random.Generator) -> Node:
    """2. Expansion: add one untried move of the leaf as a new child (none at the end of a game)."""
    if not leaf.untried:
        return leaf
    move = leaf.untried.pop(rng.integers(len(leaf.untried)))
    child = new_node(play(leaf.board, move), move, leaf)
    leaf.children.append(child)
    return child


def simulate(board: Board, rng: np.random.Generator) -> Board:
    """3. Simulation: random moves to the end of the game; returns the final board (its winner is the result)."""
    while moves := legal(board):
        board = play(board, moves[rng.integers(len(moves))])
    return board


def backup(path: list[Node], result: int) -> None:
    """4. Backup: every node on the path gets a visit and the result, seen from the player who moved into it."""
    for node in path:
        node.n += 1
        if node.parent is not None:
            node.w += result * to_move(node.parent.board)


def iterate(root: Node, rng: np.random.Generator, c: float = math.sqrt(2)) -> tuple[list[Node], Board, int]:
    """One full iteration; returns the path (including the new node), the final board and the result."""
    path = select(root, c)
    child = expand(path[-1], rng)
    if child is not path[-1]:
        path.append(child)
    end = simulate(child.board, rng)
    result = winner(end)
    backup(path, result)
    return path, end, result


def best_move(board: Board, iterations: int, rng: np.random.Generator) -> tuple[int, Node]:
    """Search for `iterations` and return the most visited move at the root (and the tree)."""
    root = new_node(board)
    for _ in range(iterations):
        iterate(root, rng)
    return max(root.children, key=lambda ch: ch.n).move, root
# endregion


O = TypeVar("O")
H = TypeVar("H")


# region muzero
@dataclass
class MuZeroModel(Generic[O, H]):
    """
    MuZero's learned model (Schrittwieser et al. 2020), as three functions on a hidden state that need not mean
    anything to a person. MCTS runs exactly as above, but `g` replaces `play` and `f`'s value replaces `simulate`:
      h (representation): past observations -> hidden state s^0
      g (dynamics):       (s^k, action) -> (reward r^(k+1), next hidden state s^(k+1))
      f (prediction):     s^k -> (policy p^k, value v^k)
    Training unrolls g for K steps and matches only r^k, p^k, v^k to observed rewards, search policies and returns;
    there is no loss on reconstructing observations.
    """

    h: Callable[[list[O]], H]
    g: Callable[[H, int], tuple[float, H]]
    f: Callable[[H], tuple[list[float], float]]


def unroll(m: MuZeroModel[O, H], obs: list[O], actions: list[int]) -> list[dict]:
    """Unroll the learned model along a sequence of actions: the predictions a MuZero loss compares with real data."""
    s = m.h(obs)
    policy, value = m.f(s)
    out = [{"reward": 0.0, "policy": policy, "value": value}]
    for a in actions:
        reward, s = m.g(s, a)
        policy, value = m.f(s)
        out.append({"reward": reward, "policy": policy, "value": value})
    return out
# endregion
