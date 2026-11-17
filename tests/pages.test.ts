/**
 * Page conventions that are easy to break by hand: every display equation shows its physical picture (`Pictured`,
 * never a bare `Eq`).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const PAGES = new URL("../src/pages/", import.meta.url).pathname;
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") && !p.endsWith("kit.tsx") ? [p] : [];
  });

test("every display equation on a page is Pictured (an equation beside its physical picture)", () => {
  const bare = files(PAGES).flatMap((f) =>
    readFileSync(f, "utf8")
      .split("\n")
      .map((line, i) => (/<Eq[\s>]/.test(line) ? `${f.slice(PAGES.length)}:${i + 1}` : null))
      .filter((x): x is string => x !== null),
  );
  assert.deepEqual(bare, [], "use <Pictured tex=… caption=…>{picture}</Pictured> instead of <Eq>");
});
