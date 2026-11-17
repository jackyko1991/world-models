"""wm.nerf_tiny: the encoding's layout, the forward pass and rendered pixels against the reference scripts/tiny_nerf.py
saved beside the weights (within 1e-5), and agreement with the TypeScript port (python/tests/fixtures/nerf_tiny.json)."""

import numpy as np
import pytest

from wm.nerf_tiny import field, load_nerf, parameter_count, positional_encoding, render_image, render_pixel
from wm.volume_render import orbit_camera


@pytest.fixture
def data(asset):
    return asset("tiny-nerf.json")


def camera_for(data, azimuth, elevation):
    r = data["render"]
    return orbit_camera(r["size"], r["fov"], r["radius"], azimuth, elevation)


def test_positional_encoding_layout():
    g = positional_encoding([0.25, -0.5, 1.0], 2)
    assert g.shape == (3 + 6 * 2,)
    np.testing.assert_array_equal(g[:3], [0.25, -0.5, 1.0])
    assert g[3] == pytest.approx(np.sin(np.pi * 0.25)) and g[6] == pytest.approx(np.sin(2 * np.pi * 0.25))
    assert g[9] == pytest.approx(np.cos(np.pi * 0.25)) and g[14] == pytest.approx(np.cos(2 * np.pi * 1))
    # batched points give the same rows
    pts = np.array([[0.25, -0.5, 1.0], [0.1, 0.2, 0.3]])
    np.testing.assert_allclose(positional_encoding(pts, 2)[1], positional_encoding(pts[1], 2))


def test_parameter_count(data):
    m = load_nerf(data)
    assert parameter_count(m) == data["training"]["parameters"] <= 50_000


def test_field_matches_reference(data):
    m = load_nerf(data)
    ref = data["reference"]
    sigma, rgb = field(m, np.array(ref["points"]))
    np.testing.assert_allclose(sigma, ref["sigma"], atol=1e-5, rtol=1e-5)
    np.testing.assert_allclose(rgb, ref["rgb"], atol=1e-5)


def test_pixels_match_reference(data):
    m = load_nerf(data)
    for px in data["reference"]["pixels"]:
        c = render_pixel(m, camera_for(data, px["azimuth"], px["elevation"]), px["i"], px["j"])
        np.testing.assert_allclose(c, px["rgb"], atol=1e-5)


def test_render_image(data):
    m = load_nerf(data)
    img = render_image(m, camera_for(data, 0.3, 0.5))
    size = data["render"]["size"]
    assert img.shape == (size, size, 3) and (img >= 0).all() and (img <= 1).all()
    np.testing.assert_allclose(img[0, 0], data["render"]["background"], atol=0.05)  # a corner sees the background


def test_matches_typescript(fixture, data):
    fx = fixture("nerf_tiny")
    m = load_nerf(data)
    pts = np.array(fx["points"])
    np.testing.assert_allclose(positional_encoding(pts, fx["frequencies"]), fx["encoding"], atol=1e-9)
    sigma, rgb = field(m, pts)
    np.testing.assert_allclose(sigma, [f["sigma"] for f in fx["field"]], atol=1e-9)
    np.testing.assert_allclose(rgb, [f["rgb"] for f in fx["field"]], atol=1e-9)
    cam = camera_for(data, fx["camera"]["azimuth"], fx["camera"]["elevation"])
    for px in fx["pixels"]:
        np.testing.assert_allclose(render_pixel(m, cam, px["i"], px["j"]), px["rgb"], atol=1e-9)
