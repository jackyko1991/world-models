/**
 * Further reading ▸ Papers & code (src/reading.ts): unique ids, both languages, https links to primary sources, every
 * group used, "Where to start" picks real entries, and every page target names a real tab and section of the book
 * (compared with src/curriculum.ts). `LINKS=1 npm test` also fetches every URL (needs the network).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { CONCEPT_OUTLINES, READING_OUTLINE, SKILLS_OUTLINES } from "../src/curriculum.ts";
import { READING_GROUPS, READINGS, START } from "../src/reading.ts";

const filled = (t: readonly string[], where: string) => {
  assert.equal(t.length, 2, `${where}: expected 2 languages`);
  t.forEach((s, i) => assert.ok(s.trim().length > 0, `${where}: language ${i} is empty`));
};
const dups = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

test("ids are unique (entries and groups)", () => {
  assert.deepEqual(dups(READINGS.map((r) => r.id)), [], "duplicate reading ids");
  assert.deepEqual(dups(READING_GROUPS.map((g) => g.id)), [], "duplicate group ids");
  assert.deepEqual(dups(READINGS.map((r) => r.url)), [], "the same URL listed twice");
});

test("all text is in both languages, and the zh-Hant text is Chinese", () => {
  for (const g of READING_GROUPS) filled(g.title, `group ${g.id}`);
  for (const r of READINGS) {
    filled(r.pitch, `${r.id} pitch`);
    assert.ok(r.title.trim() && r.authors.trim(), `${r.id}: title and authors`);
    assert.match(r.pitch[1], /[一-鿿]/, `${r.id}: zh-Hant pitch has no Chinese`);
  }
  for (const s of START) {
    filled(s.why, `start ${s.id}`);
    assert.match(s.why[1], /[一-鿿]/, `start ${s.id}: zh-Hant has no Chinese`);
  }
});

test("links are https and point at a primary source", () => {
  for (const r of READINGS) {
    assert.match(r.url, /^https:\/\/[^\s]+$/, `${r.id}: ${r.url}`);
    if (r.kind === "code") assert.match(r.url, /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/, `${r.id}: code should link its repository`);
    if (r.url.includes("arxiv.org")) assert.match(r.url, /^https:\/\/arxiv\.org\/abs\/\d{4}\.\d{4,5}$/, `${r.id}: arXiv abs link`);
  }
});

test("years are plausible and kinds known", () => {
  for (const r of READINGS) {
    assert.ok(Number.isInteger(r.year) && r.year >= 1940 && r.year <= 2026, `${r.id}: year ${r.year}`);
    assert.ok(["paper", "course", "code", "essay"].includes(r.kind), `${r.id}: kind ${r.kind}`);
  }
});

test("every group has entries, every entry a known group; the page has the outline's start section", () => {
  const groups = new Set(READING_GROUPS.map((g) => g.id));
  for (const r of READINGS) assert.ok(groups.has(r.group), `${r.id}: unknown group ${r.group}`);
  for (const g of READING_GROUPS) assert.ok(READINGS.some((r) => r.group === g.id), `group ${g.id} is empty`);
  assert.equal(READING_OUTLINE.sections[0].id, "start");
  assert.ok(!groups.has("start" as never), "a group must not reuse the start section's id");
});

test("Where to start: three to five real, distinct entries", () => {
  const ids = new Set(READINGS.map((r) => r.id));
  assert.ok(START.length >= 3 && START.length <= 5, `${START.length} picks`);
  assert.deepEqual(dups(START.map((s) => s.id)), []);
  for (const s of START) assert.ok(ids.has(s.id), `start: no entry ${s.id}`);
});

test("required entries are present", () => {
  const ids = new Set(READINGS.map((r) => r.id));
  for (const id of ["ha-2018", "dreamer", "dreamerv3", "muzero", "pets", "lecun-2022", "i-jepa", "v-jepa-2", "genie", "gamengen", "diamond", "cosmos", "nerf", "instant-ngp", "3dgs", "sutton-barto", "survey-ding", "code-dreamerv3", "code-3dgs", "code-nerfstudio"])
    assert.ok(ids.has(id), `missing ${id}`);
});

test("page targets name a real tab and section of the book", () => {
  const pages: Record<string, Map<string, Set<string>>> = {
    concept: new Map(CONCEPT_OUTLINES.map((o) => [o.id, new Set(o.sections.map((s) => s.id))])),
    skills: new Map(SKILLS_OUTLINES.map((o) => [o.id, new Set(o.sections.map((s) => s.id))])),
    reading: new Map([[READING_OUTLINE.id, new Set([...READING_OUTLINE.sections.map((s) => s.id), ...READING_GROUPS.map((g) => g.id)])]]),
  };
  for (const r of READINGS) {
    const [area, tab, section] = r.page;
    const tabs = pages[area];
    assert.ok(tabs, `${r.id}: unknown area ${area}`);
    const sections = tabs.get(tab);
    assert.ok(sections, `${r.id}: no tab ${area}/${tab}`);
    if (section) assert.ok(sections.has(section), `${r.id}: no section ${area}/${tab}/${section}`);
  }
});

test("links answer", { skip: !process.env.LINKS && "set LINKS=1 to fetch every link" }, async () => {
  const bad: string[] = [];
  await Promise.all(
    READINGS.map(async ({ url }) => {
      try {
        const r = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (link check)" }, signal: AbortSignal.timeout(20000) });
        await r.body?.cancel();
        // 401/403/429: the page exists but turns away scripts (publishers); report only clear failures
        if (r.status === 404 || r.status === 410 || r.status >= 500) bad.push(`${r.status} ${url}`);
      } catch (e) {
        bad.push(`${(e as Error).name} ${url}`);
      }
    }),
  );
  assert.deepEqual(bad.sort(), [], "broken links");
});
