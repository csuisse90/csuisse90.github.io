/** The repeated pattern across the curriculum pages: a bordered panel whose
 *  rows each carry a syllabus code, a name and an explanation. */
export type SpecRow = {
  code?: string;
  term: string;
  body: React.ReactNode;
};

export function SpecList({
  title,
  meta,
  rows,
  termWidth = "11rem",
}: {
  title: string;
  meta?: string;
  rows: SpecRow[];
  termWidth?: string;
}) {
  return (
    <div className="panel">
      <div className="panelHead">
        <span>{title}</span>
        {meta && <span>{meta}</span>}
      </div>
      <div className="panelBody">
        {rows.map((r) => (
          <div
            className="specRow"
            key={r.term}
            style={{ ["--spec-term" as string]: termWidth }}
          >
            <div className="specTerm">
              {r.code && <div className="mono specCode">{r.code}</div>}
              <div className="mono specName">{r.term}</div>
            </div>
            <div className="specBody">{r.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
