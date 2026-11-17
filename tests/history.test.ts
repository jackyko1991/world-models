/**
 * The History timeline and the curriculum outline: ids are unique, every card belongs to an era and every era has
 * cards, all text exists in both languages, every card cites at least one http(s) source, and every History card a
 * planned section points to exists. `LINKS=1 npm test` also fetches every source URL (needs the network).
 */
import assert from "node:assert/strict";
import katex from "katex";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { CONCEPT_OUTLINES, READING_OUTLINE, SKILLS_OUTLINES } from "../src/curriculum.ts";
import { READINGS } from "../src/reading.ts";
import { ERAS, HISTORY } from "../src/history.ts";
import { STRINGS } from "../src/strings.ts";

const LANGS = 2;
const filled = (t: readonly string[], where: string) => {
  assert.equal(t.length, LANGS, `${where}: expected ${LANGS} languages`);
  t.forEach((s, i) => assert.ok(s.trim().length > 0, `${where}: language ${i} is empty`));
};
const unique = (ids: string[], what: string) => {
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dup, [], `duplicate ${what} ids`);
};

test("eras and cards have unique ids", () => {
  unique(ERAS.map((e) => e.id), "era");
  unique(HISTORY.map((c) => c.id), "card");
});

test("every card is in an era, and every era has a card", () => {
  const eras = new Set(ERAS.map((e) => e.id));
  for (const c of HISTORY) assert.ok(eras.has(c.era), `${c.id}: unknown era ${c.era}`);
  for (const e of ERAS) assert.ok(HISTORY.some((c) => c.era === e.id), `era ${e.id} has no cards`);
});

test("cards run in era order", () => {
  const order = ERAS.map((e) => e.id);
  const seen = HISTORY.map((c) => order.indexOf(c.era));
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b), "cards are grouped by era, in the eras' order");
});

test("all history text is in both languages", () => {
  for (const e of ERAS) {
    filled(e.title, `era ${e.id} title`);
    if (e.intro) filled(e.intro, `era ${e.id} intro`);
    if (e.label) filled(e.label, `era ${e.id} label`);
    if (e.short) filled(e.short, `era ${e.id} short`);
  }
  for (const c of HISTORY) {
    filled(c.title, `${c.id} title`);
    assert.ok(c.body.length > 0, `${c.id}: no body`);
    c.body.forEach((p, i) => filled(p, `${c.id} paragraph ${i + 1}`));
    assert.match(c.year, /\b\d{4}\b/, `${c.id}: year`);
    if (c.image) filled(c.image.alt, `${c.id} image alt`);
  }
});

test("every card cites an http(s) source", () => {
  for (const c of HISTORY) {
    assert.ok(c.sources.length > 0, `${c.id}: no sources`);
    for (const s of c.sources) {
      assert.ok(s.label.trim(), `${c.id}: a source without a label`);
      assert.match(s.url, /^https?:\/\//, `${c.id}: ${s.url}`);
    }
  }
});

test("curriculum: unique ids, both languages, History links resolve", () => {
  const cards = new Set(HISTORY.map((c) => c.id));
  for (const group of [CONCEPT_OUTLINES, SKILLS_OUTLINES, [READING_OUTLINE]]) {
    unique(group.map((o) => o.id), "page");
    for (const o of group) {
      filled(o.title, `${o.id} title`);
      filled(o.intro, `${o.id} intro`);
      unique(o.sections.map((s) => s.id), `${o.id} section`);
      for (const s of o.sections) {
        const at = `${o.id}/${s.id}`;
        filled(s.title, `${at} title`);
        filled(s.question, `${at} question`);
        filled(s.visual, `${at} visual`);
        assert.ok(s.plan.length > 0, `${at}: empty plan`);
        s.plan.forEach((p, i) => filled(p, `${at} plan ${i + 1}`));
        for (const h of s.history ?? []) assert.ok(cards.has(h), `${at}: no History card ${h}`);
      }
    }
  }
});

test("every card has a picture that exists, captioned in both languages", () => {
  for (const c of HISTORY) {
    assert.ok(c.image, `${c.id}: no image`);
    assert.ok(existsSync(new URL(`../public/${c.image.src}`, import.meta.url)), `${c.id}: missing public/${c.image.src}`);
    filled(c.image.alt, `${c.id} image caption`);
    assert.notDeepEqual(c.image.alt, c.title, `${c.id}: caption is only the title (add it to DIAGRAMS)`);
  }
});

test("every $maths$ in the text renders (RichText knows only single $, not $$)", () => {
  const texts: [string, string][] = [];
  const add = (where: string, t: readonly string[]) => t.forEach((s) => texts.push([where, s]));
  for (const c of HISTORY) [c.title, ...c.body, ...(c.image ? [c.image.alt] : [])].forEach((t) => add(c.id, t));
  for (const o of [...CONCEPT_OUTLINES, ...SKILLS_OUTLINES, READING_OUTLINE])
    for (const s of o.sections) [s.title, s.question, s.visual, ...s.plan].forEach((t) => add(`${o.id}/${s.id}`, t));
  for (const r of READINGS) add(`reading ${r.id}`, r.pitch);
  for (const [where, s] of texts) {
    assert.ok(!s.includes("$$"), `${where}: $$ is not supported, use $…$ (or Eq on a page)`);
    const plain = s.replace(/\\\$/g, "");
    assert.equal((plain.match(/\$/g) ?? []).length % 2, 0, `${where}: unbalanced $ in ${s.slice(0, 60)}`);
    for (const m of plain.matchAll(/\$(.+?)\$/gs)) {
      assert.doesNotThrow(() => katex.renderToString(m[1], { throwOnError: true }), `${where}: KaTeX cannot read ${m[1]}`);
    }
  }
});

test("UI strings are in both languages", () => {
  for (const [k, v] of Object.entries(STRINGS)) filled(v, `string ${k}`);
});

test("source links answer", { skip: !process.env.LINKS && "set LINKS=1 to fetch every source" }, async () => {
  const urls = [...new Set(HISTORY.flatMap((c) => c.sources.map((s) => s.url)))];
  const bad: string[] = [];
  await Promise.all(
    urls.map(async (url) => {
      try {
        const r = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (link check)" }, signal: AbortSignal.timeout(20000) });
        await r.body?.cancel(); // an unread body keeps the socket (and the test run) alive
        // 401/403/429: the page exists but turns away scripts (publishers, X); report only clear failures
        if (r.status === 404 || r.status === 410 || r.status >= 500) bad.push(`${r.status} ${url}`);
      } catch (e) {
        bad.push(`${(e as Error).name} ${url}`);
      }
    }),
  );
  assert.deepEqual(bad.sort(), [], "broken source links");
});
