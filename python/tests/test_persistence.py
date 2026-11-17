"""wm.persistence: the explicit splat scene renders the same after any round trip; the frame model copies what it
remembers and brings a short pan back unchanged; turning far away and back with a short memory re-invents the place;
the z-buffer keeps the nearest splat; and it agrees with the TypeScript port."""

import numpy as np

from wm.persistence import (
    RING,
    VIEW,
    Face,
    FrameModel,
    Splat,
    differences,
    make_scene,
    render_scene,
    start_frame_model,
    turn,
)

scene = make_scene(np.random.default_rng(11))


def test_the_scene_fills_the_ring_and_renders_the_same_after_a_round_trip():
    filled = sum(c is not None for y in range(0, RING, VIEW) for c in render_scene(scene, y))
    assert filled > RING / 2
    before = render_scene(scene, 3)
    for y in range(3, 3 + RING):
        render_scene(scene, y % RING)
    assert differences(before, render_scene(scene, 3)) == 0


def test_the_frame_model_copies_what_is_still_in_view():
    first = render_scene(scene, 0)
    m = turn(start_frame_model(first, 0), 1, 4)
    assert m.memory[-1][1][: VIEW - 1] == first[1:]


def test_a_short_pan_with_enough_memory_comes_back_unchanged():
    first = render_scene(scene, 0)
    m = turn(turn(start_frame_model(first, 0), 3, 8), -3, 8)
    assert m.yaw == 0 and differences(m.memory[-1][1], first) == 0


def round_trip(first, away, seed):
    m = turn(turn(start_frame_model(first, 0, seed), away, 4), -away, 4)
    assert m.yaw == 0
    return differences(m.memory[-1][1], first)


def test_turning_away_and_back_with_a_short_memory_reinvents_the_place():
    first = render_scene(scene, 0)
    assert sum(round_trip(first, RING // 2, seed) > 0 for seed in range(1, 6)) >= 4


def test_forgetting_grows_with_the_time_away():
    first = render_scene(scene, 0)
    runs = lambda away: sum(round_trip(first, away, seed) for seed in range(1, 9))  # noqa: E731
    assert runs(1) == 0 and runs(12) > runs(1)


def test_z_buffer_keeps_the_nearest_splat():
    far = Splat(az=4, dist=8, radius=1, top=2, colour=1)
    near = Splat(az=4, dist=3, radius=0.5, top=1, colour=2)
    assert render_scene([far, near], 0)[3].colour == 2
    assert render_scene([near, far], 0)[3].colour == 2


def column(c):
    return None if c is None else Face(c["colour"], c["height"])


def splats(items):
    return [Splat(s["az"], s["dist"], s["radius"], s["top"], s["colour"]) for s in items]


def assert_same_view(view, expected):
    assert len(view) == len(expected)
    for got, want in zip(view, map(column, expected)):
        assert (got is None) == (want is None)
        if got is not None:
            assert got.colour == want.colour and abs(got.height - want.height) < 1e-9


def test_agrees_with_the_typescript_port(fixture):
    fx = fixture("persistence")
    ts_scene = splats(fx["scene"])
    for r in fx["renders"]:
        assert_same_view(render_scene(ts_scene, r["yaw"]), r["view"])
    zb = splats(fx["zbuffer"]["splats"])
    for r in fx["zbuffer"]["renders"]:
        assert_same_view(render_scene(zb, r["yaw"]), r["view"])
    # frame-model steps that only recall remembered columns (inventing uses each language's own random numbers)
    fm = fx["frameModel"]
    p = fm["panned"]  # the TS model after panning right (its invented columns included)
    m = FrameModel(p["t"], p["yaw"], [(v["yaw"], [column(c) for c in v["view"]]) for v in p["memory"]], p["seed"])
    assert m.memory[0][1] == [column(c) for c in fm["first"]]
    for v in fm["views"]:
        m = turn(m, v["steps"], v["memory"])
        assert m.yaw == v["yaw"]
        assert_same_view(m.memory[-1][1], v["view"])
