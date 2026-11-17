/**
 * Cut a real excerpt out of a source file imported with Vite's `?raw`: the lines between `// <name>-start` and
 * `// <name>-end` (markers excluded), so the code shown on a page is the code the demo runs.
 */
export function excerpt(source: string, name: string): string {
  const lines = source.split("\n");
  const a = lines.findIndex((l) => l.trim() === `// ${name}-start`);
  const b = lines.findIndex((l) => l.trim() === `// ${name}-end`);
  if (a < 0 || b <= a) throw new Error(`excerpt: no ${name}-start … ${name}-end markers`);
  return lines.slice(a + 1, b).join("\n");
}
