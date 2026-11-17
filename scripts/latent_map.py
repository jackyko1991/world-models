"""
Train a tiny variational autoencoder with a 2-D latent on the frames of a toy game (a ball in a 16x16 box), and
export what the browser needs to draw the latent map: the decoder's weights, the encoded means of a sample of
frames with the factors that generated them, and reference decodes for the TS test.

    pixi run -e train python scripts/latent_map.py

Writes public/models/latent-map.json. Fixed seed, CPU, about a minute. The frames are procedural (drawn here, and by
`renderFrame` in src/models/latentMap.ts with the same formula), so the data is the project's own.
"""

import json
import math
from pathlib import Path

import numpy as np
import torch
from torch import nn

SEED = 7
SIZE = 16  # frame is SIZE x SIZE, grayscale in [0, 1]
RADIUS = 2.5  # ball radius in pixels
LO, HI = 3.0, 13.0  # range of the ball's centre (pixels), both axes
LATENT = 2
HIDDEN = (64, 128)  # decoder: 2 -> 64 -> 128 -> 256
N_TRAIN = 6000
STEPS = 6000
BATCH = 128
N_POINTS = 400  # encoded frames exported for the scatter
OUT = Path(__file__).resolve().parent.parent / "public" / "models" / "latent-map.json"


def render(x: float, y: float) -> np.ndarray:
    """A ball centred at (x, y) in pixel units, anti-aliased by one pixel: intensity = clip(R + 1/2 - distance, 0, 1)."""
    c = np.arange(SIZE) + 0.5
    dx = c[None, :] - x
    dy = c[:, None] - y
    d = np.sqrt(dx * dx + dy * dy)
    return np.clip(RADIUS + 0.5 - d, 0.0, 1.0)  # row-major: [row = y][col = x]


def factors(rng: np.random.Generator, n: int) -> np.ndarray:
    return rng.uniform(LO, HI, size=(n, 2))


class VAE(nn.Module):
    def __init__(self):
        super().__init__()
        p = SIZE * SIZE
        self.enc = nn.Sequential(nn.Linear(p, 128), nn.ReLU(), nn.Linear(128, 64), nn.ReLU(), nn.Linear(64, 2 * LATENT))
        self.dec = nn.Sequential(
            nn.Linear(LATENT, HIDDEN[0]), nn.ReLU(), nn.Linear(HIDDEN[0], HIDDEN[1]), nn.ReLU(), nn.Linear(HIDDEN[1], p)
        )

    def encode(self, x):
        h = self.enc(x)
        return h[:, :LATENT], h[:, LATENT:]

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = mu + torch.exp(0.5 * logvar) * torch.randn_like(mu)  # the reparameterisation trick
        return self.dec(z), mu, logvar


def main():
    torch.manual_seed(SEED)
    rng = np.random.default_rng(SEED)
    f_train = factors(rng, N_TRAIN)
    x_train = torch.tensor(np.stack([render(*f).ravel() for f in f_train]), dtype=torch.float32)

    model = VAE()
    opt = torch.optim.Adam(model.parameters(), lr=2e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, STEPS)
    for step in range(STEPS):
        idx = torch.randint(0, N_TRAIN, (BATCH,))
        x = x_train[idx]
        logits, mu, logvar = model(x)
        rec = nn.functional.binary_cross_entropy_with_logits(logits, x, reduction="sum") / BATCH
        kl = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp()) / BATCH
        loss = rec + kl
        opt.zero_grad()
        loss.backward()
        opt.step()
        sched.step()
        if step % 1000 == 0 or step == STEPS - 1:
            print(f"step {step:5d}  reconstruction {rec.item():8.2f}  KL {kl.item():6.2f}")

    # Round the decoder's weights for the JSON, put the rounded values back, and compute every exported number from them.
    def r(a: np.ndarray) -> list:
        return np.round(a.astype(np.float64), 6).tolist()

    layers = [m for m in model.dec if isinstance(m, nn.Linear)]
    weights = [{"W": r(m.weight.detach().numpy()), "b": r(m.bias.detach().numpy())} for m in layers]
    Ws = [(np.array(l["W"]), np.array(l["b"])) for l in weights]

    def decode(z: np.ndarray) -> np.ndarray:
        h = z
        for i, (W, b) in enumerate(Ws):
            h = W @ h + b
            h = np.maximum(h, 0.0) if i < len(Ws) - 1 else 1.0 / (1.0 + np.exp(-h))
        return h

    f_pts = factors(np.random.default_rng(SEED + 1), N_POINTS)
    x_pts = torch.tensor(np.stack([render(*f).ravel() for f in f_pts]), dtype=torch.float32)
    with torch.no_grad():
        mu, _ = model.encode(x_pts)
        mu_all, _ = model.encode(x_train)
    mu = mu.numpy().astype(np.float64)
    pts = [{"z": r(m), "x": round(float(f[0]), 4), "y": round(float(f[1]), 4)} for m, f in zip(mu, f_pts)]

    # mean pixel error of reconstructions through the latent mean, on the exported sample
    rec_err = float(np.mean([np.abs(decode(np.array(p["z"])) - x.numpy().astype(np.float64)).mean() for p, x in zip(pts, x_pts)]))
    print(f"mean |pixel error| of decode(mu) on {N_POINTS} frames: {rec_err:.4f}")

    ref_z = [[0.0, 0.0], [1.0, -0.5], [-1.5, 0.8], [0.3, 2.0], [-2.5, -2.5]]
    references = [{"z": z, "out": np.round(decode(np.array(z)), 8).tolist()} for z in ref_z]

    data = {
        "about": "Decoder of a 2-D-latent VAE trained on 16x16 frames of a ball in a box (scripts/latent_map.py). "
        "Layers: h = W h + b; ReLU between layers; sigmoid at the end. W is [out][in]. Pixels are row-major.",
        "size": SIZE,
        "radius": RADIUS,
        "range": [LO, HI],
        "seed": SEED,
        "steps": STEPS,
        "latentExtent": r(np.abs(mu_all.numpy()).max(axis=0)),
        "reconstructionError": round(rec_err, 5),
        "layers": weights,
        "points": pts,
        "references": references,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    torch.set_num_threads(4)
    main()
