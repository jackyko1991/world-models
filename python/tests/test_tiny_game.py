"""wm.tiny_game: walls block and the coin jumps by the hidden clock; the tokenizer is lossless on the frames it was
built from; the generator reproduces deterministic transitions with p = 1 and spreads coin pick-ups; unseen states are
flagged; more play covers more; and it agrees with the TypeScript port."""

import numpy as np

from wm.tiny_game import (
    COIN,
    COIN_SPOTS,
    PLAYER,
    START,
    TOKENS,
    UNKNOWN,
    GameState,
    Transition,
    coverage,
    decode,
    encode,
    patches,
    predict,
    record,
    render,
    step,
    train,
)


def rng(seed=7):
    return np.random.default_rng(seed)


def test_walls_block_and_eating_the_coin_moves_it_by_the_hidden_clock():
    assert step(START._replace(px=0, py=0), 1).px == 0
    eat = step(GameState(px=4, py=0, coin=0, clock=6), 2)
    assert eat.coin == 7 % len(COIN_SPOTS)
    f = render(eat)
    assert (f == PLAYER).sum() == 1 and (f == COIN).sum() == 1


def test_the_tokenizer_is_lossless_on_the_frames_it_was_built_from():
    play = record(400, rng())
    g = train(play)
    for t in play:
        f = render(t.before)
        tokens = encode(f, g.codebook)
        assert len(tokens) == TOKENS and UNKNOWN not in tokens
        assert np.array_equal(decode(tokens, g.codebook), f)
    assert len(g.codebook) < 81


def test_the_generator_is_sure_of_deterministic_steps_and_spreads_coin_pickups():
    play = record(3000, rng())
    g = train(play)
    spread = 0
    for t in play:
        pr = predict(g, encode(render(t.before), g.codebook), t.action)
        assert pr.seen > 0
        assert abs(sum(p for _, p in pr.outcomes) - 1) < 1e-12
        assert encode(render(t.after), g.codebook) in [tokens for tokens, _ in pr.outcomes]
        ate = t.before.coin != t.after.coin
        if not ate:
            assert pr.outcomes[0][1] == 1
        spread += ate and len(pr.outcomes) > 1
    assert spread > 0


def test_unseen_states_are_flagged_and_the_guess_is_nothing_changes():
    g = train(record(5, rng()))
    far = encode(render(GameState(5, 3, 2, 0)), g.codebook)
    pr = predict(g, far, 2)
    assert pr.seen == 0 and pr.outcomes[0][0] == far


def test_more_play_covers_more():
    cov = [coverage(train(record(n, rng()))) for n in (20, 100, 400, 2000, 8000)]
    assert all(cov[i][0] >= cov[i - 1][0] for i in range(1, len(cov)))
    assert cov[0][0] / cov[0][1] < 0.2 and cov[-1][0] / cov[-1][1] > 0.9


def state(d) -> GameState:
    return GameState(d["px"], d["py"], d["coin"], d["clock"])


def test_agrees_with_the_typescript_port(fixture):
    fx = fixture("tiny_game")
    for s in fx["steps"]:
        assert step(state(s["state"]), s["action"]) == state(s["next"])
    for f in fx["frames"]:
        assert render(state(f["state"])).tolist() == f["frame"]
    play = [Transition(state(t["before"]), t["action"], state(t["after"])) for t in fx["play"]]
    g = train(play)
    assert g.codebook == fx["patterns"]
    for q in fx["predictions"]:
        pr = predict(g, tuple(q["tokens"]), q["action"])
        assert pr.seen == q["seen"]
        assert [list(tokens) for tokens, _ in pr.outcomes] == [o["tokens"] for o in q["outcomes"]]
        np.testing.assert_allclose([p for _, p in pr.outcomes], [o["p"] for o in q["outcomes"]], atol=1e-9)
    for d in fx["decoded"]:
        assert decode(d["tokens"], g.codebook).tolist() == d["frame"]
        assert list(encode(np.array(d["frame"]), g.codebook)) == d["tokens"]
        assert len(patches(np.array(d["frame"]))) == TOKENS
    assert coverage(g) == (fx["coverage"]["seen"], fx["coverage"]["total"])
