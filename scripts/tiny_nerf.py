"""Train a tiny NeRF on a procedural scene and export its weights for the browser (public/models/tiny-nerf.json).

The scene is made here: a floor slab, two spheres and a box, Lambert-shaded with hard shadows, rendered by exact ray
casting from 40 cameras on an orbit (48 x 48 px) over a white background. The network is NeRF's MLP without view
dependence: positional encoding γ(x) (L = 6 frequencies plus x itself) → 3 hidden ReLU layers of 64 → (σ, rgb), about
11k parameters. Training renders rays with the same volume-rendering sum the site uses (src/models/volumeRender.ts):
40 stratified samples between where the ray enters and leaves the box [-1.2, 1.2]^3, composited over white.

The JSON also holds reference outputs computed here in float64 numpy from the exported (rounded) weights: σ and rgb at
fixed points and a few rendered pixels with midpoint samples, which tests/nerfTiny.test.ts checks the TS forward pass
against. Fixed seeds; a few minutes on a laptop CPU.

    pixi run -e train python scripts/tiny_nerf.py
"""

import json
import math
import time
from pathlib import Path

import numpy as np
import torch

OUT = Path(__file__).resolve().parent.parent / "public" / "models" / "tiny-nerf.json"

SIZE = 48  # image size in pixels
FOV = 40.0  # degrees
RADIUS = 3.5  # camera distance from the origin
BOX = 1.2  # the scene lives in [-BOX, BOX]^3
SAMPLES = 40  # samples per ray
FREQS = 6  # positional-encoding frequencies
WIDTH = 64
DEPTH = 3  # hidden layers
VIEWS = 40
TEST_VIEWS = 4
STEPS = 10000
BATCH = 2048
BACKGROUND = np.array([1.0, 1.0, 1.0])
LIGHT = np.array([0.45, 1.0, 0.35]) / np.linalg.norm([0.45, 1.0, 0.35])

# --- the procedural scene ----------------------------------------------------------------------------------------
SPHERES = [  # centre, radius, albedo
    (np.array([-0.35, 0.08, 0.15]), 0.4, np.array([0.85, 0.2, 0.15])),
    (np.array([0.42, -0.12, 0.55]), 0.2, np.array([0.95, 0.75, 0.15])),
]
BOXES = [  # centre, half extents, albedo
    (np.array([0.0, -0.4, 0.0]), np.array([1.0, 0.08, 1.0]), np.array([0.72, 0.72, 0.68])),
    (np.array([0.45, -0.02, -0.35]), np.array([0.28, 0.3, 0.28]), np.array([0.15, 0.4, 0.85])),
]


def hit_sphere(o, d, c, r):
    """Nearest positive hit distance per ray (inf if none), for rays o + t d (rows)."""
    oc = o - c
    b = (oc * d).sum(-1)
    q = (oc * oc).sum(-1) - r * r
    disc = b * b - q
    t = np.full(len(o), np.inf)
    ok = disc > 0
    s = np.sqrt(np.where(ok, disc, 0))
    t0, t1 = -b - s, -b + s
    t = np.where(ok & (t0 > 1e-4), t0, np.where(ok & (t1 > 1e-4), t1, np.inf))
    return t


def hit_box(o, d, c, h):
    with np.errstate(divide="ignore", invalid="ignore"):
        inv = 1.0 / d
        a = (c - h - o) * inv
        b = (c + h - o) * inv
    tmin = np.minimum(a, b).max(-1)
    tmax = np.maximum(a, b).min(-1)
    ok = tmax > np.maximum(tmin, 1e-4)
    return np.where(ok, np.where(tmin > 1e-4, tmin, tmax), np.inf)


def cast(o, d):
    """Nearest hit over all primitives: distance, normal, albedo."""
    n = len(o)
    best = np.full(n, np.inf)
    normal = np.zeros((n, 3))
    albedo = np.tile(BACKGROUND, (n, 1))
    for c, r, alb in SPHERES:
        t = hit_sphere(o, d, c, r)
        m = t < best
        best[m] = t[m]
        p = o[m] + t[m, None] * d[m]
        normal[m] = (p - c) / r
        albedo[m] = alb
    for c, h, alb in BOXES:
        t = hit_box(o, d, c, h)
        m = t < best
        best[m] = t[m]
        p = o[m] + t[m, None] * d[m]
        rel = (p - c) / h
        axis = np.abs(rel).argmax(-1)
        nm = np.zeros((m.sum(), 3))
        nm[np.arange(len(nm)), axis] = np.sign(rel[np.arange(len(nm)), axis])
        normal[m] = nm
        albedo[m] = alb
    return best, normal, albedo


def shade(o, d):
    t, normal, albedo = cast(o, d)
    hit = np.isfinite(t)
    rgb = np.tile(BACKGROUND, (len(o), 1))
    p = o[hit] + t[hit, None] * d[hit]
    lam = np.clip((normal[hit] * LIGHT).sum(-1), 0, None)
    ts, _, _ = cast(p + 1e-3 * normal[hit], np.tile(LIGHT, (len(p), 1)))
    lam = np.where(np.isfinite(ts), 0.0, lam)
    rgb[hit] = albedo[hit] * (0.35 + 0.65 * lam[:, None])
    return rgb


# --- cameras (the same conventions as orbitCamera / cameraRay in volumeRender.ts) -------------------------------
def orbit_camera(az, el):
    back = np.array([math.cos(el) * math.sin(az), math.sin(el), math.cos(el) * math.cos(az)])
    right = np.cross([0.0, 1.0, 0.0], back)
    right /= np.linalg.norm(right)
    up = np.cross(back, right)
    focal = SIZE / 2 / math.tan(math.radians(FOV / 2))
    return right, up, back, back * RADIUS, focal


def camera_rays(az, el):
    right, up, back, origin, focal = orbit_camera(az, el)
    j, i = np.meshgrid(np.arange(SIZE), np.arange(SIZE), indexing="ij")
    x = (i + 0.5 - SIZE / 2) / focal
    y = -(j + 0.5 - SIZE / 2) / focal
    d = x[..., None] * right + y[..., None] * up - back
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    return np.tile(origin, (SIZE * SIZE, 1)), d.reshape(-1, 3)


def ray_box(o, d):
    with np.errstate(divide="ignore"):
        inv = 1.0 / d
    a = (-BOX - o) * inv
    b = (BOX - o) * inv
    t0 = np.maximum(np.minimum(a, b).max(-1), 0)
    t1 = np.maximum(a, b).min(-1)
    return t0, t1, t1 > t0


# --- the network ---------------------------------------------------------------------------------------------------
def encode(x):
    """γ(x) = (x, sin(2^k π x), cos(2^k π x)) for k < FREQS, per coordinate: 3 + 6·FREQS features."""
    freqs = (2.0 ** torch.arange(FREQS, dtype=x.dtype)) * math.pi
    xf = x[..., None, :] * freqs[:, None]  # (..., FREQS, 3)
    return torch.cat([x, torch.sin(xf).flatten(-2), torch.cos(xf).flatten(-2)], -1)


class TinyNerf(torch.nn.Module):
    def __init__(self):
        super().__init__()
        dims = [3 + 6 * FREQS] + [WIDTH] * DEPTH + [4]
        self.layers = torch.nn.ModuleList(torch.nn.Linear(a, b) for a, b in zip(dims[:-1], dims[1:]))

    def forward(self, x):
        h = encode(x)
        for k, layer in enumerate(self.layers):
            h = layer(h)
            if k < len(self.layers) - 1:
                h = torch.relu(h)
        return torch.nn.functional.softplus(h[..., 0]), torch.sigmoid(h[..., 1:])


def render(model, o, d, t0, t1, stratified):
    n = len(o)
    u = torch.rand(n, SAMPLES) if stratified else torch.full((n, SAMPLES), 0.5)
    step = (t1 - t0) / SAMPLES
    ts = t0[:, None] + (torch.arange(SAMPLES)[None] + u) * step[:, None]
    delta = torch.cat([ts[:, 1:] - ts[:, :-1], t1[:, None] - ts[:, -1:]], -1)
    pts = o[:, None] + ts[..., None] * d[:, None]
    sigma, rgb = model(pts)
    alpha = 1 - torch.exp(-sigma * delta)
    trans = torch.cumprod(torch.cat([torch.ones(n, 1), 1 - alpha[:, :-1] + 1e-10], -1), -1)
    w = trans * alpha
    t_final = trans[:, -1] * (1 - alpha[:, -1])
    return (w[..., None] * rgb).sum(1) + t_final[:, None] * torch.tensor(BACKGROUND, dtype=torch.float32)


# --- float64 numpy reference from the exported weights (what the TS code must reproduce) -----------------------------
def np_field(layers, x):
    freqs = (2.0 ** np.arange(FREQS)) * math.pi
    xf = x[..., None, :] * freqs[:, None]
    h = np.concatenate([x, np.sin(xf).reshape(*x.shape[:-1], -1), np.cos(xf).reshape(*x.shape[:-1], -1)], -1)
    for k, (W, b) in enumerate(layers):
        h = h @ W.T + b
        if k < len(layers) - 1:
            h = np.maximum(h, 0)
    sigma = np.logaddexp(0, h[..., 0])
    rgb = 1 / (1 + np.exp(-h[..., 1:]))
    return sigma, rgb


def np_pixel(layers, o, d):
    t0, t1, ok = ray_box(o[None], d[None])
    if not ok[0]:
        return BACKGROUND.copy()
    t0, t1 = t0[0], t1[0]
    step = (t1 - t0) / SAMPLES
    ts = t0 + (np.arange(SAMPLES) + 0.5) * step
    delta = np.append(ts[1:] - ts[:-1], t1 - ts[-1])
    sigma, rgb = np_field(layers, o + ts[:, None] * d)
    T, c = 1.0, np.zeros(3)
    for i in range(SAMPLES):
        a = 1 - math.exp(-sigma[i] * delta[i])
        c += T * a * rgb[i]
        T *= 1 - a
    return c + T * BACKGROUND


def views(n, seed):
    r = np.random.default_rng(seed)
    golden = math.pi * (3 - math.sqrt(5))
    return [(k * golden + r.uniform(0, 0.3), math.radians(r.uniform(10, 60))) for k in range(n)]


def main():
    torch.manual_seed(0)
    start = time.time()
    train_views = views(VIEWS, 0)
    test_views = [(math.radians(a), math.radians(e)) for a, e in [(20, 25), (110, 45), (200, 15), (300, 35)]][:TEST_VIEWS]

    def dataset(vs):
        O, D, C = [], [], []
        for az, el in vs:
            o, d = camera_rays(az, el)
            O.append(o)
            D.append(d)
            C.append(shade(o, d))
        return np.concatenate(O), np.concatenate(D), np.concatenate(C)

    O, D, C = dataset(train_views)
    t0, t1, ok = ray_box(O, D)
    O, D, C, t0, t1 = (torch.tensor(a[ok], dtype=torch.float32) for a in (O, D, C, t0, t1))
    print(f"{VIEWS} views, {len(O)} rays that hit the box ({time.time() - start:.1f}s)")

    model = TinyNerf()
    params = sum(p.numel() for p in model.parameters())
    print(f"{params} parameters")
    opt = torch.optim.Adam(model.parameters(), lr=5e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, STEPS, eta_min=2e-4)
    for step in range(STEPS):
        idx = torch.randint(0, len(O), (BATCH,))
        pred = render(model, O[idx], D[idx], t0[idx], t1[idx], stratified=True)
        loss = ((pred - C[idx]) ** 2).mean()
        opt.zero_grad()
        loss.backward()
        opt.step()
        sched.step()
        if step % 1000 == 0 or step == STEPS - 1:
            print(f"step {step:5d}  loss {loss.item():.5f}  psnr {-10 * math.log10(loss.item()):.2f}  ({time.time() - start:.0f}s)")

    # export the weights rounded to 7 significant digits; the reference below uses the rounded values
    round7 = lambda a: [float(f"{x:.7g}") for x in a]
    layers = []
    np_layers = []
    for layer in model.layers:
        W = round7(layer.weight.detach().double().numpy().ravel())
        b = round7(layer.bias.detach().double().numpy())
        layers.append({"in": layer.in_features, "out": layer.out_features, "W": W, "b": b})
        np_layers.append((np.array(W).reshape(layer.out_features, layer.in_features), np.array(b)))

    # held-out views: PSNR of the exported network (midpoint samples, as the site renders)
    psnrs = []
    for az, el in test_views:
        o, d = camera_rays(az, el)
        gt = shade(o, d)
        pred = np.array([np_pixel(np_layers, o[k], d[k]) for k in range(len(o))])
        psnrs.append(-10 * math.log10(((pred - gt) ** 2).mean()))
    print("held-out PSNR", [round(p, 2) for p in psnrs])

    r = np.random.default_rng(1)
    points = r.uniform(-1, 1, (8, 3))
    points[0] = SPHERES[0][0]  # inside the red sphere
    points[1] = [0.0, -0.34, 0.0]  # on the floor
    sigma, rgb = np_field(np_layers, points)
    pixels = []
    for az, el, i, j in [(0.3, 0.5, 24, 24), (0.3, 0.5, 10, 30), (2.0, 0.3, 30, 20), (2.0, 0.3, 0, 0), (4.0, 0.8, 18, 33), (4.0, 0.8, 40, 12)]:
        o, d = camera_rays(az, el)
        k = j * SIZE + i
        pixels.append({"azimuth": az, "elevation": el, "i": i, "j": j, "rgb": np_pixel(np_layers, o[k], d[k]).tolist()})

    out = {
        "about": "Tiny NeRF of a procedural scene, trained by scripts/tiny_nerf.py (seed 0). Layers: W row-major [out][in].",
        "encoding": {"frequencies": FREQS, "includeInput": True},
        "activation": {"hidden": "relu", "sigma": "softplus", "rgb": "sigmoid"},
        "layers": layers,
        "render": {"size": SIZE, "fov": FOV, "radius": RADIUS, "box": BOX, "samples": SAMPLES, "background": BACKGROUND.tolist()},
        "training": {
            "views": VIEWS,
            "steps": STEPS,
            "batch": BATCH,
            "parameters": params,
            "seconds": round(time.time() - start),
            "heldOutPsnr": [round(p, 2) for p in psnrs],
            "trainViews": [[round(a, 4), round(e, 4)] for a, e in train_views],
        },
        "reference": {"points": points.tolist(), "sigma": sigma.tolist(), "rgb": rgb.tolist(), "pixels": pixels},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB) in {time.time() - start:.0f}s")


if __name__ == "__main__":
    main()
