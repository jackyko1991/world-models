/**
 * Further reading ▸ Papers & code (#/reading/papers[/<group>]): "Where to start", then the papers grouped as the
 * Concepts pages are, then courses and code. The entries are data in src/reading.ts; each card has a one-line pitch,
 * its link, and a link to the page of this book it goes with.
 */
import { RichText, useLang } from "@learnkit/web";
import { READING_OUTLINE } from "../../curriculum.ts";
import { READING_GROUPS, READINGS, START, type Reading, type ReadingKind } from "../../reading.ts";
import { Page, Section, SiteLink, type L, type SectionInfo } from "../kit.tsx";

const PAGE = "papers";
const START_SECTION = READING_OUTLINE.sections[0];
const SECTIONS: SectionInfo[] = [{ id: START_SECTION.id, title: START_SECTION.title }, ...READING_GROUPS];

const KIND: Record<ReadingKind, { label: L; cls: string }> = {
  paper: { label: ["Paper", "論文"], cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  essay: { label: ["Essay / post", "文章"], cls: "bg-gray-100 text-gray-700 ring-gray-300" },
  course: { label: ["Course / book", "課程／書"], cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  code: { label: ["Code", "程式碼"], cls: "bg-sky-50 text-sky-800 ring-sky-200" },
};

/** the title of the page of this book an entry goes with, for its link */
const AREA: Record<string, L> = { concept: ["Concepts", "概念"], skills: ["Coding Skills", "程式技巧"], reading: ["Further reading", "延伸閱讀"] };

function Card({ r, why }: { r: Reading; why?: L }) {
  const { pick } = useLang();
  const kind = KIND[r.kind];
  return (
    <li className="rounded-lg border border-gray-200 bg-white px-4 py-3" data-testid={`reading-${r.id}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${kind.cls}`}>{pick(kind.label)}</span>
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold break-words text-(--lk-accent) hover:underline" lang="en">
          {r.title} ↗
        </a>
      </div>
      <p className="mt-0.5 text-xs text-gray-500" lang="en">
        {r.authors} · {r.year}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
        <RichText text={pick(why ?? r.pitch)} />
      </p>
      <p className="mt-1 text-xs">
        <span className="text-gray-500">{pick(["Goes with: ", "對應頁面："])}</span>
        <SiteLink to={r.page} label={pageLabel(r.page)} />
      </p>
    </li>
  );
}

/** "Concepts ▸ Planning and imagination" style label for a page target, from the group titles and area names */
function pageLabel([area, tab]: Reading["page"]): L {
  const a = AREA[area] ?? [area, area];
  const g = READING_GROUPS.find((x) => x.id === tab);
  const t: L = area === "concept" && g ? g.title : TAB_TITLES[`${area}/${tab}`] ?? [tab, tab];
  return [`${a[0]} ▸ ${t[0]}`, `${a[1]} ▸ ${t[1]}`];
}

/** titles of tabs outside Concepts that entries link to */
const TAB_TITLES: Record<string, L> = {
  "skills/planning": ["Planning in code", "以程式碼規劃"],
  "skills/rendering": ["Rays and splats", "光線與潑濺"],
  "skills/checking": ["Checking a world model", "檢驗世界模型"],
  "skills/models": ["States, models and rollouts", "狀態、模型與推演"],
};

export default function PapersReading({ section }: { section: string | null }) {
  const { pick } = useLang();
  const byId = new Map(READINGS.map((r) => [r.id, r]));
  return (
    <Page id={PAGE} title={READING_OUTLINE.title} intro={READING_OUTLINE.intro} sections={SECTIONS} focus={section} overline={READING_OUTLINE.overline}>
      <Section page={PAGE} id={START_SECTION.id} n={1} title={START_SECTION.title}>
        <p>
          {pick([
            "Five entries, in this order: the reason to want a model, the paper that started the current wave, the mature RL form, the turn to generated worlds, and the 3D strand. Everything else on this page is grouped by the Concepts page it goes with.",
            "五個條目，依這個順序：為什麼需要模型、開啟這一波研究的論文、成熟的強化學習形態、轉向生成世界，以及三維這條線。本頁其餘條目依對應的概念頁面分組。",
          ])}
        </p>
        <ol className="space-y-3">
          {START.map((s) => {
            const r = byId.get(s.id);
            if (!r) throw new Error(`papers: no reading ${s.id}`);
            return <Card key={s.id} r={r} why={s.why} />;
          })}
        </ol>
      </Section>
      {READING_GROUPS.map((g, i) => (
        <Section key={g.id} page={PAGE} id={g.id} n={i + 2} title={g.title}>
          <ul className="space-y-3">
            {READINGS.filter((r) => r.group === g.id).map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </ul>
        </Section>
      ))}
    </Page>
  );
}
