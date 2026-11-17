/** Small text pieces shared by the scene and rendering sections: the section's question and a subheading. */
import { RichText, useLang } from "@learnkit/web";
import type { L } from "../strings.ts";

/** The outline's learning question, set above a section's text. */
export function Question({ t }: { t: L }) {
  const { pick } = useLang();
  return (
    <p className="text-base font-medium text-gray-900">
      <RichText text={pick(t)} />
    </p>
  );
}

/** A subheading inside a section. */
export function Sub({ t }: { t: L }) {
  const { pick } = useLang();
  return (
    <h3 className="pt-2 font-semibold text-gray-900">
      <RichText text={pick(t)} />
    </h3>
  );
}
