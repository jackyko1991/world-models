"""A tiny game, and a count-based, action-conditioned next-frame generator learned from recorded play.

The game: a 6 x 4 grid with a player and a coin. Stepping on the coin moves it to a new spot chosen by a clock the
frame does not show, so from frames alone a coin pick-up has several possible outcomes.

The generator has the shape of a video world model, shrunk to a lookup table:

    frame -> tokens (2 x 2 patches, each mapped to a codebook entry) -> table[(tokens, action)] -> counts of next tokens

States that never appeared in the recorded play have no entry: there the generator can only guess.
"""

from collections import Counter
from typing import NamedTuple

import numpy as np

W, H = 6, 4
EMPTY, PLAYER, COIN = 0, 1, 2  # cell values in a frame

ACTIONS = ("stay", "left", "right", "up", "down")
DX = (0, -1, 1, 0, 0)
DY = (0, 0, 0, -1, 1)
COIN_SPOTS = ((5, 0), (0, 3), (3, 1), (5, 3), (1, 0))  # where the coin can appear; the hidden clock picks which


class GameState(NamedTuple):
    px: int
    py: int
    coin: int  # index into COIN_SPOTS
    clock: int  # never drawn in the frame


START = GameState(px=2, py=2, coin=0, clock=0)


# region step
def step(s: GameState, a: int) -> GameState:
    """One step of the true game. Walls block; eating the coin moves it to COIN_SPOTS[clock mod 5] (never under the
    player)."""
    px = min(W - 1, max(0, s.px + DX[a]))
    py = min(H - 1, max(0, s.py + DY[a]))
    clock = s.clock + 1
    coin = s.coin
    if (px, py) == COIN_SPOTS[coin]:
        coin = clock % len(COIN_SPOTS)
        while COIN_SPOTS[coin] == (px, py):
            coin = (coin + 1) % len(COIN_SPOTS)
    return GameState(px, py, coin, clock)
# endregion


def blocked(s: GameState, a: int) -> bool:
    """True when the action walks into a wall (the player does not move)."""
    x, y = s.px + DX[a], s.py + DY[a]
    return a != 0 and not (0 <= x < W and 0 <= y < H)


def render(s: GameState) -> np.ndarray:
    """The frame: W * H cells, row-major (cell (x, y) is at index y * W + x)."""
    f = np.full(W * H, EMPTY, dtype=np.int64)
    cx, cy = COIN_SPOTS[s.coin]
    f[cy * W + cx] = COIN
    f[s.py * W + s.px] = PLAYER
    return f


# ---- tokenizer: 2 x 2 patches -> codebook ids ----------------------------------------------------------------------

PATCH = 2
TOKENS = (W // PATCH) * (H // PATCH)  # 6 tokens per frame
UNKNOWN = -1  # the token for a patch pattern the codebook has never seen


# region tokenize
def patches(f: np.ndarray) -> list[int]:
    """The patch patterns of a frame: each 2 x 2 patch's cells (top-left, top-right, bottom-left, bottom-right) read
    as the digits of a base-3 number, least significant first (0 ... 80)."""
    out = []
    for by in range(0, H, PATCH):
        for bx in range(0, W, PATCH):
            cells = [f[(by + k // 2) * W + bx + k % 2] for k in range(PATCH * PATCH)]
            out.append(sum(int(c) * 3**k for k, c in enumerate(cells)))
    return out


def build_codebook(frames: list[np.ndarray]) -> list[int]:
    """The codebook: every patch pattern seen in the training frames, numbered in order of first appearance."""
    patterns: list[int] = []
    for f in frames:
        for p in patches(f):
            if p not in patterns:
                patterns.append(p)
    return patterns


def encode(f: np.ndarray, codebook: list[int]) -> tuple[int, ...]:
    """A frame as tokens: the codebook id of each patch (UNKNOWN if the pattern is not in the codebook)."""
    return tuple(codebook.index(p) if p in codebook else UNKNOWN for p in patches(f))
# endregion


def decode(tokens, codebook: list[int]) -> np.ndarray:
    """Tokens -> frame; an UNKNOWN token decodes to an empty patch."""
    f = np.full(W * H, EMPTY, dtype=np.int64)
    per = W // PATCH
    for i, t in enumerate(tokens):
        code = 0 if t == UNKNOWN else codebook[t]
        bx, by = (i % per) * PATCH, (i // per) * PATCH
        for k in range(PATCH * PATCH):
            f[(by + k // 2) * W + bx + k % 2] = code % 3
            code //= 3
    return f


# ---- recorded play -------------------------------------------------------------------------------------------------


class Transition(NamedTuple):
    before: GameState
    action: int
    after: GameState


def record(steps: int, rng: np.random.Generator) -> list[Transition]:
    """``steps`` moves of a player pressing random keys, starting from START."""
    out, s = [], START
    for _ in range(steps):
        a = int(rng.integers(len(ACTIONS)))
        n = step(s, a)
        out.append(Transition(s, a, n))
        s = n
    return out


# ---- the generator: a table of counts ------------------------------------------------------------------------------


class Generator(NamedTuple):
    codebook: list[int]
    table: dict[tuple[tuple[int, ...], int], Counter]  # (tokens, action) -> Counter of next tokens


class Prediction(NamedTuple):
    seen: int  # how often this (frame, action) was seen in training; 0 means the generator is guessing
    outcomes: list[tuple[tuple[int, ...], float]]  # (next tokens, probability), most likely first


# region generator
def train(play: list[Transition]) -> Generator:
    """"Training": tokenize every recorded frame and count which next frame followed each (frame, action)."""
    codebook = build_codebook([render(s) for t in play for s in (t.before, t.after)])
    table: dict = {}
    for t in play:
        key = (encode(render(t.before), codebook), t.action)
        table.setdefault(key, Counter())[encode(render(t.after), codebook)] += 1
    return Generator(codebook, table)


def predict(g: Generator, tokens: tuple[int, ...], a: int) -> Prediction:
    """p(next tokens | tokens, action) = count / total. Unseen: copy the frame unchanged, with seen = 0."""
    row = g.table.get((tuple(tokens), a))
    if row is None:
        return Prediction(0, [(tuple(tokens), 0.0)])
    n = sum(row.values())
    outcomes = [(nxt, c / n) for nxt, c in row.items()]
    outcomes.sort(key=lambda o: -o[1])  # stable: ties keep first-seen order
    return Prediction(n, outcomes)
# endregion


def coverage(g: Generator) -> tuple[int, int]:
    """How many of the reachable (state, action) pairs the table has an entry for: (seen, total)."""
    seen = total = 0
    for px in range(W):
        for py in range(H):
            for coin in range(len(COIN_SPOTS)):
                if COIN_SPOTS[coin] == (px, py):
                    continue
                tokens = encode(render(GameState(px, py, coin, 0)), g.codebook)
                for a in range(len(ACTIONS)):
                    total += 1
                    seen += (tokens, a) in g.table
    return seen, total
