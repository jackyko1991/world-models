"""A small 3D Gaussian splatting scene, fitted on the CPU, for Concepts > 3D scene models > Gaussian splatting.

1. The scene is procedural: a chequered floor disc, a red sphere, a blue box and a yellow cylinder, ray-traced here in
   numpy (Lambert shading plus a specular highlight, so colour depends on the view) from 40 cameras on a sphere at
   96x96 pixels. That is the "photo" set; the licence is clean.
2. Gaussians are initialised on the surfaces (as 3DGS initialises from structure-from-motion points), flat along each
   surface, coloured by the albedo.
3. They are fitted to the 40 views with Adam: means, rotations, scales, opacities and degree-1 spherical-harmonic
   colours, through a differentiable copy of the renderer in src/models/splat.ts (EWA projection, depth sort,
   front-to-back alpha compositing). Each step uses one view and a random batch of its pixels. Densification is left out
   to keep the run to a few minutes; Gaussians that end nearly transparent are pruned.
4. The result goes to public/models/splat3d.bin (float32, 23 numbers per Gaussian: mean 3, quaternion wxyz 4, scale 3,
   opacity 1, SH 12 as sh[3k + channel]) and splat3d.json (metadata, a held-out view's PSNR, and reference pixels from
   the exact float64 renderer below, which tests/splat.test.ts checks the TypeScript renderer against).

Run: pixi run -e train python scripts/splat3d.py   (a few minutes on a laptop CPU)
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path

import numpy as np
import torch

SEED = 11
RES = 96
VIEWS = 40
FOVY = math.radians(45)
RADIUS = 3.2
TARGET = np.array([0.0, 0.3, 0.0])
BG = np.array([0.95, 0.96, 0.98])
ITERS = int(__import__("os").environ.get("SPLAT3D_ITERS", 1800))
BATCH = 2048
BLUR = 0.3
ALPHA_MIN, ALPHA_MAX, T_MIN = 1 / 255, 0.99, 1e-4
SH_C0, SH_C1 = 0.28209479177387814, 0.4886025119029199
OUT = Path(__file__).resolve().parent.parent / "public" / "models"

LIGHT = np.array([0.4, 0.8, 0.45]) / np.linalg.norm([0.4, 0.8, 0.45])
SPHERE = dict(c=np.array([-0.5, 0.4, 0.15]), r=0.4, albedo=np.array([0.85, 0.2, 0.18]))
BOX = dict(c=np.array([0.5, 0.3, -0.3]), h=np.array([0.3, 0.3, 0.3]), yaw=math.radians(30), albedo=np.array([0.2, 0.4, 0.85]))
CYL = dict(c=np.array([0.35, 0.0, 0.65]), r=0.18, height=0.6, albedo=np.array([0.95, 0.75, 0.15]))
FLOOR_R = 1.6


# ── cameras (the same as orbitCamera in src/models/splat.ts) ──────────────────────────────────────────────────────────


def orbit_camera(az: float, el: float, radius: float = RADIUS, width: int = RES, height: int = RES):
    pos = TARGET + radius * np.array([math.cos(el) * math.sin(az), math.sin(el), math.cos(el) * math.cos(az)])
    f = TARGET - pos
    f /= np.linalg.norm(f)
    right = np.cross(f, [0, 1, 0])
    right /= np.linalg.norm(right)
    down = np.cross(f, right)
    fy = height / 2 / math.tan(FOVY / 2)
    return dict(pos=pos, W=np.stack([right, down, f]), fx=fy, fy=fy, cx=width / 2, cy=height / 2, width=width, height=height, near=0.2)


# ── the ground truth: ray tracing the procedural scene ────────────────────────────────────────────────────────────────


def box_frame():
    c, s = math.cos(BOX["yaw"]), math.sin(BOX["yaw"])
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])  # columns: the box's axes in the world


def trace(o: np.ndarray, d: np.ndarray) -> np.ndarray:
    """Colour of rays o + t d (n, 3)."""
    n = len(d)
    best = np.full(n, np.inf)
    normal = np.zeros((n, 3))
    albedo = np.tile(BG, (n, 1))
    spec = np.zeros(n)
    hitp = np.zeros((n, 3))

    def take(t, nrm, alb, sp):
        better = (t > 1e-4) & (t < best)
        best[better] = t[better]
        normal[better] = nrm[better]
        albedo[better] = alb[better] if alb.ndim == 2 else alb
        spec[better] = sp

    # floor disc y = 0, chequered
    with np.errstate(divide="ignore", invalid="ignore"):
        t = -o[:, 1] / d[:, 1]
    p = o + t[:, None] * d
    ok = (np.hypot(p[:, 0], p[:, 2]) < FLOOR_R) & (d[:, 1] < 0)
    t = np.where(ok, t, np.inf)
    chk = (np.floor(p[:, 0] / 0.4) + np.floor(p[:, 2] / 0.4)) % 2
    alb = np.where(chk[:, None] > 0, [0.82, 0.78, 0.70], [0.55, 0.52, 0.48])
    take(t, np.tile([0, 1.0, 0], (n, 1)), alb, 0.0)

    # sphere
    oc = o - SPHERE["c"]
    b = (oc * d).sum(1)
    cc = (oc * oc).sum(1) - SPHERE["r"] ** 2
    disc = b * b - cc
    t = np.where(disc > 0, -b - np.sqrt(np.maximum(disc, 0)), np.inf)
    p = o + t[:, None] * d
    take(t, (p - SPHERE["c"]) / SPHERE["r"], SPHERE["albedo"], 0.6)

    # box (slabs in its own frame)
    R = box_frame()
    ol = (o - BOX["c"]) @ R
    dl = d @ R
    with np.errstate(divide="ignore", invalid="ignore"):
        t1 = (-BOX["h"] - ol) / dl
        t2 = (BOX["h"] - ol) / dl
    tmin = np.minimum(t1, t2).max(1)
    tmax = np.maximum(t1, t2).min(1)
    hit = (tmax > tmin) & (tmax > 0)
    t = np.where(hit, tmin, np.inf)
    axis = np.minimum(t1, t2).argmax(1)
    nl = np.zeros((n, 3))
    nl[np.arange(n), axis] = -np.sign(dl[np.arange(n), axis])
    take(t, nl @ R.T, BOX["albedo"], 0.15)

    # cylinder (side, and its top cap)
    ox, oz = o[:, 0] - CYL["c"][0], o[:, 2] - CYL["c"][2]
    a = d[:, 0] ** 2 + d[:, 2] ** 2
    bq = 2 * (ox * d[:, 0] + oz * d[:, 2])
    cq = ox**2 + oz**2 - CYL["r"] ** 2
    disc = bq * bq - 4 * a * cq
    with np.errstate(divide="ignore", invalid="ignore"):
        t = np.where(disc > 0, (-bq - np.sqrt(np.maximum(disc, 0))) / (2 * a), np.inf)
    y = o[:, 1] + t * d[:, 1]
    t = np.where((y > 0) & (y < CYL["height"]), t, np.inf)
    p = o + t[:, None] * d
    nrm = np.stack([p[:, 0] - CYL["c"][0], np.zeros(n), p[:, 2] - CYL["c"][2]], 1) / CYL["r"]
    take(t, nrm, CYL["albedo"], 0.3)
    with np.errstate(divide="ignore", invalid="ignore"):
        t = (CYL["height"] - o[:, 1]) / d[:, 1]
    p = o + t[:, None] * d
    t = np.where(np.hypot(p[:, 0] - CYL["c"][0], p[:, 2] - CYL["c"][2]) < CYL["r"], t, np.inf)
    take(t, np.tile([0, 1.0, 0], (n, 1)), CYL["albedo"], 0.3)

    hitp = o + np.where(np.isfinite(best), best, 0)[:, None] * d
    lam = np.clip((normal * LIGHT).sum(1), 0, None)
    h = LIGHT - d
    h /= np.linalg.norm(h, axis=1, keepdims=True)
    sp = spec * np.clip((normal * h).sum(1), 0, None) ** 30
    col = albedo * (0.35 + 0.65 * lam[:, None]) + sp[:, None]
    del hitp
    return np.where(np.isfinite(best)[:, None], np.clip(col, 0, 1), BG)


def render_truth(cam, ss: int = 2) -> np.ndarray:
    """Ray-trace a view (2x2 supersampled), (H, W, 3)."""
    w, h = cam["width"], cam["height"]
    jj, ii = np.mgrid[0 : h * ss, 0 : w * ss]
    u = (ii + 0.5) / ss
    v = (jj + 0.5) / ss
    dc = np.stack([(u - cam["cx"]) / cam["fx"], (v - cam["cy"]) / cam["fy"], np.ones_like(u)], -1).reshape(-1, 3)
    d = dc @ cam["W"]  # camera → world (W is orthonormal)
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    col = trace(np.tile(cam["pos"], (len(d), 1)), d)
    return col.reshape(h, ss, w, ss, 3).mean(axis=(1, 3))


# ── initial Gaussians on the surfaces ─────────────────────────────────────────────────────────────────────────────────


def quat_from_z(nrm: np.ndarray) -> np.ndarray:
    """Quaternions (w, x, y, z) rotating the z axis onto each normal."""
    z = np.array([0, 0, 1.0])
    axis = np.cross(z, nrm)
    s = np.linalg.norm(axis, axis=1)
    c = nrm @ z
    ang = np.arctan2(s, c)
    axis = np.where(s[:, None] > 1e-8, axis / np.maximum(s, 1e-12)[:, None], [1.0, 0, 0])
    return np.concatenate([np.cos(ang / 2)[:, None], axis * np.sin(ang / 2)[:, None]], 1)


def init_gaussians(rs: np.random.Generator):
    pts, nrm, alb, spacing = [], [], [], []

    def add(p, n_, a, sp):
        pts.append(p)
        nrm.append(n_)
        alb.append(np.broadcast_to(a, p.shape).copy())
        spacing.append(np.full(len(p), sp))

    # floor disc
    k = 1700
    r = FLOOR_R * np.sqrt(rs.random(k))
    th = 2 * np.pi * rs.random(k)
    p = np.stack([r * np.cos(th), np.zeros(k), r * np.sin(th)], 1)
    chk = (np.floor(p[:, 0] / 0.4) + np.floor(p[:, 2] / 0.4)) % 2
    add(p, np.tile([0, 1.0, 0], (k, 1)), np.where(chk[:, None] > 0, [0.82, 0.78, 0.70], [0.55, 0.52, 0.48]), math.sqrt(math.pi * FLOOR_R**2 / k))
    # sphere
    k = 1300
    v = rs.normal(size=(k, 3))
    v /= np.linalg.norm(v, axis=1, keepdims=True)
    v = v[(SPHERE["c"][1] + SPHERE["r"] * v[:, 1]) > 0.01]
    add(SPHERE["c"] + SPHERE["r"] * v, v, SPHERE["albedo"], math.sqrt(4 * math.pi * SPHERE["r"] ** 2 / k))
    # box: five faces (not the bottom)
    R = box_frame()
    k = 220
    for ax in range(3):
        for sgn in (-1, 1):
            if ax == 1 and sgn == -1:
                continue
            q = rs.uniform(-1, 1, (k, 3)) * BOX["h"]
            q[:, ax] = sgn * BOX["h"][ax]
            nl = np.zeros((k, 3))
            nl[:, ax] = sgn
            add(BOX["c"] + q @ R.T, nl @ R.T, BOX["albedo"], 2 * BOX["h"][0] / math.sqrt(k))
    # cylinder side and top
    k = 520
    th = 2 * np.pi * rs.random(k)
    y = CYL["height"] * rs.random(k)
    n_ = np.stack([np.cos(th), np.zeros(k), np.sin(th)], 1)
    add(CYL["c"] + np.stack([CYL["r"] * np.cos(th), y, CYL["r"] * np.sin(th)], 1), n_, CYL["albedo"], math.sqrt(2 * math.pi * CYL["r"] * CYL["height"] / k))
    k = 80
    r = CYL["r"] * np.sqrt(rs.random(k))
    th = 2 * np.pi * rs.random(k)
    add(CYL["c"] + np.stack([r * np.cos(th), np.full(k, CYL["height"]), r * np.sin(th)], 1), np.tile([0, 1.0, 0], (k, 1)), CYL["albedo"], CYL["r"] * math.sqrt(math.pi / k))

    pts, nrm, alb, spacing = map(np.concatenate, (pts, nrm, alb, spacing))
    col = alb * (0.35 + 0.65 * np.clip(nrm @ LIGHT, 0, None))[:, None]
    n = len(pts)
    scale = np.stack([0.75 * spacing, 0.75 * spacing, np.full(n, 0.004)], 1)
    sh = np.zeros((n, 4, 3))
    sh[:, 0] = (col - 0.5) / SH_C0
    return pts, quat_from_z(nrm), scale, np.full(n, 0.9), sh


# ── differentiable renderer (torch, float32), the same maths as src/models/splat.ts ──────────────────────────────────


def quat_to_rot_t(q: torch.Tensor) -> torch.Tensor:
    q = q / q.norm(dim=1, keepdim=True)
    w, x, y, z = q.unbind(1)
    return torch.stack(
        [
            1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
            2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
            2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
        ],
        1,
    ).reshape(-1, 3, 3)


def render_t(g: dict[str, torch.Tensor], cam, pix: torch.Tensor) -> torch.Tensor:
    """Colours at pixel centres pix (P, 2) for one camera."""
    Wm = torch.tensor(cam["W"], dtype=torch.float32)
    pos = torch.tensor(cam["pos"], dtype=torch.float32)
    mean = g["mean"]
    t = (mean - pos) @ Wm.T
    z = t[:, 2]
    zc = z.clamp(min=cam["near"])
    fx, fy = cam["fx"], cam["fy"]
    u = fx * t[:, 0] / zc + cam["cx"]
    v = fy * t[:, 1] / zc + cam["cy"]
    J = torch.zeros(len(mean), 2, 3)
    J[:, 0, 0] = fx / zc
    J[:, 0, 2] = -fx * t[:, 0] / zc**2
    J[:, 1, 1] = fy / zc
    J[:, 1, 2] = -fy * t[:, 1] / zc**2
    M = quat_to_rot_t(g["quat"]) * torch.exp(g["log_scale"])[:, None, :]
    sigma = M @ M.transpose(1, 2)
    T = J @ Wm
    cov = T @ sigma @ T.transpose(1, 2)
    a = cov[:, 0, 0] + BLUR
    b = cov[:, 0, 1]
    c = cov[:, 1, 1] + BLUR
    det = a * c - b * b
    ia, ib, ic = c / det, -b / det, a / det
    d = mean - pos
    d = d / d.norm(dim=1, keepdim=True)
    sh = g["sh"]
    col = 0.5 + SH_C0 * sh[:, 0] + SH_C1 * (-d[:, 1:2] * sh[:, 1] + d[:, 2:3] * sh[:, 2] - d[:, 0:1] * sh[:, 3])
    col = col.clamp(0, 1)
    op = torch.sigmoid(g["op_logit"])
    order = torch.argsort(z.detach())
    dx = pix[None, :, 0] - u[order, None]
    dy = pix[None, :, 1] - v[order, None]
    power = -0.5 * (ia[order, None] * dx * dx + 2 * ib[order, None] * dx * dy + ic[order, None] * dy * dy)
    alpha = torch.clamp(op[order, None] * torch.exp(power.clamp(max=0)), max=ALPHA_MAX)
    alpha = alpha * (z[order, None] > cam["near"])
    Tr = torch.cumprod(torch.cat([torch.ones_like(alpha[:1]), 1 - alpha[:-1]], 0), 0)
    w = alpha * Tr
    out = (w[:, :, None] * col[order, None, :]).sum(0)
    T_end = Tr[-1] * (1 - alpha[-1])
    return out + T_end[:, None] * torch.tensor(BG, dtype=torch.float32)


# ── the exact renderer (float64, thresholds and early stop), for the reference pixels ────────────────────────────────


def exact_pixels(arr: np.ndarray, cam, pixels: list[tuple[int, int]]) -> list[list[float]]:
    arr = arr.astype(np.float64)
    mean, quat, scale, op, sh = arr[:, 0:3], arr[:, 3:7], arr[:, 7:10], arr[:, 10], arr[:, 11:23].reshape(-1, 4, 3)
    Wm, pos = cam["W"], cam["pos"]
    proj = []
    for i in range(len(arr)):
        t = Wm @ (mean[i] - pos)
        if t[2] < cam["near"]:
            continue
        q = quat[i] / np.linalg.norm(quat[i])
        w, x, y, z = q
        R = np.array(
            [
                [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
                [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
                [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
            ]
        )
        M = R * scale[i][None, :]
        S = M @ M.T
        J = np.array([[cam["fx"] / t[2], 0, -cam["fx"] * t[0] / t[2] ** 2], [0, cam["fy"] / t[2], -cam["fy"] * t[1] / t[2] ** 2]])
        T = J @ Wm
        cv = T @ S @ T.T
        a, b, c = cv[0, 0] + BLUR, cv[0, 1], cv[1, 1] + BLUR
        det = a * c - b * b
        if det <= 0:
            continue
        d = mean[i] - pos
        d /= np.linalg.norm(d)
        col = 0.5 + SH_C0 * sh[i, 0] + SH_C1 * (-d[1] * sh[i, 1] + d[2] * sh[i, 2] - d[0] * sh[i, 3])
        proj.append((t[2], cam["fx"] * t[0] / t[2] + cam["cx"], cam["fy"] * t[1] / t[2] + cam["cy"], c / det, -b / det, a / det, op[i], np.clip(col, 0, 1)))
    proj.sort(key=lambda p: p[0])
    out = []
    for i, j in pixels:
        px, py = i + 0.5, j + 0.5
        C = np.zeros(3)
        T = 1.0
        for _, x, y, ia, ib, ic, o, col in proj:
            dx, dy = px - x, py - y
            power = -0.5 * (ia * dx * dx + 2 * ib * dx * dy + ic * dy * dy)
            if power > 0:
                continue
            al = min(ALPHA_MAX, o * math.exp(power))
            if al < ALPHA_MIN:
                continue
            nxt = T * (1 - al)
            if nxt < T_MIN:
                break
            C += col * al * T
            T = nxt
        out.append((C + T * BG).tolist())
    return out


def main() -> None:
    t0 = time.time()
    torch.manual_seed(SEED)
    rs = np.random.default_rng(SEED)

    cams = []
    for k in range(VIEWS):
        az = 2 * math.pi * k / VIEWS + 0.3 * rs.random()
        el = [0.2, 0.45, 0.75, 1.05][k % 4]
        cams.append(orbit_camera(az, el))
    truth = [torch.tensor(render_truth(c).reshape(-1, 3), dtype=torch.float32) for c in cams]
    held_cam = orbit_camera(0.9, 0.5)  # not one of the training views
    held_truth = torch.tensor(render_truth(held_cam).reshape(-1, 3), dtype=torch.float32)
    print(f"ground truth: {VIEWS} views at {RES}x{RES} in {time.time() - t0:.0f} s")

    mean, quat, scale, op, sh = init_gaussians(rs)
    g = {
        "mean": torch.tensor(mean, dtype=torch.float32),
        "quat": torch.tensor(quat, dtype=torch.float32),
        "log_scale": torch.tensor(np.log(scale), dtype=torch.float32),
        "op_logit": torch.tensor(np.log(op / (1 - op)), dtype=torch.float32),
        "sh": torch.tensor(sh, dtype=torch.float32),
    }
    for v in g.values():
        v.requires_grad_(True)
    lrs = {"mean": 2e-4, "quat": 1e-3, "log_scale": 5e-3, "op_logit": 2e-2, "sh": 5e-3}
    opt = torch.optim.Adam([{"params": [g[k]], "lr": lrs[k]} for k in g])
    jj, ii = np.mgrid[0:RES, 0:RES]
    all_pix = torch.tensor(np.stack([ii.ravel() + 0.5, jj.ravel() + 0.5], -1), dtype=torch.float32)

    def psnr(cam, tgt) -> float:
        with torch.no_grad():
            out = torch.cat([render_t(g, cam, all_pix[s : s + 2048]) for s in range(0, len(all_pix), 2048)])
        return -10 * math.log10(float(((out - tgt) ** 2).mean()))

    psnr0 = psnr(held_cam, held_truth)
    print(f"{len(mean)} Gaussians; held-out PSNR at initialisation {psnr0:.2f} dB")
    for it in range(ITERS):
        k = int(rs.integers(VIEWS))
        sel = torch.tensor(rs.choice(RES * RES, BATCH, replace=False))
        out = render_t(g, cams[k], all_pix[sel])
        loss = (out - truth[k][sel]).abs().mean()
        opt.zero_grad()
        loss.backward()
        opt.step()
        with torch.no_grad():
            g["log_scale"].clamp_(min=math.log(0.002), max=math.log(0.25))
        if it % 200 == 0:
            print(f"iter {it} loss {float(loss.detach()):.4f} ({time.time() - t0:.0f} s)")
    psnr1 = psnr(held_cam, held_truth)
    print(f"held-out PSNR after fitting {psnr1:.2f} dB")

    with torch.no_grad():
        opv = torch.sigmoid(g["op_logit"])
        keep = opv > 0.02
        q = g["quat"] / g["quat"].norm(dim=1, keepdim=True)
        arr = torch.cat([g["mean"], q, torch.exp(g["log_scale"]), opv[:, None], g["sh"].reshape(-1, 12)], 1)[keep].numpy().astype(np.float32)
    (OUT / "splat3d.bin").write_bytes(arr.tobytes())

    ref_cam = orbit_camera(0.7, 0.45, RADIUS, 120, 90)
    ref_px = [(60, 45), (30, 50), (85, 40), (60, 75), (20, 20), (100, 70), (45, 35), (75, 55)]
    ref = exact_pixels(arr, ref_cam, ref_px)
    meta = {
        "about": "3D Gaussian splatting scene fitted by scripts/splat3d.py (seed 11) to 40 ray-traced 96x96 views of a procedural scene. "
        "splat3d.bin: float32, 23 per Gaussian: mean 3, quaternion wxyz 4, scale 3, opacity 1, SH 12 as sh[3k + channel].",
        "count": int(len(arr)),
        "floats": 23,
        "background": BG.tolist(),
        "target": TARGET.tolist(),
        "radius": RADIUS,
        "fovy": FOVY,
        "blur": BLUR,
        "train": {"views": VIEWS, "resolution": RES, "iterations": ITERS, "batch": BATCH, "seconds": round(time.time() - t0)},
        "heldOut": {"az": 0.9, "el": 0.5, "psnrInit": round(psnr0, 2), "psnr": round(psnr1, 2)},
        "reference": {"az": 0.7, "el": 0.45, "radius": RADIUS, "width": 120, "height": 90, "pixels": [{"i": i, "j": j, "rgb": [round(v, 9) for v in c]} for (i, j), c in zip(ref_px, ref)]},
    }
    (OUT / "splat3d.json").write_text(json.dumps(meta, indent=1))
    print(f"wrote {len(arr)} Gaussians, {(OUT / 'splat3d.bin').stat().st_size / 1024:.0f} KB, in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
