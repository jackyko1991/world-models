/**
 * The TypeScript ports write python/tests/fixtures/<model>.json (UPDATE_FIXTURES=1) for the Python tests to match.
 * Checking a fixture is current compares numbers within a relative 1e-12, not the file's text: the last bits of
 * exp, sin or a long sum differ between machines (CI's x64 Linux and an arm64 Mac), which says nothing about the model.
 */
import assert from "node:assert/strict";

const close = (a: number, b: number) => a === b || Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));

function diff(actual: unknown, expected: unknown, at: string): string | null {
  if (typeof actual === "number" && typeof expected === "number")
    return close(actual, expected) ? null : `${at}: ${actual} ≠ ${expected}`;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return `${at}: length ${actual.length} ≠ ${expected.length}`;
    for (let i = 0; i < actual.length; i++) {
      const d = diff(actual[i], expected[i], `${at}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (actual && expected && typeof actual === "object" && typeof expected === "object") {
    const ka = Object.keys(actual).sort(), kb = Object.keys(expected).sort();
    if (ka.join() !== kb.join()) return `${at}: keys ${ka.join(",")} ≠ ${kb.join(",")}`;
    for (const k of ka) {
      const d = diff((actual as Record<string, unknown>)[k], (expected as Record<string, unknown>)[k], `${at}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return Object.is(actual, expected) ? null : `${at}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`;
}

/** The fixture on disk equals what the port computes now, numbers within a relative 1e-12. */
export function assertClose(onDisk: unknown, now: unknown, message: string): void {
  const d = diff(onDisk, JSON.parse(JSON.stringify(now)), "$");
  assert.equal(d, null, `${message}\n${d}`);
}
