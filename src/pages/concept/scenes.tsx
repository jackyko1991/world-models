/**
 * Concepts ▸ 3D scene models. The page frame only: each section is its own file in ./scenes/, written separately
 * (volume rendering and NeRF; Gaussian splatting and "toward world models").
 */
import { CONCEPT_OUTLINES } from "../../curriculum.ts";
import { Page } from "../kit.tsx";
import Gaussians from "./scenes/Gaussians.tsx";
import Nerf from "./scenes/Nerf.tsx";
import Toward from "./scenes/Toward.tsx";
import Volume from "./scenes/Volume.tsx";

const OUTLINE = CONCEPT_OUTLINES.find((o) => o.id === "scenes")!;
export const PAGE = "scenes";

export default function Scenes({ section }: { section: string | null }) {
  return (
    <Page id={PAGE} title={OUTLINE.title} intro={OUTLINE.intro} sections={OUTLINE.sections} focus={section} overline={OUTLINE.overline}>
      <Volume n={1} />
      <Nerf n={2} />
      <Gaussians n={3} />
      <Toward n={4} />
    </Page>
  );
}
