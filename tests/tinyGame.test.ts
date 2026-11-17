/**
 * The tiny game and its count-based generator (src/models/tinyGame.ts): the tokenizer is lossless on the frames it was
 * built from, the generator reproduces every deterministic recorded transition with probability 1, a coin pick-up
 * (decided by a clock the frame does not show) gets a spread of outcomes whose probabilities sum to 1, unseen states
 * are flagged, and more recorded play covers more of the game.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { COIN_SPOTS, START, TOKENS, UNKNOWN, coverage, decode, encode, predict, record, render, step, train, type Action } from "../src/models/tinyGame.ts";

test("the game: walls block, eating the coin moves it to a spot chosen by the hidden clock", () => {
  const s = step({ ...START, px: 0, py: 0 }, 1);
  assert.equal(s.px, 0);
  // stand next to coin spot 0 at (5,0) and step onto it
  const eat = step({ px: 4, py: 0, coin: 0, clock: 6 }, 2);
  assert.equal(eat.coin, 7 % COIN_SPOTS.length);
  const f = render(eat);
  assert.equal(f.filter((c) => c === 1).length, 1);
  assert.equal(f.filter((c) => c === 2).length, 1);
});

test("the tokenizer: 6 tokens per frame, lossless on the frames it was built from", () => {
  const g = train(record(400));
  for (const t of record(400)) {
    const f = render(t.before);
    const toks = encode(f, g.cb);
    assert.equal(toks.length, TOKENS);
    assert.ok(!toks.includes(UNKNOWN));
    assert.deepEqual(decode(toks, g.cb), f);
  }
  assert.ok(g.cb.patterns.length < 81, "the codebook holds only the patch patterns that occur");
});

test("the generator reproduces deterministic transitions with p = 1 and spreads the coin's hidden-clock outcomes", () => {
  const play = record(3000);
  const g = train(play);
  let spread = 0;
  for (const t of play) {
    const pr = predict(g, encode(render(t.before), g.cb), t.action);
    assert.ok(pr.seen > 0);
    const sum = pr.outcomes.reduce((a, o) => a + o.p, 0);
    assert.ok(Math.abs(sum - 1) < 1e-12);
    const truth = encode(render(t.after), g.cb);
    assert.ok(pr.outcomes.some((o) => o.tokens.join() === truth.join()), "the true next frame is among the outcomes");
    const ate = t.before.coin !== t.after.coin;
    if (!ate) assert.equal(pr.outcomes[0].p, 1, "no coin pick-up: one outcome");
    if (ate && pr.outcomes.length > 1) spread++;
  }
  assert.ok(spread > 0, "some coin pick-ups have more than one possible outcome");
});

test("unseen (frame, action): flagged with seen = 0, and the guess is 'nothing changes'", () => {
  const g = train(record(5));
  const far = encode(render({ px: 5, py: 3, coin: 2, clock: 0 }), g.cb);
  const pr = predict(g, far, 2 as Action);
  assert.equal(pr.seen, 0);
  assert.deepEqual(pr.outcomes[0].tokens, far);
});

test("more recorded play covers more (frame, action) pairs (monotone)", () => {
  const cov = [20, 100, 400, 2000, 8000].map((n) => coverage(train(record(n))));
  for (let i = 1; i < cov.length; i++) assert.ok(cov[i].seen >= cov[i - 1].seen);
  assert.ok(cov[0].seen / cov[0].total < 0.2);
  assert.ok(cov[4].seen / cov[4].total > 0.9);
});

// ---- agreement with the Python model (python/wm/tiny_game.py) -----------------------------------------------------------
// UPDATE_FIXTURES=1 writes python/tests/fixtures/tiny_game.json; otherwise the file must match what this port computes now.
const FIXTURE = new URL("../python/tests/fixtures/tiny_game.json", import.meta.url);
function checkFixture(data: unknown) {
  const json = JSON.stringify(data);
  if (process.env.UPDATE_FIXTURES) {
    mkdirSync(new URL(".", FIXTURE), { recursive: true });
    writeFileSync(FIXTURE, json + "\n");
    return;
  }
  assert.ok(existsSync(FIXTURE), "missing fixture: run with UPDATE_FIXTURES=1");
  assert.deepEqual(JSON.parse(readFileSync(FIXTURE, "utf8")), JSON.parse(json), "fixture is stale: run with UPDATE_FIXTURES=1");
}

test("fixture for the Python model: game steps, tokens and a trained table", () => {
  const states = [START, { px: 0, py: 0, coin: 1, clock: 3 }, { px: 4, py: 0, coin: 0, clock: 6 }, { px: 1, py: 1, coin: 4, clock: 9 }, { px: 5, py: 2, coin: 3, clock: 2 }];
  const steps = states.flatMap((s) => ([0, 1, 2, 3, 4] as Action[]).map((a) => ({ state: s, action: a, next: step(s, a) })));
  const play = record(300);
  const g = train(play);
  const queries = play.slice(0, 60).map((t) => ({ tokens: encode(render(t.before), g.cb), action: t.action }));
  queries.push({ tokens: encode(render({ px: 5, py: 3, coin: 2, clock: 0 }), g.cb), action: 2 as Action });
  checkFixture({
    steps,
    frames: states.map((s) => ({ state: s, frame: render(s) })),
    play,
    patterns: g.cb.patterns,
    predictions: queries.map((q) => ({ ...q, ...predict(g, q.tokens, q.action) })),
    decoded: queries.slice(0, 10).map((q) => ({ tokens: q.tokens, frame: decode(q.tokens, g.cb) })),
    coverage: coverage(g),
  });
});
