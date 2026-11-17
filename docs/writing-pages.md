# Writing a page of World Models

World Models / 世界模型 is a static, bilingual (en + zh-Hant) explorable on machine-learning world models, built on
learnkit (`vendor/learnkit/web/src`, imported as `@learnkit/web`). Read `handoff/plan.md` for the whole book; this note
is the contract every page follows. Several pages are written at the same time, so **stay inside your own files**.

## Where things go
- **Page**: `src/pages/<area>/<tab id>.tsx` (areas: `concept`, `skills`, `reading`), default export
  `({ section }: { section: string | null }) => …`. App picks it up automatically (no route edits); until the file
  exists the tab shows its outline from `src/curriculum.ts`.
  Two pages are frames with one file per section, so two writers never share a file:
  `concept/scenes.tsx` → `concept/scenes/{Volume,Nerf,Gaussians,Toward}.tsx`, and `skills/rendering.tsx` →
  `skills/rendering/{Rays,Splat}.tsx`. Each section file default-exports `({ n }: { n: number })` and renders one
  `<Section page="scenes" id="<section id>" n={n} …>`; keep those props.
- **Model** (the maths behind a demo): `src/models/<name>.ts`, pure functions, no React, no DOM. Randomness only from
  `src/models/rng.ts` (`rng(seed)`, `gaussian`, `randInt`), so every run is reproducible.
- **Test**: `tests/<name>.test.ts` with `node:test` + `node:assert/strict`; check real numerical properties (energy,
  convergence to a known optimum, a reference value, a monotone trend), not just "it runs".
- **Demo** (interactive figure): `src/demos/<Name>.tsx`. SVG or canvas 2D only; **no new npm packages, no WebGL**.
- **Precomputed weights/assets** (latent maps, a tiny NeRF, splat scenes, training snapshots): a script
  `scripts/<name>.py` run with `pixi run -e train python scripts/<name>.py` (numpy and torch are there; CPU is fine),
  fixed seed, writing `public/models/<name>.json` (or `.bin`), each file **≤ 2 MB**. The scene is procedural (made by
  the script), so the licence is clean. Load in the browser with
  ``fetch(`${import.meta.env.BASE_URL}models/<name>.json`)``; tests read the same file from `public/models/`, and one
  test should check the TS forward pass reproduces numbers the script saved alongside the weights.

## Do not edit (shared; ask in your report instead)
`src/App.tsx`, `src/pages/kit.tsx`, `src/strings.ts`, `src/curriculum.ts`, `src/history.ts`, `src/models/rng.ts`,
`package.json`, `pixi.toml`, `src/index.css`, `public/history/`, and every file another writer owns. Need a helper the
kit lacks? Put it in your own file. Do not commit.

## Page shape (see `src/pages/kit.tsx`)
`Page` (contents sidebar, title, intro) → numbered `Section`s. Inside a section: `P` (RichText paragraph: `**bold**`,
`*italic*`, `` `code` ``, `$maths$`, bare https URLs; markdown `[text](url)` links are **not** rendered, use `SiteLink` for links within the book), `Eq` (display maths), `List`, `Figure` (wrap every demo),
`Code` (read-only TypeScript, titled with its path; show **real excerpts** of your `src/models/` files, not paraphrases),
`Table`, `Callout`, `Sources`, `HistoryLinks` (chips to History cards; ids in `src/history.ts`), `SiteLink`
(`to={["concept", "planning", "cem"]}`), `Evidence` (established / demonstrated / speculative), `Slider`, `DemoButton`.
- Keep the **section ids and order** of your page's outline in `src/curriculum.ts` (they are deep links,
  `#/<area>/<tab>/<section id>`); `Page`'s `sections` prop can be the outline's sections. Titles may be refined.
- Every section answers its outline **question**, is built around its **visual**, and covers its plan. Open with
  the intuition, then the maths, then the demo, then what to notice. Short paragraphs; define every symbol.
- Each section ends with `Sources` (papers via arXiv/DOI, official blogs; https) and `HistoryLinks` where a card fits.

## Text
- Every string is `[English, Traditional Chinese]` (type `L` from `src/strings.ts`). British spelling (colour,
  optimisation). zh-Hant uses Taiwan usage (程式, 資料, 演算法, 模型, 向量, 矩陣). Keep standard English
  model names (NeRF, Dreamer, Genie) in both languages.
- Facts must be checkable: cite them. For anything after 2023, verify by web search against the primary source
  (paper, DeepMind/World Labs/NVIDIA/OpenAI/Meta blog) and say "as of November 2026" where it may change. Never invent
  numbers, dates, quotes or results; if unsure, leave it out and mention it in your report.
- Toy demos are honest about being toys: a caption says what is simplified.

## Demos
- Work at 320 px width: SVG with a `viewBox` and `className="h-auto w-full max-w-[…]"`, canvases scaled by CSS;
  nothing wider than the page. Controls are real `<button>`/`<input>` elements, so they work from the keyboard.
- Animation only on request (a ▶ button) or brief; respect `prefers-reduced-motion`. Cancel `requestAnimationFrame`
  and timers on unmount.
- Colours: amber is the site accent (`#b45309`); a "true" thing in gray-700, a "predicted/model" thing in amber,
  a second model in sky (`#0284c7`). Same meaning everywhere.
- Heavy work (rendering a NeRF frame) stays responsive: low resolution, work split across animation frames.

## Check before you report
- `pixi run typecheck`: fix every error in your files (others' files may be mid-edit; ignore theirs).
- `pixi run node --test tests/<yours>.test.ts` passes.
- Do not run `vite build`, `vite`, or `npm install` (other writers share `dist/`, the ports and `node_modules`).
- Report: files written, what each demo does, tests and their results, asset commands (to become pixi tasks), facts
  you could not verify, and anything you need changed in a shared file.
