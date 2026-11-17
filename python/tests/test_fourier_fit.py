"""wm.fourier_fit: the stored target is the signal, amplitude_at reads each component back, the encoding matches the
training script's, spectral bias shows in the snapshots; and agreement with the TypeScript port
(python/tests/fixtures/fourier_fit.json)."""

import numpy as np
import pytest

from wm.fourier_fit import amplitude_at, features, mse, recovered, signal


@pytest.fixture
def data(asset):
    return asset("fourier-fit.json")


def test_target_is_the_signal(data):
    x = np.arange(data["grid"]) / data["grid"]
    np.testing.assert_allclose(data["target"], signal(data["components"], x), atol=1e-4)
    for c in data["components"]:
        assert amplitude_at(data["target"], c["cycles"]) == pytest.approx(c["amplitude"], abs=1e-3)
    assert amplitude_at(data["target"], 7) < 1e-3


def test_amplitude_of_a_pure_sine():
    x = np.arange(64) / 64
    assert amplitude_at(0.7 * np.sin(2 * np.pi * 5 * x + 0.3), 5) == pytest.approx(0.7, abs=1e-12)


def test_encoding_matches_script(data):
    probe = data["encodingProbe"]
    np.testing.assert_allclose(features(probe["x"], probe["frequencies"]), probe["gamma"], atol=1e-6)
    assert features([0.2, 0.4], 0).shape == (2, 1)


def test_spectral_bias(data):
    comps, target, steps = data["components"], data["target"], data["steps"]
    plain = [recovered(comps, target, p) for p in data["runs"]["plain"]["predictions"]]

    def first_at(c):
        hits = [s for s, r in zip(steps, plain) if r[c] >= 0.8]
        return hits[0] if hits else np.inf

    assert first_at(0) < first_at(1) < first_at(2)
    assert plain[-1][2] < 0.5
    fourier = recovered(comps, target, data["runs"]["fourier"]["predictions"][-1])
    assert (fourier > 0.98).all()
    assert mse(data["runs"]["fourier"]["predictions"][-1], target) < mse(data["runs"]["plain"]["predictions"][-1], target) / 100


def test_matches_typescript(fixture, data):
    fx = fixture("fourier_fit")
    comps, target = data["components"], data["target"]
    np.testing.assert_allclose(signal(comps, fx["x"]), fx["signal"], atol=1e-9)
    np.testing.assert_allclose(features(fx["x"], 6), fx["encoding"], atol=1e-9)
    for a in fx["amplitudes"]:
        assert amplitude_at(target, a["cycles"]) == pytest.approx(a["amplitude"], abs=1e-9)
    for snap in fx["snapshots"]:
        for run in ("plain", "fourier"):
            pred = data["runs"][run]["predictions"][snap["index"]]
            np.testing.assert_allclose(recovered(comps, target, pred), snap[run]["recovered"], atol=1e-9)
            assert mse(pred, target) == pytest.approx(snap[run]["mse"], abs=1e-9)
