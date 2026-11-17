"""2-D Gaussian splatting fitting a small procedural image, for Concepts > 3D scene models > Gaussian splatting.

Draws a 64x64 target picture (sky, sun, two hills, a lake) itself, so the licence is clean. Fits a few hundred
anisotropic 2-D Gaussians to it with Adam, front-to-back alpha compositing in list order (the first Gaussian is in
front), and adaptive density control in the manner of 3D Gaussian splatting (Kerbl et al. 2023, arXiv 2308.04079):
every DENSIFY_EVERY steps, Gaussians whose mean receives a large average gradient are cloned (if small) or split in two
(if large), and nearly transparent ones are pruned. Snapshots of every Gaussian along the way go to
public/models/splat2d.json, with reference pixels of the last snapshot computed by the exact renderer below, which
mirrors src/models/splat.ts (tests/splat.test.ts checks the TypeScript renderer against them).

Run: pixi run -e train python scripts/splat2d.py   (about a minute on a laptop CPU)
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path

import numpy as np
import torch

SEED = 7
W = H = 64
N0 = 16
STEPS = 2000
DENSIFY_EVERY = 100
DENSIFY_UNTIL = 1500
GRAD_THRESHOLD = 1.2e-5  # average |dL/dmean| (pixels) above which a Gaussian is densified
SPLIT_SCALE = 3.0  # pixels: a Gaussian larger than this is split, a smaller one cloned
PRUNE_OPACITY = 0.03
OPACITY_RESET = 800  # as in 3DGS: pull every opacity down once, so Gaussians that are not needed fade and get pruned
RESET_TO = 0.2
MAX_GAUSSIANS = 420
SNAPSHOT_STEPS = [0, 20, 50, 100, 101, 200, 201, 300, 301, 400, 401, 500, 600, 799, 800, 900, 1000, 1001, 1200, 1500, 2000]
ALPHA_MIN, ALPHA_MAX, T_MIN = 1 / 255, 0.99, 1e-4
OUT = Path(__file__).resolve().parent.parent / "public" / "models" / "splat2d.json"


def target_image() -> np.ndarray:
    """The picture to fit, (H, W, 3) in [0, 1], antialiased by 4x4 supersampling."""
    s = 4
    ys, xs = np.mgrid[0:H * s, 0:W * s]
    x = (xs + 0.5) / s
    y = (ys + 0.5) / s
    img = np.zeros((H * s, W * s, 3))
    t = y / H
    k = np.clip(t / 0.75, 0, 1)  # blue overhead, warm at the horizon
    img[:] = np.stack([0.45 + 0.53 * k, 0.65 + 0.15 * k, 0.95 - 0.40 * k], -1)
    sun = (x - 44) ** 2 + (y - 18) ** 2 < 8.5**2
    img[sun] = [1.0, 0.85, 0.25]
    hill1 = y > 40 - 10 * np.exp(-(((x - 18) / 13) ** 2))
    img[hill1] = [0.30, 0.55, 0.30]
    hill2 = y > 44 - 7 * np.exp(-(((x - 50) / 10) ** 2))
    img[hill2 & ~hill1] = [0.20, 0.42, 0.28]
    img[hill1 & hill2 & (x > 38)] = [0.20, 0.42, 0.28]
    lake = y > 50
    img[lake] = [0.15, 0.35, 0.65]
    stripe = lake & (np.abs(y - 55 - 0.15 * np.sin(x / 3)) < 0.8) & (np.abs(x - 44) < 10)
    img[stripe] = [0.95, 0.80, 0.35]
    return img.reshape(H, s, W, s, 3).mean(axis=(1, 3))


def params_to_values(p: dict[str, torch.Tensor]):
    xy = p["xy"]
    s = torch.exp(p["log_s"]).clamp(min=0.25)  # no thinner than a quarter pixel
    theta = p["theta"]
    rgb = torch.sigmoid(p["rgb_logit"])
    op = torch.sigmoid(p["op_logit"])
    return xy, s, theta, rgb, op


def render(p: dict[str, torch.Tensor], pix: torch.Tensor) -> torch.Tensor:
    """Differentiable front-to-back compositing at pixel centres `pix` (P, 2); white background."""
    xy, s, theta, rgb, op = params_to_values(p)
    c, sn = torch.cos(theta), torch.sin(theta)
    a = c * c * s[:, 0] ** 2 + sn * sn * s[:, 1] ** 2
    b = c * sn * (s[:, 0] ** 2 - s[:, 1] ** 2)
    d = sn * sn * s[:, 0] ** 2 + c * c * s[:, 1] ** 2
    det = a * d - b * b
    ia, ib, id_ = d / det, -b / det, a / det
    dx = pix[None, :, 0] - xy[:, None, 0]
    dy = pix[None, :, 1] - xy[:, None, 1]
    power = -0.5 * (ia[:, None] * dx * dx + 2 * ib[:, None] * dx * dy + id_[:, None] * dy * dy)
    alpha = torch.clamp(op[:, None] * torch.exp(power), max=ALPHA_MAX)  # (N, P)
    T = torch.cumprod(torch.cat([torch.ones_like(alpha[:1]), 1 - alpha[:-1]], 0), 0)
    w = alpha * T
    col = (w[:, :, None] * rgb[:, None, :]).sum(0)
    T_end = T[-1] * (1 - alpha[-1])
    return col + T_end[:, None]


def exact_pixel(g: np.ndarray, i: int, j: int) -> list[float]:
    """The renderer of src/models/splat.ts (thresholds and early stop included), float64, one pixel."""
    px, py = i + 0.5, j + 0.5
    C = np.zeros(3)
    T = 1.0
    for x, y, sx, sy, th, r, gg, bb, op in g:
        c, s = math.cos(th), math.sin(th)
        a = c * c * sx * sx + s * s * sy * sy
        b = c * s * (sx * sx - sy * sy)
        d = s * s * sx * sx + c * c * sy * sy
        det = a * d - b * b
        ia, ib, id_ = d / det, -b / det, a / det
        dx, dy = px - x, py - y
        power = -0.5 * (ia * dx * dx + 2 * ib * dx * dy + id_ * dy * dy)
        if power > 0:
            continue
        al = min(ALPHA_MAX, op * math.exp(power))
        if al < ALPHA_MIN:
            continue
        nxt = T * (1 - al)
        if nxt < T_MIN:
            break
        C += np.array([r, gg, bb]) * al * T
        T = nxt
    return (C + T).tolist()


def main() -> None:
    t0 = time.time()
    torch.manual_seed(SEED)
    rs = np.random.default_rng(SEED)
    target = target_image()
    tgt = torch.tensor(target.reshape(-1, 3), dtype=torch.float32)
    jj, ii = np.mgrid[0:H, 0:W]
    pix = torch.tensor(np.stack([ii.ravel() + 0.5, jj.ravel() + 0.5], -1), dtype=torch.float32)

    p = {
        "xy": torch.tensor(rs.uniform(4, W - 4, (N0, 2)), dtype=torch.float32),
        "log_s": torch.full((N0, 2), math.log(5.0)) + 0.2 * torch.randn(N0, 2),
        "theta": torch.tensor(rs.uniform(0, math.pi, N0), dtype=torch.float32),
        "rgb_logit": 0.3 * torch.randn(N0, 3),
        "op_logit": torch.full((N0,), 0.0),
    }
    lrs = {"xy": 0.25, "log_s": 0.02, "theta": 0.02, "rgb_logit": 0.05, "op_logit": 0.05}

    def make_opt():
        for v in p.values():
            v.requires_grad_(True)
        return torch.optim.Adam([{"params": [p[k]], "lr": lrs[k]} for k in p])

    opt = make_opt()
    grad_acc = torch.zeros(N0)
    grad_n = 0
    events = {"cloned": 0, "split": 0, "pruned": 0, "reset": 0}
    snapshots = []

    def snap(step: int, loss: float) -> None:
        with torch.no_grad():
            xy, s, theta, rgb, op = params_to_values(p)
            g = torch.cat([xy, s, theta[:, None], rgb, op[:, None]], 1).numpy()
        mse = loss
        snapshots.append(
            {
                "step": step,
                "count": int(g.shape[0]),
                "loss": round(mse, 6),
                "psnr": round(-10 * math.log10(max(mse, 1e-12)), 2),
                **{k: v for k, v in events.items()},
                "g": [[round(float(v), 3) for v in row] for row in g],
            }
        )
        for k in events:
            events[k] = 0

    for step in range(STEPS + 1):
        out = render(p, pix)
        loss = ((out - tgt) ** 2).mean()
        if step in SNAPSHOT_STEPS:
            snap(step, float(loss.detach()))
        if step == STEPS:
            break
        opt.zero_grad()
        loss.backward()
        grad_acc += p["xy"].grad.detach().norm(dim=1)
        grad_n += 1
        opt.step()
        with torch.no_grad():
            p["theta"].remainder_(math.pi)
            if step + 1 == OPACITY_RESET:
                p["op_logit"].clamp_(max=math.log(RESET_TO / (1 - RESET_TO)))
                events["reset"] = 1

        if step > 0 and step % DENSIFY_EVERY == 0 and step <= DENSIFY_UNTIL:
            with torch.no_grad():
                avg = grad_acc / grad_n
                xy, s, theta, rgb, op = params_to_values(p)
                n = xy.shape[0]
                room = MAX_GAUSSIANS - n
                hot = (avg > GRAD_THRESHOLD).nonzero().flatten()
                hot = hot[torch.argsort(avg[hot], descending=True)][: max(room, 0)]
                big = s.max(1).values[hot] > SPLIT_SCALE
                split_set, clone_set = set(hot[big].tolist()), set(hot[~big].tolist())
                # rebuild the list in order, so a Gaussian's children sit where it was (list order = depth order)
                rows: dict[str, list[torch.Tensor]] = {k: [] for k in p}
                alive_op = torch.sigmoid(p["op_logit"])
                pruned = 0
                for i in range(n):
                    if i not in split_set and alive_op[i] < PRUNE_OPACITY:
                        pruned += 1  # prune: a nearly transparent Gaussian does nothing but cost time
                        continue
                    if i in split_set:
                        # split: two children drawn from the parent's own distribution, each 1.6x smaller
                        for _ in range(2):
                            c, sn = math.cos(float(theta[i])), math.sin(float(theta[i]))
                            z = torch.randn(2) * s[i]
                            rows["xy"].append(xy[i] + torch.stack([c * z[0] - sn * z[1], sn * z[0] + c * z[1]]))
                            rows["log_s"].append(p["log_s"][i] - math.log(1.6))
                            for k in ("theta", "rgb_logit", "op_logit"):
                                rows[k].append(p[k][i])
                        continue
                    copies = 2 if i in clone_set else 1  # clone: an identical copy the gradient then pulls apart
                    for _ in range(copies):
                        for k in p:
                            rows[k].append(p[k][i])
                for k in p:
                    p[k] = torch.stack(rows[k]).detach().clone()
                events["cloned"] += len(clone_set)
                events["split"] += len(split_set)
                events["pruned"] += pruned
                opt = make_opt()
                grad_acc = torch.zeros(p["xy"].shape[0])
                grad_n = 0

    final = np.array(snapshots[-1]["g"], dtype=np.float64)
    ref_px = [(8, 8), (44, 18), (18, 34), (50, 42), (30, 56), (44, 55), (5, 60), (60, 3)]
    reference = [{"i": i, "j": j, "rgb": [round(v, 9) for v in exact_pixel(final, i, j)]} for i, j in ref_px]

    out = {
        "about": "2-D Gaussian splatting fitting a procedural 64x64 image (scripts/splat2d.py, seed 7). "
        "g rows: [x, y, sx, sy, theta, r, g, b, opacity], pixel units; list order is compositing order (first in front).",
        "width": W,
        "height": H,
        "background": [1, 1, 1],
        "target": [int(round(v * 255)) for v in target.reshape(-1)],
        "settings": {
            "seed": SEED,
            "steps": STEPS,
            "initial": N0,
            "densifyEvery": DENSIFY_EVERY,
            "densifyUntil": DENSIFY_UNTIL,
            "gradThreshold": GRAD_THRESHOLD,
            "splitScale": SPLIT_SCALE,
            "pruneOpacity": PRUNE_OPACITY,
            "opacityReset": OPACITY_RESET,
            "maxGaussians": MAX_GAUSSIANS,
        },
        "snapshots": snapshots,
        "reference": {"snapshot": len(snapshots) - 1, "pixels": reference},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB) in {time.time() - t0:.0f} s")
    for sn in snapshots:
        print(sn["step"], sn["count"], sn["psnr"], sn["cloned"], sn["split"], sn["pruned"], sn["reset"])


if __name__ == "__main__":
    main()
