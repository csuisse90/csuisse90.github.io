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

      <div className="callout warn">
        <div className="calloutHead">Outline only</div>
        <p style={{ margin: 0 }}>
          This page maps the topic so you can see where it sits, but it has not
          been written out in full yet. Theme A is complete; Theme B is being
          added next.
        </p>
      </div>

      <div className="prose">
        <p>{intro}</p>
      </div>

      <SpecList title="What this topic covers" meta={meta} rows={rows} termWidth="12rem" />
    </>
  );
}
