"""UCT MCTS on tic-tac-toe: takes a win, blocks a forced loss, visit counts add up; agreement with src/models/mcts.ts."""

import math

import numpy as np

from wm.mcts import MuZeroModel, Node, backup, best_move, iterate, legal, new_node, play, select, to_move, uct, unroll, winner

_, X, O = 0, 1, -1


def test_rules():
    assert winner((X, X, X, O, O, _, _, _, _)) == X
    assert winner((X, O, X, X, O, O, O, X, X)) == 0
    assert to_move((X, _, _, _, _, _, _, _, _)) == O
    assert legal((X, X, X, O, O, _, _, _, _)) == []


def test_takes_the_immediate_win():
    b = (X, _, O, X, _, _, _, _, O)  # X wins at 6; O threatens 5
    for seed in (1, 2, 3):
        assert best_move(b, 2000, np.random.default_rng(seed))[0] == 6


def test_blocks_a_forced_loss():
    b = (_, X, _, _, O, _, O, _, X)  # O threatens 2 (diagonal 2-4-6); X must block
    for seed in (1, 2, 3):
        assert best_move(b, 3000, np.random.default_rng(seed))[0] == 2


def test_visit_counts_add_up():
    root = new_node((_, _, _, _, X, _, _, _, _))
    rng = np.random.default_rng(4)
    for _i in range(500):
        iterate(root, rng)
    assert root.n == 500

    def check(n: Node):
        if n.children:
            assert n.n == (1 if n.parent else 0) + sum(c.n for c in n.children)
        for c in n.children:
            check(c)

    check(root)


def test_muzero_unroll():
    m = MuZeroModel(h=sum, g=lambda s, a: (a, s + a), f=lambda s: ([0.5, 0.5], s))
    out = unroll(m, [1, 2], [1, 0, 1])
    assert [p["value"] for p in out] == [3, 4, 4, 5]
    assert [p["reward"] for p in out] == [0, 1, 0, 1]


def build_tree(t: dict) -> Node:
    root = new_node(tuple(t["board"]))
    root.n, root.untried = t["n"], []
    for c in t["children"]:
        child = new_node(play(root.board, c["move"]), c["move"], root)
        child.n, child.w = c["n"], c["w"]
        for g in c["children"]:
            grand = new_node(play(child.board, g["move"]), g["move"], child)
            grand.n, grand.w = g["n"], g["w"]
            child.children.append(grand)
        if c["children"]:
            child.untried = []
        root.children.append(child)
    return root


def test_agrees_with_typescript(fixture):
    f = fixture("mcts")
    for r in f["rules"]:
        b = tuple(r["board"])
        assert winner(b) == r["winner"]
        assert to_move(b) == r["toMove"]
        assert legal(b) == r["legal"]
        assert [list(play(b, i)) for i in legal(b)] == r["play"]
    root = build_tree(f["tree"])
    for u in f["ucts"]:
        np.testing.assert_allclose([uct(ch, u["c"]) for ch in root.children], u["scores"], rtol=0, atol=1e-9)
        assert [nd.move for nd in select(root, u["c"])] == u["selected"]
    path = select(root, math.sqrt(2))
    assert [nd.move for nd in path] == f["backup"]["path"]
    backup(path, f["backup"]["result"])
    assert [{"n": nd.n, "w": nd.w} for nd in path] == f["backup"]["after"]
