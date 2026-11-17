"""The latent map: the decoder of a tiny VAE (a 2-D latent code -> a 16 x 16 frame of a ball in a box).

The VAE is trained offline by ``scripts/latent_map.py`` (PyTorch); its decoder weights are saved in
``public/models/latent-map.json``. This module is the readable numpy version of what the browser does with them:
decode a code with plain matrix products, draw the true frame for a ball position, and walk between two frames either
in pixels or in latent space.
"""

import json
from pathlib import Path

import numpy as np

ASSET = Path(__file__).resolve().parents[2] / "public" / "models" / "latent-map.json"

Layer = tuple[np.ndarray, np.ndarray]  # (W with shape [out, in], b with shape [out])


def load(path: Path = ASSET) -> dict:
    """Read the asset; ``layers`` becomes a list of numpy (W, b) pairs, everything else stays as JSON gave it."""
    data = json.loads(Path(path).read_text())
    data["layers"] = layers_from_json(data["layers"])
    return data


def layers_from_json(layers: list[dict]) -> list[Layer]:
    return [(np.array(layer["W"], dtype=np.float64), np.array(layer["b"], dtype=np.float64)) for layer in layers]


# region decode
def relu(x: np.ndarray) -> np.ndarray:
    return np.maximum(x, 0.0)


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def decode(layers: list[Layer], z) -> np.ndarray:
    """Decode a latent z (2 numbers) to a frame: 256 pixels in [0, 1], row-major.

    Three affine layers, h <- W h + b, with a ReLU between them and a sigmoid at the end, so every pixel is a
    brightness between 0 and 1.
    """
    h = np.asarray(z, dtype=np.float64)
    for k, (W, b) in enumerate(layers):
        h = W @ h + b
        h = relu(h) if k < len(layers) - 1 else sigmoid(h)
    return h
# endregion


def render_frame(size: int, radius: float, x: float, y: float) -> np.ndarray:
    """The true frame: a ball of radius r centred at (x, y), anti-aliased by one pixel (row-major, flattened)."""
    c = np.arange(size) + 0.5  # pixel centres
    d = np.hypot(c[None, :] - x, c[:, None] - y)  # [row][col] distance to the centre
    return np.clip(radius + 0.5 - d, 0.0, 1.0).ravel()


# region lerp
def lerp_pixels(a: np.ndarray, b: np.ndarray, t: float) -> np.ndarray:
    """Pixel interpolation: cross-fade two frames."""
    return (1 - t) * a + t * b


def lerp_latent(layers: list[Layer], za, zb, t: float) -> np.ndarray:
    """Latent interpolation: walk the straight line between two codes and decode each point."""
    za, zb = np.asarray(za, dtype=np.float64), np.asarray(zb, dtype=np.float64)
    return decode(layers, (1 - t) * za + t * zb)
# endregion


def nearest(zs: np.ndarray, z) -> int:
    """Index of the code in ``zs`` (shape [n, 2]) nearest to z: "which frame lives here?"."""
    return int(np.argmin(((np.asarray(zs) - np.asarray(z)) ** 2).sum(axis=1)))


def ink(f: np.ndarray) -> float:
    """Total brightness of a frame. A ball keeps its ink; a cross-fade of two balls does too, but spreads it."""
    return float(np.sum(f))


def peak(f: np.ndarray) -> float:
    """Brightest pixel: about 1 for a real ball, about 1/2 halfway through a cross-fade of two separate balls."""
    return float(np.max(f))
