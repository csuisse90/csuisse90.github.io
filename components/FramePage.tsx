import PageHead from "./PageHead";
import { SpecList, type SpecRow } from "./Spec";

/** Outline page for a topic that is framed but not yet written out in full.
 *  Honest about its own state rather than pretending to be finished. */
export default function FramePage({
  code,
  title,
  lede,
  intro,
  rows,
  meta,
}: {
  code: string;
  title: string;
  lede: string;
  intro: string;
  rows: SpecRow[];
  meta?: string;
}) {
  return (
    <>
      <PageHead code={code} title={title} lede={lede} />

      <div className="prose">
        <p>{intro}</p>
      </div>

      <SpecList title="What this topic covers" meta={meta} rows={rows} termWidth="12rem" />

      <p className="annotation">Outline. The full write-up is still to come.</p>
    </>
  );
}
