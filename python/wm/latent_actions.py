"""Latent actions from unlabelled frame pairs: Genie's idea at toy scale.

The learner sees only pairs of frames of the tiny game (wm.tiny_game), never the key that was pressed. For each pair
it measures how the player-coloured pixels moved (a 2-D vector), then vector-quantises those vectors with k-means into
k codes. Each code then "comes to mean" one kind of transition. The true keys are kept beside the pairs only to grade
the result afterwards.

Simplified on purpose: Genie learns its encoder (a transformer over the frames) and its codebook jointly, with a
decoder that must rebuild the next frame from the past frames and the code. Here the encoder is a fixed, hand-written
feature and only the codebook is learned.
"""

from typing import NamedTuple

import numpy as np

from wm.tiny_game import ACTIONS, H, PLAYER, START, W, blocked, render, step


class FramePair(NamedTuple):
    before: np.ndarray
    after: np.ndarray
    hidden: int  # the key actually pressed: hidden from the learner, used only for grading


def frame_pairs(n: int, rng: np.random.Generator, clean: bool = True) -> list[FramePair]:
    """``n`` frame pairs from random play. ``clean``: the player never walks into a wall, so every key changes the
    frame in its own way (a blocked move looks exactly like "stay")."""
    out, s = [], START
    while len(out) < n:
        a = int(rng.integers(len(ACTIONS)))
        if clean and blocked(s, a):
            continue
        nxt = step(s, a)
        out.append(FramePair(render(s), render(nxt), a))
        s = nxt
    return out


# region feature
def centroid(f: np.ndarray) -> np.ndarray:
    """Where the player-coloured pixels are on average, (x, y)."""
    cells = np.flatnonzero(f == PLAYER)
    if len(cells) == 0:
        return np.array([W / 2, H / 2])
    return np.array([np.mean(cells % W), np.mean(cells // W)])


def feature(before: np.ndarray, after: np.ndarray) -> np.ndarray:
    """The learner's only input: how the player-coloured pixels moved between the two frames."""
    return centroid(after) - centroid(before)
# endregion


# region kmeans
def assign(points: np.ndarray, centroids: np.ndarray) -> np.ndarray:
    """Each point's code: the index of the nearest centroid (ties go to the lower index)."""
    d2 = ((points[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)  # [n, k] squared distances
    return np.argmin(d2, axis=1)


def update(points: np.ndarray, codes: np.ndarray, centroids: np.ndarray) -> np.ndarray:
    """Move each centroid to the mean of its points (a code with no points stays where it is)."""
    new = centroids.copy()
    for j in range(len(centroids)):
        mine = points[codes == j]
        if len(mine):
            new[j] = mine.mean(axis=0)
    return new


def kmeans_plus_plus(points: np.ndarray, k: int, rng: np.random.Generator) -> np.ndarray:
    """k-means++ start: the first centroid is a random point, each next one a point drawn with probability
    proportional to its squared distance from the centroids so far."""
    centroids = [points[rng.integers(len(points))]]
    while len(centroids) < k:
        d2 = ((points[:, None, :] - np.array(centroids)[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        if d2.sum() == 0:  # fewer distinct movements than codes: a spare code
            centroids.append(centroids[0])
            continue
        centroids.append(points[rng.choice(len(points), p=d2 / d2.sum())])
    return np.array(centroids, dtype=np.float64)


def learn_latent_actions(
    pairs: list[FramePair], k: int, rng: np.random.Generator, iters: int = 25
) -> tuple[np.ndarray, np.ndarray]:
    """Vector quantisation by k-means: returns the codebook (k movement vectors) and the code of every pair."""
    points = np.array([feature(p.before, p.after) for p in pairs])
    centroids = kmeans_plus_plus(points, k, rng)
    codes = np.zeros(len(points), dtype=np.int64)
    for _ in range(iters):
        codes = assign(points, centroids)
        centroids = update(points, codes, centroids)
    return centroids, codes
# endregion


def confusion(pairs: list[FramePair], codes, k: int) -> np.ndarray:
    """Grading only: counts[code][true key]."""
    m = np.zeros((k, len(ACTIONS)), dtype=np.int64)
    for p, c in zip(pairs, codes):
        m[c, p.hidden] += 1
    return m


def purity(m: np.ndarray) -> float:
    """Fraction of pairs whose code's majority key is their own key (1 = the codes recover the keys up to renaming)."""
    total = m.sum()
    return float(m.max(axis=1).sum() / total) if total else 0.0


def apply_code(f: np.ndarray, v) -> np.ndarray:
    """Play a code: move the player-coloured pixels of f by the code's vector, rounded to whole cells (walls stop it).
    The learner never needs to know which key that was."""
    dx, dy = (int(np.floor(c + 0.5)) for c in v)  # round half up, like JavaScript's Math.round
    out = np.where(f == PLAYER, 0, f)
    for i in np.flatnonzero(f == PLAYER):
        x = min(W - 1, max(0, i % W + dx))
        y = min(H - 1, max(0, i // W + dy))
        out[y * W + x] = PLAYER
    return out
