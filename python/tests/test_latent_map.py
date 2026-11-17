"""wm.latent_map: the numpy decoder reproduces the training script's reference decodes, decoding an encoded frame gives
back the true frame, the map is organised by the ball's position, latent interpolation keeps one ball while pixel
interpolation fades two, and it agrees with the TypeScript port."""

import numpy as np
import pytest

from wm.latent_map import decode, layers_from_json, lerp_latent, lerp_pixels, nearest, peak, render_frame


@pytest.fixture
def data(asset):
    d = asset("latent-map.json")
    d["layers"] = layers_from_json(d["layers"])
    d["zs"] = np.array([p["z"] for p in d["points"]])
    return d


def test_reproduces_the_reference_decodes(data):
    assert len(data["references"]) >= 3
    for ref in data["references"]:
        out = decode(data["layers"], ref["z"])
        assert out.shape == (data["size"] ** 2,)
        assert np.max(np.abs(out - ref["out"])) < 1e-5


def test_decoding_an_encoded_frame_gives_back_the_true_frame(data):
    errors = [
        np.mean(np.abs(decode(data["layers"], p["z"]) - render_frame(data["size"], data["radius"], p["x"], p["y"])))
        for p in data["points"]
    ]
    assert np.mean(errors) < 0.02
    assert abs(np.mean(errors) - data["reconstructionError"]) < 1e-3


def test_the_map_is_organised_by_the_generating_factors(data):
    pts, zs = data["points"], data["zs"]
    far = 0
    for i, p in enumerate(pts):
        others = [j for j in range(len(pts)) if j != i]
        q = pts[others[nearest(zs[others], p["z"])]]
        far += np.hypot(p["x"] - q["x"], p["y"] - q["y"]) > 2
    assert far / len(pts) < 0.05


def test_latent_interpolation_keeps_one_ball_pixel_interpolation_fades_two(data):
    pts = data["points"]
    a = min(pts, key=lambda p: p["x"] + p["y"])
    b = max(pts, key=lambda p: p["x"] + p["y"])
    fa = render_frame(data["size"], data["radius"], a["x"], a["y"])
    fb = render_frame(data["size"], data["radius"], b["x"], b["y"])
    assert peak(lerp_pixels(fa, fb, 0.5)) < 0.6
    for t in (0.25, 0.5, 0.75):
        assert peak(lerp_latent(data["layers"], a["z"], b["z"], t)) > 0.85


def test_agrees_with_the_typescript_port(data, fixture):
    fx = fixture("latent_map")
    for z, out in zip(fx["zs"], fx["decoded"]):
        np.testing.assert_allclose(decode(data["layers"], z), out, rtol=0, atol=1e-9)
    lerp = fx["lerp"]
    np.testing.assert_allclose(lerp_latent(data["layers"], lerp["za"], lerp["zb"], lerp["t"]), lerp["latent"], atol=1e-9)
    for f in fx["frames"]:
        np.testing.assert_allclose(render_frame(data["size"], data["radius"], f["x"], f["y"]), f["frame"], atol=1e-9)
    for q in fx["nearest"]:
        assert nearest(data["zs"], q["z"]) == q["index"]
