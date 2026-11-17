"""Volume rendering (Kajiya & Von Herzen 1984; Max 1995; the form NeRF uses).

Camera rays, samples along a ray, and the emission–absorption quadrature

    C = Σ_i T_i (1 − e^{−σ_i δ_i}) c_i,    T_i = e^{−Σ_{j<i} σ_j δ_j},

whose weights w_i = T_i (1 − e^{−σ_i δ_i}) sum to 1 − T_final. Works in 2-D (the demo's slice) and 3-D (the tiny
NeRF). The browser runs the same model, ported to TypeScript (src/models/volumeRender.ts).
"""

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np


# --- camera rays ----------------------------------------------------------------------------------------------
@dataclass
class Camera:
    """A pinhole camera: image size, focal length in pixels, and a camera-to-world pose."""

    width: int
    height: int
    focal: float  # f = (width / 2) / tan(fov / 2)
    right: np.ndarray  # the rotation's columns: camera right, up and back in world coordinates
    up: np.ndarray  # (the camera looks along −back)
    back: np.ndarray
    origin: np.ndarray  # camera centre in world coordinates


# region rays
def camera_ray(cam: Camera, i, j) -> tuple[np.ndarray, np.ndarray]:
    """The ray through the centre of pixel (i, j): column i, row j from the top.

    i and j may be numbers or arrays of the same shape; returns the origin o and unit directions d (..., 3).
    """
    i, j = np.asarray(i, dtype=float), np.asarray(j, dtype=float)
    # pixel -> camera coordinates (x right, y up, z back); the image plane sits at z = -1
    x = (i + 0.5 - cam.width / 2) / cam.focal
    y = -(j + 0.5 - cam.height / 2) / cam.focal  # rows count downwards, y points up
    z = -1.0
    # camera -> world: d = R [x, y, z], with R's columns right, up, back
    d = x[..., None] * cam.right + y[..., None] * cam.up + z * cam.back
    d = d / np.linalg.norm(d, axis=-1, keepdims=True)
    return cam.origin.copy(), d
# endregion


def orbit_camera(size: int, fov_deg: float, radius: float, azimuth: float, elevation: float) -> Camera:
    """A camera on a sphere of radius r around the origin, looking at the origin, y up."""
    back = np.array([np.cos(elevation) * np.sin(azimuth), np.sin(elevation), np.cos(elevation) * np.cos(azimuth)])
    right = np.cross([0.0, 1.0, 0.0], back)
    right /= np.linalg.norm(right)
    up = np.cross(back, right)
    focal = size / 2 / np.tan(np.radians(fov_deg / 2))
    return Camera(size, size, focal, right, up, back, back * radius)


def ray_box(o: np.ndarray, d: np.ndarray, b: float) -> tuple[float, float] | None:
    """Where a ray enters and leaves the box [−b, b]^n (the slab method), or None if it misses."""
    with np.errstate(divide="ignore"):
        inv = 1 / np.asarray(d, dtype=float)
    a, c = (-b - o) * inv, (b - o) * inv
    t0 = max(np.minimum(a, c).max(), 0.0)  # the last plane the ray enters through
    t1 = np.maximum(a, c).min()  # the first plane it leaves through
    return (float(t0), float(t1)) if t1 > t0 else None


# --- sampling along a ray -------------------------------------------------------------------------------------
# region sampling
def sample_along(near: float, far: float, n: int, u: np.ndarray | None = None) -> np.ndarray:
    """n distances in [near, far]: the midpoints of n equal bins, or, given n uniform numbers u, one point per bin
    (NeRF's stratified sampling, so training sees every depth)."""
    step = (far - near) / n
    offset = 0.5 if u is None else np.asarray(u)
    return near + (np.arange(n) + offset) * step


def deltas(ts: np.ndarray, far: float) -> np.ndarray:
    """δ_i = t_{i+1} − t_i, and for the last sample the distance to far, so the deltas tile the ray up to far."""
    return np.append(ts[1:], far) - ts
# endregion


# --- the quadrature ---------------------------------------------------------------------------------------------
@dataclass
class RayResult:
    alphas: np.ndarray  # α_i = 1 − e^{−σ_i δ_i}: the chance the ray stops inside segment i
    trans: np.ndarray  # T_i = Π_{j<i} (1 − α_j): the chance the ray reaches sample i
    weights: np.ndarray  # w_i = T_i α_i: how much sample i contributes to the pixel
    colour: np.ndarray  # C = Σ w_i c_i (no background)
    t_final: float  # T_final = Π_i (1 − α_i): the light that passes the whole ray (the background's share)


# region quadrature
def render_ray(sigmas: np.ndarray, colours: np.ndarray, ts: np.ndarray, far: float) -> RayResult:
    """Composite densities σ_i (n,) and colours c_i (n, 3) at distances t_i (front to back) into one colour."""
    sigmas, colours = np.asarray(sigmas, dtype=float), np.asarray(colours, dtype=float)
    alphas = 1 - np.exp(-sigmas * deltas(np.asarray(ts, dtype=float), far))
    # T_i is the product of (1 − α_j) over the samples in front of i: an exclusive cumulative product
    passes = np.cumprod(1 - alphas)  # passes[i] = T_{i+1}
    trans = np.concatenate([[1.0], passes[:-1]])
    weights = trans * alphas
    colour = weights @ colours  # Σ_i w_i c_i
    return RayResult(alphas, trans, weights, colour, float(passes[-1]))
# endregion


def over(res: RayResult, background: np.ndarray) -> np.ndarray:
    """The colour seen over a background: C + T_final · background."""
    return res.colour + res.t_final * np.asarray(background, dtype=float)


Field = Callable[[np.ndarray], tuple[float, np.ndarray]]


def march_field(field: Field, o, d, near: float, far: float, n: int, u=None):
    """March a ray through a field p -> (σ, colour): sample, evaluate, composite. Returns (result, ts, points)."""
    ts = sample_along(near, far, n, u)
    points = np.asarray(o, dtype=float) + ts[:, None] * np.asarray(d, dtype=float)
    values = [field(p) for p in points]
    sigmas = np.array([s for s, _ in values])
    colours = np.array([c for _, c in values])
    return render_ray(sigmas, colours, ts, far), ts, points


# --- hierarchical sampling ------------------------------------------------------------------------------------
# region hierarchical
def sample_pdf(ts: np.ndarray, weights: np.ndarray, near: float, far: float, n: int, u=None) -> np.ndarray:
    """NeRF's fine pass: draw n new distances from the piecewise-constant pdf the coarse weights define over the bins
    around the coarse samples (inverse-transform sampling), so the samples gather where the surface is.
    u holds n uniform numbers (evenly spaced if omitted, so the result is deterministic)."""
    ts = np.asarray(ts, dtype=float)
    edges = np.concatenate([[near], (ts[1:] + ts[:-1]) / 2, [far]])  # bin edges: halfway between samples
    w = np.asarray(weights, dtype=float) + 1e-5  # a little everywhere, so no bin is impossible
    cdf = np.concatenate([[0.0], np.cumsum(w / w.sum())])
    q = (np.arange(n) + 0.5) / n if u is None else np.asarray(u, dtype=float)
    # the bin each q falls in: the last b with cdf[b] < q (the first bin for q = 0), never past the last bin
    b = np.clip(np.searchsorted(cdf, q, side="left") - 1, 0, len(w) - 1)
    f = (q - cdf[b]) / (cdf[b + 1] - cdf[b])  # how far into the bin's share of probability
    return np.sort(edges[b] + f * (edges[b + 1] - edges[b]))
# endregion


# --- a density field for the demo -------------------------------------------------------------------------------
@dataclass
class Blob:
    """A soft blob: a Gaussian bump of density with a colour."""

    centre: np.ndarray
    radius: float
    peak: float  # peak density σ (per unit length)
    colour: np.ndarray


def blob_field(blobs: list[Blob]) -> Field:
    """σ(p) = Σ_k peak_k e^{−|p−c_k|²/(2r_k²)}; the colour is the density-weighted mean of the blobs' colours."""

    def field(p: np.ndarray) -> tuple[float, np.ndarray]:
        s = np.array([b.peak * np.exp(-np.sum((p - b.centre) ** 2) / (2 * b.radius**2)) for b in blobs])
        sigma = float(s.sum())
        if sigma <= 1e-12:
            return sigma, np.zeros(3)
        return sigma, s @ np.array([b.colour for b in blobs]) / sigma

    return field
