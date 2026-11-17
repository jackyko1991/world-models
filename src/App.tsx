import { go, READING_TABS, RichText, routeHash, SeriesPage, seriesText, Shell, Timeline, useLang, useRoute, type ShellPage } from "@learnkit/web";
import { Component, lazy, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { ERAS, HISTORY } from "./history.ts";
import { CONCEPT_OUTLINES, READING_OUTLINE, SKILLS_OUTLINES } from "./curriculum.ts";
import { Draft, SCROLL } from "./pages/kit.tsx";
import { STRINGS } from "./strings.ts";

const REPO_URL = "https://github.com/jackyko1991/world-models";
/** Concepts' sub-pages, History last (it is also the landing page while the others are planned) */
const CONCEPT_TABS = ["foundations", "representation", "planning", "generative", "scenes", "limits", "history"] as const;
const SKILLS_TABS = ["models", "planning", "checking", "rendering"] as const;
/** Further reading: papers & code, then the learnkit series (Code labs, Explorables) */
const READING = ["papers", "labs", "explorables"] as const;

const HistoryPage = historyPage(ERAS, HISTORY);

/**
 * Written pages: src/pages/<area>/<tab id>.tsx with a default export ({ section }) => page. A tab without its file shows
 * its planned outline from curriculum.ts, so a page goes live by adding its file (no change here).
 */
type PageView = ComponentType<{ section: string | null }>;
const pagesIn = (files: Record<string, () => Promise<{ default: PageView }>>) =>
  Object.fromEntries(Object.entries(files).map(([path, load]) => [path.replace(/^.*\/(.+)\.tsx$/, "$1"), lazy(load)]));
const WRITTEN: Record<string, Record<string, PageView>> = {
  concept: pagesIn(import.meta.glob<{ default: PageView }>("./pages/concept/*.tsx")),
  skills: pagesIn(import.meta.glob<{ default: PageView }>("./pages/skills/*.tsx")),
  reading: pagesIn(import.meta.glob<{ default: PageView }>("./pages/reading/*.tsx")),
};

export default function App() {
  const { t, lang } = useLang();
  const route = useRoute("concept");
  const pages: ShellPage[] = [
    {
      id: "concept",
      label: t("page.concept"),
      tabs: CONCEPT_TABS.map((id) => ({ id, label: t(`tab.${id}`) })),
      defaultTab: "history",
    },
    {
      id: "skills",
      label: t("page.skills"),
      tabs: SKILLS_TABS.map((id) => ({ id, label: t(`skills.${id}`) })),
      defaultTab: SKILLS_TABS[0],
    },
    {
      id: "reading",
      label: t("page.reading"),
      tabs: READING.map((id) => ({ id, label: id === "papers" ? t(`reading.${id}`) : seriesText(READING_TABS[id], lang) })),
      defaultTab: READING[0],
    },
  ];
  const tabOf = <T extends readonly string[]>(tabs: T, fallback: T[number] = tabs[0]) =>
    tabs.includes(route.tab as never) ? route.tab! : fallback;
  const reading = tabOf(READING);
  return (
    <Shell
      brand={{
        name: lang === "zh-Hant" ? "世界模型" : "World Models",
        tagline: t("tagline"),
        logo: `${import.meta.env.BASE_URL}favicon.svg`,
        home: () => go("concept", "history"),
      }}
      pages={pages}
      route={route}
      scrollId={SCROLL}
      footer={
        <>
          <a
            href="https://buymeacoffee.com/jackyko1991"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-yellow-300 px-2.5 py-0.5 font-medium text-gray-900 hover:bg-yellow-400"
          >
            ☕ {t("coffee")}
          </a>
          <span>{t("footer.licence")}</span>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-gray-900">
            GitHub
          </a>
        </>
      }
    >
      <PageBoundary at={`${route.page}/${route.tab ?? ""}`}>
        <Suspense fallback={<p className="p-10 text-center text-sm text-gray-500">…</p>}>
          {route.page === "skills" ? (
            <Outline area="skills" outlines={SKILLS_OUTLINES} id={tabOf(SKILLS_TABS)} section={route.section} />
          ) : route.page === "reading" ? (
            reading === "labs" || reading === "explorables" ? (
              <SeriesPage
                key={reading}
                kind={reading === "labs" ? "lab" : "explorable"}
                current="world-models"
                lang={lang}
                onOther={() => go("reading", reading === "labs" ? "explorables" : "labs")}
              />
            ) : (
              <Outline area="reading" outlines={[READING_OUTLINE]} id="papers" section={route.section} />
            )
          ) : tabOf(CONCEPT_TABS, "history") === "history" ? (
            <HistoryPage section={route.section} />
          ) : (
            <Outline area="concept" outlines={CONCEPT_OUTLINES} id={tabOf(CONCEPT_TABS)} section={route.section} />
          )}
        </Suspense>
      </PageBoundary>
    </Shell>
  );
}

/** a written page when its file exists, else its planned outline from curriculum.ts */
function Outline({ area, outlines, id, section }: { area: string; outlines: typeof CONCEPT_OUTLINES; id: string; section: string | null }) {
  const View = WRITTEN[area]?.[id];
  if (View) return <View key={id} section={section} />;
  const outline = outlines.find((o) => o.id === id) ?? outlines[0];
  return <Draft key={outline.id} outline={outline} focus={section} />;
}

/** Concepts ▸ History: learnkit's Timeline with this site's eras and cards (loaded with them) */
function historyPage(eras: import("@learnkit/web").Era[], cards: import("@learnkit/web").TimelineCard[]) {
  return function HistoryPage({ section }: { section: string | null }) {
    const { t } = useLang();
    return (
      <div data-testid="history-page">
        <Timeline
          eras={eras}
          cards={cards}
          scrollRoot={SCROLL}
          focus={section}
          labels={{ contents: STRINGS.timeline, sources: STRINGS.sources, open: STRINGS["timeline.open"] }}
          // keep the address shareable without a new history entry (no hashchange, so no re-render)
          onPick={(id) => history.replaceState(null, "", routeHash("concept", "history", id))}
          header={
            <>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{t("history.title")}</h1>
              <p className="mt-3 text-gray-600">
                <RichText text={t("history.intro")} />
              </p>
            </>
          }
        />
      </div>
    );
  };
}

/** one broken page shows an error card instead of a blank site; a new page (route) starts afresh */
class PageBoundary extends Component<{ at: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { at: string }) {
    if (prev.at !== this.props.at && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[world-models] page crashed:", error, info.componentStack);
  }
  render() {
    return this.state.error ? <Crash error={this.state.error} /> : this.props.children;
  }
}

function Crash({ error }: { error: Error }) {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-xl px-5 py-16" data-testid="crash">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">{t("crash.title")}</h1>
        <p className="mt-2 text-sm text-red-800">{t("crash.body")}</p>
        <pre className="mt-3 overflow-x-auto rounded bg-white/70 p-2 font-mono text-xs text-red-900">{error.message}</pre>
        <button onClick={() => location.reload()} className="mt-4 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800">
          {t("crash.reload")}
        </button>
      </div>
    </div>
  );
}
