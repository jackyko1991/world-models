"""Fit a 1-D signal with a small MLP, with and without Fourier features, and save training snapshots
(public/models/fourier-fit.json) for the spectral-bias demo on Concepts ▸ 3D scene models ▸ NeRF.

The signal mixes three frequencies (1, 4 and 12 cycles on [0, 1]). Both networks are the same ReLU MLP (3 hidden
layers of 64) trained with Adam on 128 evenly spaced points; one sees x itself, the other NeRF's positional encoding
γ(x) = (x, sin(2^k π x), cos(2^k π x)), k < 6. Snapshots of both predictions on a 256-point grid are saved at
log-spaced steps. Fixed seed; well under a minute on a CPU.

    pixi run -e train python scripts/fourier_fit.py
"""

import json
import math
import time
from pathlib import Path

import numpy as np
import torch

OUT = Path(__file__).resolve().parent.parent / "public" / "models" / "fourier-fit.json"

COMPONENTS = [(1, 1.0, 0.0), (4, 0.5, 1.0), (12, 0.35, 2.0)]  # (cycles, amplitude, phase)
TRAIN = 128
GRID = 256
FREQS = 6
WIDTH = 64
DEPTH = 3
STEPS = 3000
LR = 1e-3


def signal(x):
    return sum(a * np.sin(2 * math.pi * k * x + p) for k, a, p in COMPONENTS)


def encode(x, freqs):
    if freqs == 0:
        return x
    f = (2.0 ** torch.arange(freqs, dtype=x.dtype)) * math.pi
    xf = x * f
    return torch.cat([x, torch.sin(xf), torch.cos(xf)], -1)


def mlp(inputs):
    dims = [inputs] + [WIDTH] * DEPTH + [1]
    layers = []
    for k, (a, b) in enumerate(zip(dims[:-1], dims[1:])):
        layers.append(torch.nn.Linear(a, b))
        if k < len(dims) - 2:
            layers.append(torch.nn.ReLU())
    return torch.nn.Sequential(*layers)


def snapshot_steps():
    s = sorted({0, *np.unique(np.round(np.logspace(0, math.log10(STEPS), 40)).astype(int)).tolist()})
    return [x for x in s if x <= STEPS]


def main():
    start = time.time()
    x_train = torch.tensor(np.arange(TRAIN) / TRAIN, dtype=torch.float32)[:, None]
    y_train = torch.tensor(signal(x_train.numpy()), dtype=torch.float32)
    x_grid = torch.tensor(np.arange(GRID) / GRID, dtype=torch.float32)[:, None]
    keep = snapshot_steps()
    runs = {}
    for name, freqs in [("plain", 0), ("fourier", FREQS)]:
        torch.manual_seed(0)
        net = mlp(1 if freqs == 0 else 1 + 2 * freqs)
        opt = torch.optim.Adam(net.parameters(), lr=LR)
        snaps, losses = [], []
        for step in range(STEPS + 1):
            if step in keep:
                with torch.no_grad():
                    snaps.append([round(v, 4) for v in net(encode(x_grid, freqs)).squeeze(-1).tolist()])
                    losses.append(float(((net(encode(x_train, freqs)) - y_train) ** 2).mean()))
            if step == STEPS:
                break
            loss = ((net(encode(x_train, freqs)) - y_train) ** 2).mean()
            opt.zero_grad()
            loss.backward()
            opt.step()
        runs[name] = {"frequencies": freqs, "predictions": snaps, "trainLoss": [float(f"{l:.5g}") for l in losses]}
        print(f"{name}: final train MSE {losses[-1]:.2e}")

    # the encoding at a few points, so the TS positional encoding can be checked against this one
    probe = torch.tensor([[0.0], [0.13], [0.5], [0.871]])
    out = {
        "about": "Spectral-bias demo: an MLP fitted to a 1-D signal with and without Fourier features (scripts/fourier_fit.py, seed 0).",
        "components": [{"cycles": k, "amplitude": a, "phase": p} for k, a, p in COMPONENTS],
        "train": {"n": TRAIN, "steps": STEPS, "lr": LR, "width": WIDTH, "depth": DEPTH, "seconds": 0},
        "grid": GRID,
        "steps": keep,
        "target": [round(v, 4) for v in signal(x_grid.numpy()).squeeze(-1).tolist()],
        "runs": runs,
        "encodingProbe": {"x": probe.squeeze(-1).tolist(), "frequencies": FREQS, "gamma": encode(probe.double(), FREQS).tolist()},
    }
    out["train"]["seconds"] = round(time.time() - start, 1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB) in {time.time() - start:.1f}s")


if __name__ == "__main__":
    main()
