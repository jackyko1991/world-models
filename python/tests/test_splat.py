"""wm/splat.py: Σ = R S Sᵀ Rᵀ is a covariance; EWA's J W Σ Wᵀ Jᵀ matches a finite-difference Jacobian and Monte-Carlo
samples; front to back equals back to front; the renderer reproduces the reference pixels scripts/splat2d.py and
scripts/splat3d.py saved; the moving scene behaves; and everything agrees with the TypeScript port (src/models/splat.ts)
through python/tests/fixtures/splat.json."""

from pathlib import Path

import numpy as np
from wm import splat as gs

ROOT = Path(__file__).resolve().parents[2]
rng = np.random.default_rng(0)


def random_quat():
    return rng.normal(size=4)


# --- the model's own properties ----------------------------------------------------------------------------------
def test_rotation_and_covariance():
    for _ in range(50):
        q, s = random_quat(), 0.01 + rng.random(3)
        R = gs.quat_to_rot(q)
        assert np.allclose(R.T @ R, np.eye(3), atol=1e-12)
        assert np.isclose(np.linalg.det(R), 1.0)
        S = gs.covariance_3d(q, s)
        assert np.allclose(S, S.T, atol=1e-14)
        assert np.all(np.linalg.eigvalsh(S) > 0)  # positive definite
        assert np.isclose(np.linalg.det(S), np.prod(s) ** 2, rtol=1e-9, atol=1e-14)
        assert np.isclose(np.trace(S), np.sum(s**2))


def test_ewa_matches_finite_difference_jacobian():
    for _ in range(30):
        cam = gs.orbit_camera(6 * rng.random(), 1.2 * rng.random() - 0.2, 2 + 3 * rng.random(), [0, 0.3, 0], 0.8, 160, 120)
        mean = np.array([0.0, 0.3, 0.0]) + rng.normal(size=3) * [0.5, 0.3, 0.5]
        sigma = gs.covariance_3d(random_quat(), 0.05 + 0.2 * rng.random(3))
        h = 1e-6
        A = np.stack([(gs.project_point(cam, mean + h * e) - gs.project_point(cam, mean - h * e)) / (2 * h) for e in np.eye(3)], axis=1)
        ref = A @ sigma @ A.T
        cov = gs.project_covariance(cam, mean, sigma, blur=0)
        assert np.allclose(cov, ref, atol=1e-5 * np.abs(ref).max())
    # and the analytic J against finite differences of the divide itself
    t = np.array([0.3, -0.2, 2.5])
    J = gs.perspective_jacobian(t, 100, 90)
    divide = lambda q: np.array([100 * q[0] / q[2], 90 * q[1] / q[2]])
    numeric = np.stack([(divide(t + 1e-6 * e) - divide(t - 1e-6 * e)) / 2e-6 for e in np.eye(3)], axis=1)
    assert np.allclose(J, numeric, atol=1e-5)


def test_ewa_matches_monte_carlo_samples():
    cam = gs.orbit_camera(0.4, 0.3, 3, [0, 0, 0], 0.9, 200, 200)
    q, s, mean = random_quat(), np.array([0.04, 0.02, 0.01]), np.array([0.3, 0.1, -0.2])
    predicted = gs.project_covariance(cam, mean, gs.covariance_3d(q, s), blur=0)
    points = mean + (rng.normal(size=(40000, 3)) * s) @ gs.quat_to_rot(q).T
    uv = np.array([gs.project_point(cam, p) for p in points])
    assert np.allclose(np.cov(uv.T), predicted, atol=0.04 * predicted.diagonal().max())


def test_front_to_back_equals_back_to_front():
    for _ in range(100):
        layers = [(rng.random(3), rng.random()) for _ in range(rng.integers(1, 13))]
        bg = rng.random(3)
        assert np.allclose(gs.composite_front_to_back(layers, bg), gs.composite_back_to_front(layers, bg), atol=1e-12)


def test_composite_equals_per_pixel_loop():
    splats = [gs.Splat(rng.normal(size=3) * 0.6, random_quat(), 0.02 + 0.15 * rng.random(3), 0.2 + 0.79 * rng.random(), rng.normal(size=12)) for _ in range(60)]
    cam = gs.orbit_camera(0.5, 0.4, 3, [0, 0, 0], 0.9, 48, 40)
    bg = np.array([0.9, 0.95, 1.0])
    image, _, ordered = gs.render_splats(splats, cam, bg)
    for j in range(40):
        for i in range(48):
            C, T = np.zeros(3), 1.0
            for p in ordered:
                a = float(gs.splat_alpha(p, i + 0.5, j + 0.5))
                if a < gs.ALPHA_MIN:
                    continue
                if T * (1 - a) < gs.T_MIN:
                    break
                C += p.rgb * a * T
                T *= 1 - a
            assert np.allclose(C + T * bg, image[j, i], atol=1e-12)
    assert image.min() >= -1e-12 and image.max() <= 1 + 1e-12


def test_renders_the_2d_reference_pixels(asset):
    d = asset("splat2d.json")
    g = d["snapshots"][d["reference"]["snapshot"]]["g"]
    image, _ = gs.composite([gs.gauss_2d_to_projected(x, k) for k, x in enumerate(g)], d["width"], d["height"], d["background"])
    for px in d["reference"]["pixels"]:
        assert np.allclose(image[px["j"], px["i"]], px["rgb"], atol=1e-5)


def test_renders_the_3d_reference_pixels(asset):
    meta = asset("splat3d.json")
    splats = gs.decode_splats(np.fromfile(ROOT / "public" / "models" / "splat3d.bin", dtype="<f4"))
    assert len(splats) == meta["count"]
    ref = meta["reference"]
    cam = gs.orbit_camera(ref["az"], ref["el"], ref["radius"], meta["target"], meta["fovy"], ref["width"], ref["height"])
    image, _, _ = gs.render_splats(splats, cam, meta["background"], meta["blur"])
    for px in ref["pixels"]:
        assert np.allclose(image[px["j"], px["i"]], px["rgb"], atol=1e-5)


def test_moving_scene_box_is_rigid_and_ball_stays_up():
    part = ["box"] * 5 + ["ball"] * 3
    canonical = [gs.Splat(rng.normal(size=3) * 0.2, random_quat(), np.full(3, 0.05), 0.9, np.zeros(3)) for _ in part]
    a, b = gs.deform(canonical, part, 0.13), gs.deform(canonical, part, 0.71)
    for i in range(5):
        for j in range(i + 1, 5):
            assert np.isclose(np.linalg.norm(a[i].mean - a[j].mean), np.linalg.norm(b[i].mean - b[j].mean), atol=1e-12)
    assert all(gs.ball_height(t) >= 0.25 - 1e-12 for t in np.linspace(0, 1, 101))
    for g0, g1 in zip(gs.deform(canonical, part, 0), gs.deform(canonical, part, 1)):
        assert np.allclose(g0.mean, g1.mean, atol=1e-9)


# --- agreement with the TypeScript port ----------------------------------------------------------------------------
TOL = dict(rtol=1e-9, atol=1e-9)


def camera(c) -> gs.Camera:
    return gs.orbit_camera(c["az"], c["el"], c["radius"], c["target"], c["fovy"], c["width"], c["height"])


def to_splat(s) -> gs.Splat:
    return gs.Splat(np.array(s["mean"]), np.array(s["quat"]), np.array(s["scale"]), s["opacity"], np.array(s["sh"]))


def sym(m):  # the TS port stores a symmetric 2×2 as [a, b, c]
    return np.array([[m[0], m[1]], [m[1], m[2]]])


def test_agrees_with_typescript(fixture):
    f = fixture("splat")
    for c in f["covariance"]:
        assert np.allclose(gs.quat_to_rot(c["q"]).ravel(), c["R"], **TOL)
        assert np.allclose(gs.covariance_3d(c["q"], c["s"]).ravel(), c["sigma"], **TOL)
    for c in f["projection"]:
        cam = camera(c["cam"])
        assert np.allclose(cam.pos, c["pos"], **TOL) and np.allclose(cam.W.ravel(), c["W"], **TOL) and np.isclose(cam.fx, c["f"])
        t = gs.to_camera(cam, c["mean"])
        assert np.allclose(t, c["t"], **TOL)
        assert np.allclose(gs.project_point(cam, c["mean"]), c["uv"], **TOL)
        assert np.allclose(gs.perspective_jacobian(t, cam.fx, cam.fy).ravel(), c["J"], **TOL)
        sigma = gs.covariance_3d(c["q"], c["s"])
        assert np.allclose(gs.project_covariance(cam, c["mean"], sigma), sym(c["cov"]), **TOL)
        assert np.allclose(gs.project_covariance(cam, c["mean"], sigma, blur=0), sym(c["cov0"]), **TOL)
    for c in f["colour"]:
        assert np.allclose(gs.sh_colour(c["sh"], c["dir"]), c["rgb"], **TOL)

    scene = f["scene"]
    cam = camera(scene["cam"])
    image, T, ordered = gs.render_splats([to_splat(s) for s in scene["splats"]], cam, scene["background"])
    assert [p.index for p in ordered] == [p["index"] for p in scene["projected"]]
    for p, q in zip(ordered, scene["projected"]):
        assert np.allclose([p.x, p.y, p.depth, p.opacity, p.radius], [q["x"], q["y"], q["depth"], q["opacity"], q["radius"]], **TOL)
        assert np.allclose(p.cov, sym(q["cov"]), **TOL) and np.allclose(p.conic, sym(q["conic"]), **TOL)
        assert np.allclose(p.rgb, q["rgb"], **TOL)
        alphas = [float(gs.splat_alpha(p, x, y)) for x, y in scene["pixels"]]
        assert np.allclose(alphas, q["alpha"], **TOL)
    assert np.allclose(image.ravel(), scene["rgb"], **TOL)
    assert np.allclose(T.ravel(), scene["T"], **TOL)

    ftb = f["frontToBack"]
    layers = [(np.array(l["rgb"]), l["alpha"]) for l in ftb["layers"]]
    assert np.allclose(gs.composite_front_to_back(layers, ftb["background"]), ftb["rgb"], **TOL)

    d = f["deform"]
    canonical = [to_splat(s) for s in d["canonical"]]
    for m in d["motion"]:
        for g, want in zip(gs.deform(canonical, d["part"], m["t"]), m["splats"]):
            assert np.allclose(g.mean, want["mean"], **TOL) and np.allclose(g.quat, want["quat"], **TOL)


def test_fixture_scene_exercises_the_early_stop(fixture):
    """The fixture's little scene is dense enough that some pixels stop early, so the agreement covers that branch."""
    scene = fixture("splat")["scene"]
    _, _, ordered = gs.render_splats([to_splat(s) for s in scene["splats"]], camera(scene["cam"]), scene["background"])
    stops = 0
    for j in range(scene["cam"]["height"]):
        for i in range(scene["cam"]["width"]):
            T = 1.0
            for p in ordered:
                a = float(gs.splat_alpha(p, i + 0.5, j + 0.5))
                if a > 0 and T * (1 - a) < gs.T_MIN:
                    stops += 1
                    break
                T *= 1 - a
    assert stops > 0
