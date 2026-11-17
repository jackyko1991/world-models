"""wm.latent_actions: on clean, unlabelled frame pairs the k-means codes recover the five keys up to a renaming; the
result is reproducible; too few codes merge keys and spare codes stay empty; a blocked move lands in the code of
"stay"; playing a code moves the player; and it agrees with the TypeScript port."""

import numpy as np

from wm.latent_actions import apply_code, assign, confusion, feature, frame_pairs, learn_latent_actions, purity, update
from wm.tiny_game import DX, DY, PLAYER


def pairs(n, clean=True, seed=3):
    return frame_pairs(n, np.random.default_rng(seed), clean)


def learn(ps, k, seed=1):
    return learn_latent_actions(ps, k, np.random.default_rng(seed))


def test_on_clean_data_five_codes_recover_five_keys_up_to_permutation():
    ps = pairs(500)
    centroids, codes = learn(ps, 5)
    m = confusion(ps, codes, 5)
    assert purity(m) == 1
    assert all((row > 0).sum() == 1 for row in m)  # each code holds one key ...
    key_of = [int(np.argmax(row)) for row in m]
    assert sorted(key_of) == [0, 1, 2, 3, 4]  # ... and each key one code
    for j, a in enumerate(key_of):
        np.testing.assert_allclose(centroids[j], [DX[a], DY[a]], atol=1e-9)  # the codes are the unit moves


def test_reproducible():
    ps = pairs(300)
    assert np.array_equal(learn(ps, 5, 9)[1], learn(ps, 5, 9)[1])


def test_too_few_codes_merge_keys_spare_codes_stay_unused():
    ps = pairs(500)
    assert purity(confusion(ps, learn(ps, 3)[1], 3)) < 1
    eight = confusion(ps, learn(ps, 8)[1], 8)
    assert purity(eight) == 1
    assert (eight.sum(axis=1) > 0).sum() == 5


def test_with_walls_a_blocked_move_is_indistinguishable_from_stay():
    ps = pairs(800, clean=False)
    blocked = [i for i, p in enumerate(ps) if p.hidden != 0 and not feature(p.before, p.after).any()]
    assert blocked
    codes = learn(ps, 5)[1]
    stay = codes[next(i for i, p in enumerate(ps) if p.hidden == 0)]
    assert all(codes[i] == stay for i in blocked)


def test_playing_a_code_moves_the_player():
    p = pairs(1)[0]
    moved = apply_code(p.before, [1, 0])
    assert (moved == PLAYER).sum() == 1
    assert feature(p.before, moved).tolist() in ([1.0, 0.0], [0.0, 0.0])  # 0 only if a wall stopped it


def test_agrees_with_the_typescript_port(fixture):
    fx = fixture("latent_actions")
    ps = fx["pairs"]
    points = np.array([feature(np.array(p["before"]), np.array(p["after"])) for p in ps])
    np.testing.assert_allclose(points, fx["features"], atol=1e-9)
    for run in fx["runs"]:
        # TS seeds k-means++ from its own random stream, so compare its *result*: a fixed point of k-means here too
        centroids = np.array(run["centroids"])
        codes = assign(points, centroids)
        assert codes.tolist() == run["codes"]
        np.testing.assert_allclose(update(points, codes, centroids), centroids, atol=1e-9)
        class P:  # confusion() needs .hidden only
            def __init__(self, hidden):
                self.hidden = hidden
        m = confusion([P(p["hidden"]) for p in ps], codes, run["k"])
        assert m.tolist() == run["confusion"]
        assert abs(purity(m) - run["purity"]) < 1e-9
    for a in fx["applied"]:
        assert apply_code(np.array(a["frame"]), a["v"]).tolist() == a["out"]
