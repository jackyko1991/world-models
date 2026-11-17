/**
 * Building blocks for the Concepts and Coding Skills pages, in Polyphonizer's and Tensorizer's shape: a sticky table
 * of contents on the left, a title and introduction, then numbered section cards. Text is always a
 * [English, Traditional Chinese] pair (`L`).
 *
 * Pages still being written use `Draft` (Clifford's rule): each section shows its learning question, the visual it
 * will be built around and what it will cover, so the outline can be read and changed before the text is written.
 */
import { javascript } from "@codemirror/lang-javascript";
import { CodeBlock, go, PageToc, plainText, RichText, Tex, useLang } from "@learnkit/web";
import { isValidElement, useEffect, type ReactElement, type ReactNode } from "react";
import { HISTORY } from "../history.ts";
import type { L } from "../strings.ts";

export type { L };

/** The main scroll area (Shell's scrollId). */
export const SCROLL = "wm-scroll";

export interface SectionInfo {
  /** element id is `<page id>-<section id>`; deep link #/<page>/<tab>/<section id> */
  id: string;
  title: L;
}

/** A whole page: table of contents, title, introduction, then the sections (children). */
export function Page({
  id,
  title,
  intro,
  sections,
  focus,
  overline,
  children,
}: {
  id: string;
  title: L;
  intro: L;
  sections: SectionInfo[];
  focus?: string | null;
  overline?: L;
  children: ReactNode;
}) {
  const { pick } = useLang();
  useEffect(() => {
    if (focus) requestAnimationFrame(() => document.getElementById(`${id}-${focus}`)?.scrollIntoView({ block: "start" }));
  }, [focus, id]);
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 pt-6 pb-16 sm:px-5" data-testid={`page-${id}`}>
      <PageToc
        scrollRoot={SCROLL}
        title={pick(["On this page", "本頁內容"])}
        className="top-6"
        items={sections.map((s, i) => ({ id: `${id}-${s.id}`, label: pick(s.title), mark: i + 1 }))}
      />
      <article className="min-w-0 max-w-4xl flex-1 space-y-8">
        <header>
          {overline && <p className="text-sm font-medium text-(--lk-accent)">{pick(overline)}</p>}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            <RichText text={pick(title)} />
          </h1>
          <p className="mt-3 text-gray-600">
            <RichText text={pick(intro)} />
          </p>
        </header>
        {children}
      </article>
    </div>
  );
}

/** One numbered section card. `page` and `id` must match an entry of the Page's `sections`. */
export function Section({ page, id, n, title, children }: { page: string; id: string; n: number; title: L; children: ReactNode }) {
  const { pick } = useLang();
  return (
    <section id={`${page}-${id}`} className="scroll-mt-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-6" data-testid="page-section">
      <h2 className="flex items-baseline gap-3 text-lg font-semibold text-gray-900">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--lk-accent) text-sm text-white">{n}</span>
        <RichText text={pick(title)} />
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

/** A bulleted list of RichText items. */
export function List({ items }: { items: readonly L[] }) {
  const { pick } = useLang();
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((it, i) => (
        // a long inline equation scrolls instead of widening the page on phones
        <li key={i} className="overflow-x-auto">
          <RichText text={pick(it)} />
        </li>
      ))}
    </ul>
  );
}

/** A paragraph (RichText: `code`, **bold**, *italic*, $maths$, [links](https://…)). */
export function P({ t }: { t: L }) {
  const { pick } = useLang();
  return (
    <p>
      <RichText text={pick(t)} />
    </p>
  );
}

/** A display equation (KaTeX), centred; long ones wrap at \\qquad and shrink to fit. */
export function Eq({ tex }: { tex: string }) {
  return (
    <div className="overflow-x-auto py-1 text-center">
      <Tex tex={tex} display />
    </div>
  );
}

const TS = javascript({ typescript: true });

/** Read-only TypeScript, syntax-coloured: usually an excerpt of a file in src/models/, titled with its path. */
export function Code({ code, title, note }: { code: string; title?: string; note?: L }) {
  const { pick } = useLang();
  return (
    <div className="space-y-1">
      <CodeBlock code={code} title={title} language={TS} />
      {note && (
        <p className="text-[11px] text-gray-500">
          <RichText text={pick(note)} />
        </p>
      )}
    </div>
  );
}

/** A figure (inline SVG, a canvas, or an interactive demo) with a caption. Wide content scrolls inside it on phones. */
export function Figure({ caption, children }: { caption: L; children: ReactNode }) {
  const { pick } = useLang();
  return (
    <figure className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
      <div className="flex justify-center overflow-x-auto">{children}</div>
      <figcaption className="mt-2 text-center text-xs text-gray-500">
        <RichText text={pick(caption)} />
      </figcaption>
    </figure>
  );
}

/** A table. Cells are RichText, or an element. */
export function Table({ head, rows }: { head: readonly L[]; rows: (readonly (L | ReactElement)[])[] }) {
  const { pick } = useLang();
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold">
                <RichText text={pick(h)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {isValidElement(c) ? c : <RichText text={pick(c as L)} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Sources at the end of a section (http(s) links). */
export function Sources({ items }: { items: { label: string; url: string }[] }) {
  const { pick } = useLang();
  return (
    <div className="mt-2 border-t border-gray-100 pt-3">
      <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">{pick(["Sources", "資料來源"])}</p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {items.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="text-(--lk-accent) hover:underline">
              {s.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Chips linking to History cards (ids in history.ts; an unknown id throws, so a typo fails loudly). */
export function HistoryLinks({ ids }: { ids: string[] }) {
  const { pick } = useLang();
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-gray-500">{pick(["In the History:", "歷史中的相關卡片："])}</span>
      {ids.map((id) => {
        const card = HISTORY.find((c) => c.id === id);
        if (!card) throw new Error(`HistoryLinks: no history card ${id}`);
        return (
          <button key={id} onClick={() => go("concept", "history", id)} className="rounded-full bg-amber-50 px-2.5 py-1 text-(--lk-accent) hover:bg-amber-100">
            {card.year} · {plainText(pick(card.title))}
          </button>
        );
      })}
    </p>
  );
}

/** How firm a claim is (Concepts ▸ Scope): established (peer-reviewed, replicated), demonstrated (shown, not settled), speculative. */
export function Evidence({ level }: { level: "established" | "demonstrated" | "speculative" }) {
  const { pick } = useLang();
  const look = {
    established: ["bg-emerald-50 text-emerald-800 ring-emerald-200", ["Established", "已確立"]],
    demonstrated: ["bg-sky-50 text-sky-800 ring-sky-200", ["Demonstrated", "已展示"]],
    speculative: ["bg-gray-100 text-gray-700 ring-gray-300", ["Speculative", "推測"]],
  } as const;
  const [cls, label] = look[level];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>{pick(label)}</span>;
}

/** A labelled range slider for demos. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v: number) => String(v),
}: {
  label: L;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const { pick } = useLang();
  return (
    <label className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
      <span className="min-w-24">
        <RichText text={pick(label)} />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 accent-(--lk-accent) sm:w-56"
      />
      <span className="w-12 font-mono tabular-nums">{format(value)}</span>
    </label>
  );
}

/** A small button for demos (step, reset, play). */
export function DemoButton({ onClick, children, active = false }: { onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${active ? "border-(--lk-accent) bg-(--lk-accent) text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
    >
      {children}
    </button>
  );
}

const CALLOUT = {
  tip: "border-amber-200 bg-amber-50/60 text-amber-950",
  note: "border-sky-200 bg-sky-50/60 text-sky-950",
  warn: "border-amber-300 bg-amber-50 text-amber-950",
} as const;

/** A highlighted box: a tip, a side note, or a warning. */
export function Callout({ kind = "note", title, children }: { kind?: keyof typeof CALLOUT; title?: L; children: ReactNode }) {
  const { pick } = useLang();
  return (
    <aside className={`rounded-lg border px-4 py-3 ${CALLOUT[kind]}`}>
      {title && (
        <p className="mb-1 text-sm font-semibold">
          <RichText text={pick(title)} />
        </p>
      )}
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </aside>
  );
}

/** A link to another page of the site, e.g. <SiteLink to={["concept", "history"]} label={…} />. */
export function SiteLink({ to, label }: { to: [string, string?, string?]; label: L }) {
  const { pick } = useLang();
  return (
    <button onClick={() => go(...to)} className="font-medium text-(--lk-accent) hover:underline">
      {pick(label)} →
    </button>
  );
}

/** One section of a page still being written. */
export interface DraftSection extends SectionInfo {
  /** the question the section answers for the reader */
  question: L;
  /** the figure or interactive demo the section is built around */
  visual: L;
  /** what the text will cover */
  plan: L[];
  /** History cards the section will link back to (ids in history.ts; tests check they exist) */
  history?: string[];
}

/** One page still being written: an outline of sections. */
export interface DraftOutline {
  id: string;
  title: L;
  intro: L;
  overline?: L;
  sections: DraftSection[];
}

const LABEL = "text-[11px] font-semibold tracking-wide text-amber-700 uppercase";

/** Renders a `DraftOutline`: the page's real frame (contents, numbered sections) with each section's plan. */
export function Draft({ outline, focus }: { outline: DraftOutline; focus?: string | null }) {
  const { pick } = useLang();
  const { id, sections } = outline;
  return (
    <Page id={id} title={outline.title} intro={outline.intro} sections={sections} focus={focus} overline={outline.overline}>
      <Callout kind="warn" title={["Planned page", "規劃中的頁面"]}>
        <p>
          {pick([
            "This page is planned but not written yet. Each section below gives its question, the visual it will be built around, and what it will cover.",
            "這一頁已規劃、尚未撰寫。下面每一節列出它要回答的問題、將圍繞的圖像或互動示範，以及將涵蓋的內容。",
          ])}{" "}
          <SiteLink to={["concept", "history"]} label={["Read the History meanwhile", "先讀讀歷史"]} />
        </p>
      </Callout>
      {sections.map((s, i) => (
        <Section key={s.id} page={id} id={s.id} n={i + 1} title={s.title}>
          <PlannedBody s={s} />
        </Section>
      ))}
    </Page>
  );
}

/** The plan of one section still being written (its question, visual and what it will cover). */
export function PlannedBody({ s }: { s: DraftSection }) {
  const { pick } = useLang();
  return (
    <>
      <p className="text-base font-medium text-gray-900">
        <RichText text={pick(s.question)} />
      </p>
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/40 px-3 py-2">
        <p className={LABEL}>{pick(["Visual", "圖像與示範"])}</p>
        <p className="mt-1">
          <RichText text={pick(s.visual)} />
        </p>
      </div>
      <div>
        <p className={LABEL}>{pick(["Will cover", "將涵蓋"])}</p>
        <List items={s.plan} />
      </div>
      {s.history && <HistoryLinks ids={s.history} />}
    </>
  );
}

/** A section of a written page that is not written yet: its plan from the outline, in the page's frame. */
export function PlannedSection({ page, n, outline, id }: { page: string; n: number; outline: DraftOutline; id: string }) {
  const s = outline.sections.find((x) => x.id === id);
  if (!s) throw new Error(`PlannedSection: no section ${id} in ${outline.id}`);
  return (
    <Section page={page} id={s.id} n={n} title={s.title}>
      <PlannedBody s={s} />
    </Section>
  );
}
