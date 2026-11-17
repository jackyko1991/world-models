/** Coding Skills ▸ Rays and splats. The page frame only: each section is its own file in ./rendering/. */
import { SKILLS_OUTLINES } from "../../curriculum.ts";
import { Page } from "../kit.tsx";
import Rays from "./rendering/Rays.tsx";
import Splat from "./rendering/Splat.tsx";

const OUTLINE = SKILLS_OUTLINES.find((o) => o.id === "rendering")!;

export default function Rendering({ section }: { section: string | null }) {
  return (
    <Page id="rendering" title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <Rays n={1} />
      <Splat n={2} />
    </Page>
  );
}
