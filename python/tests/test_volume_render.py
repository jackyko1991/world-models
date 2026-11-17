"""wm.volume_render: the quadrature's weights sum to 1 − T_final, a uniform slab matches e^{−σL}, the pixel converges
as samples are added, camera rays point where they should, fine samples gather where the weights are; and it agrees
with the TypeScript port (python/tests/fixtures/volume_render.json)."""

import numpy as np
import pytest

from wm.volume_render import (
    Blob,
    Camera,
    blob_field,
    camera_ray,
    deltas,
    march_field,
    orbit_camera,
    over,
    ray_box,
    render_ray,
    sample_along,
    sample_pdf,
)

BLOBS = [
    Blob(np.array([0.2, 0.1]), 0.15, 8.0, np.array([0.9, 0.2, 0.1])),
    Blob(np.array([0.55, -0.05]), 0.1, 20.0, np.array([0.1, 0.4, 0.9])),
]


def test_weights_sum_to_one_minus_t_final():
    rng = np.random.default_rng(1)
    for _ in range(50):
        n = int(rng.integers(1, 41))
        ts = sample_along(0, 2, n, rng.random(n))
        sigmas = rng.random(n) * 10
        res = render_ray(sigmas, rng.random((n, 3)), ts, 2)
        assert res.weights.sum() == pytest.approx(1 - res.t_final, abs=1e-12)
        assert res.t_final == pytest.approx(np.exp(-np.sum(sigmas * deltas(ts, 2))), abs=1e-12)
        assert (res.weights >= 0).all()
        white = render_ray(sigmas, np.ones((n, 3)), ts, 2)
        assert white.colour[0] == pytest.approx(1 - white.t_final, abs=1e-12)
        assert over(white, np.ones(3))[1] == pytest.approx(1, abs=1e-12)


def test_uniform_slab_matches_analytic_transmittance():
    sigma, a, b = 3.0, 0.3, 0.7

    def slab(p):
        return (sigma if a <= p[0] < b else 0.0), np.array([0.2, 0.6, 1.0])

    exact = np.exp(-sigma * (b - a))
    aligned, _, _ = march_field(slab, [0, 0], [1, 0], 0, 1, 10)  # bins line up with the slab
    assert aligned.t_final == pytest.approx(exact, abs=1e-12)
    assert aligned.colour[2] == pytest.approx(1 - exact, abs=1e-12)
    errs = [abs(march_field(slab, [0, 0], [1, 0], 0, 1, n)[0].t_final - exact) for n in (7, 31, 127, 511)]
    assert all(e1 < e0 for e0, e1 in zip(errs, errs[1:])), errs
    assert errs[-1] < 5e-3


def test_more_samples_converge():
    field = blob_field(BLOBS)
    o, d = [-1, 0.02], [1, 0]
    ref = over(march_field(field, o, d, 0, 2.5, 20000)[0], np.ones(3))
    errs = [np.linalg.norm(over(march_field(field, o, d, 0, 2.5, n)[0], np.ones(3)) - ref) for n in (8, 32, 128, 512)]
    assert all(e1 < e0 for e0, e1 in zip(errs, errs[1:])), errs
    assert errs[-1] < 1e-3
    assert np.linalg.norm(ref - 1) > 0.3


def test_camera_rays_and_box():
    cam = orbit_camera(64, 40, 3, 0.7, 0.4)
    o, d = camera_ray(cam, 31.5, 31.5)  # the image centre
    assert np.allclose(d, -o / 3, atol=1e-12)
    edge = camera_ray(cam, -0.5, 31.5)[1]
    assert np.degrees(np.arccos(edge @ d)) == pytest.approx(20, abs=1e-9)
    t0, t1 = ray_box(o, d, 1)
    assert t1 > t0
    for t in (t0, t1):
        assert np.abs(o + t * d).max() == pytest.approx(1, abs=1e-9)
    assert ray_box(o, -d, 1) is None


def test_hierarchical_samples_gather_where_the_weights_are():
    res, ts, _ = march_field(blob_field(BLOBS), [-1, 0], [1, 0], 0, 2.5, 32)
    fine = sample_pdf(ts, res.weights, 0, 2.5, 64)
    inside = lambda t: np.mean((t > 0.7) & (t < 1.75))
    assert inside(fine) > 0.95 and inside(ts) < 0.45
    assert (fine >= 0).all() and (fine <= 2.5).all() and (np.diff(fine) >= 0).all()


# --- agreement with the TypeScript port --------------------------------------------------------------------------
TOL = 1e-9


def test_matches_typescript(fixture):
    fx = fixture("volume_render")
    ob = fx["orbit"]
    cam = orbit_camera(ob["size"], ob["fov"], ob["radius"], ob["azimuth"], ob["elevation"])
    c = fx["camera"]
    assert cam.focal == pytest.approx(c["focal"], abs=TOL)
    for k in ("right", "up", "back", "origin"):
        np.testing.assert_allclose(getattr(cam, k), c[k], atol=TOL)
    ts_cam = Camera(c["width"], c["height"], c["focal"], *(np.array(c[k]) for k in ("right", "up", "back", "origin")))
    for r in fx["rays"]:
        o, d = camera_ray(ts_cam, r["i"], r["j"])
        np.testing.assert_allclose(o, r["o"], atol=TOL)
        np.testing.assert_allclose(d, r["d"], atol=TOL)
    # camera_ray works on arrays of pixels too
    i, j = np.array([[r["i"], r["j"]] for r in fx["rays"]]).T
    np.testing.assert_allclose(camera_ray(ts_cam, i, j)[1], [r["d"] for r in fx["rays"]], atol=TOL)

    for b in fx["boxes"]:
        span = ray_box(np.array(b["o"]), np.array(b["d"]), b["b"])
        if b["span"] is None:
            assert span is None
        else:
            np.testing.assert_allclose(span, b["span"], atol=TOL)

    s = fx["sampling"]
    np.testing.assert_allclose(sample_along(s["near"], s["far"], s["n"]), s["midpoints"], atol=TOL)
    np.testing.assert_allclose(sample_along(s["near"], s["far"], s["n"], s["u"]), s["stratified"], atol=TOL)

    for case in fx["renderRay"]:
        ts = np.array(case["ts"])
        np.testing.assert_allclose(deltas(ts, case["far"]), case["deltas"], atol=TOL)
        res = render_ray(case["sigmas"], case["colours"], ts, case["far"])
        want = case["result"]
        for mine, theirs in [("alphas", "alphas"), ("trans", "trans"), ("weights", "weights"), ("colour", "colour")]:
            np.testing.assert_allclose(getattr(res, mine), want[theirs], atol=TOL)
        assert res.t_final == pytest.approx(want["tFinal"], abs=TOL)

    blobs = [Blob(np.array(b["centre"]), b["radius"], b["peak"], np.array(b["colour"])) for b in fx["blobs"]]
    m = fx["march"]
    res, ts, _ = march_field(blob_field(blobs), m["o"], m["d"], m["near"], m["far"], m["n"])
    np.testing.assert_allclose(ts, m["ts"], atol=TOL)
    np.testing.assert_allclose(res.weights, m["weights"], atol=TOL)
    np.testing.assert_allclose(res.colour, m["colour"], atol=TOL)
    np.testing.assert_allclose(over(res, np.ones(3)), m["over"], atol=TOL)
    assert res.t_final == pytest.approx(m["tFinal"], abs=TOL)

    p = fx["pdf"]
    np.testing.assert_allclose(sample_pdf(p["ts"], p["weights"], p["near"], p["far"], p["n"]), p["even"], atol=TOL)
    np.testing.assert_allclose(sample_pdf(p["ts"], p["weights"], p["near"], p["far"], p["n"], p["u"]), p["drawn"], atol=TOL)
