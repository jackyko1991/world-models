"""A tiny NeRF, forward pass only: positional encoding, an MLP x -> (σ, rgb) as numpy matrix products, and pixels
rendered with the volume-rendering sum of volume_render.py.

The weights are trained offline by scripts/tiny_nerf.py (public/models/tiny-nerf.json). The browser runs the same
model, ported to TypeScript (src/models/nerfTiny.ts).
"""

from dataclasses import dataclass

import numpy as np

from wm.volume_render import Camera, camera_ray, ray_box, render_ray, sample_along


@dataclass
class TinyNerf:
    frequencies: int  # L, the number of encoding frequencies
    weights: list[np.ndarray]  # one (out, in) matrix per dense layer
    biases: list[np.ndarray]
    render: dict  # size, fov, radius, box, samples, background


def load_nerf(data: dict) -> TinyNerf:
    """Read the asset: each layer's W is stored row-major [out][in]."""
    weights = [np.array(l["W"], dtype=float).reshape(l["out"], l["in"]) for l in data["layers"]]
    biases = [np.array(l["b"], dtype=float) for l in data["layers"]]
    return TinyNerf(data["encoding"]["frequencies"], weights, biases, data["render"])


def parameter_count(m: TinyNerf) -> int:
    return sum(W.size + b.size for W, b in zip(m.weights, m.biases))


# region pe
def positional_encoding(p: np.ndarray, L: int) -> np.ndarray:
    """γ(p) = (p, sin(2^k π p), cos(2^k π p)) for k = 0 … L−1, applied to each coordinate.

    p has shape (..., D); the result has D (1 + 2L) numbers per point (39 for a 3-D point and L = 6), in the order
    the training script uses: p itself, then all the sines, then all the cosines, each grouped by frequency.
    """
    p = np.asarray(p, dtype=float)
    freqs = 2.0 ** np.arange(L) * np.pi  # 2^k π
    angles = (freqs[:, None] * p[..., None, :]).reshape(*p.shape[:-1], L * p.shape[-1])  # (..., L·D)
    return np.concatenate([p, np.sin(angles), np.cos(angles)], axis=-1)
# endregion


# region mlp
def softplus(z):
    return np.maximum(z, 0) + np.log1p(np.exp(-np.abs(z)))  # log(1 + e^z), without overflow


def sigmoid(z):
    return 1 / (1 + np.exp(-z))


def field(m: TinyNerf, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The network at points x (..., 3): γ(x) -> ReLU layers -> σ = softplus(h₀) ≥ 0, rgb = sigmoid(h₁…₃) ∈ (0, 1)."""
    h = positional_encoding(x, m.frequencies)
    last = len(m.weights) - 1
    for l, (W, b) in enumerate(zip(m.weights, m.biases)):
        h = h @ W.T + b  # every point at once: (..., in) -> (..., out)
        if l < last:
            h = np.maximum(h, 0)  # ReLU on the hidden layers
    return softplus(h[..., 0]), sigmoid(h[..., 1:4])
# endregion


# region pixel
def render_pixel(m: TinyNerf, cam: Camera, i: float, j: float) -> np.ndarray:
    """One pixel: its camera ray, samples at the bin midpoints where the ray crosses the scene's box, the network at
    every sample in one batch, and the volume-rendering sum over the background."""
    background = np.asarray(m.render["background"], dtype=float)
    o, d = camera_ray(cam, i, j)
    span = ray_box(o, d, m.render["box"])
    if span is None:
        return background.copy()  # the ray misses the scene
    near, far = span
    ts = sample_along(near, far, m.render["samples"])
    sigma, rgb = field(m, o + ts[:, None] * d)
    res = render_ray(sigma, rgb, ts, far)
    return res.colour + res.t_final * background
# endregion


def render_image(m: TinyNerf, cam: Camera) -> np.ndarray:
    """The whole image, (height, width, 3) in [0, 1], one pixel at a time."""
    return np.array([[render_pixel(m, cam, i, j) for i in range(cam.width)] for j in range(cam.height)])
