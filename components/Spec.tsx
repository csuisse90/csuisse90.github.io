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
            key={r.term}
            style={{
              display: "grid",
              gridTemplateColumns: `${termWidth} minmax(0,1fr)`,
              gap: "1rem",
              padding: "0.6rem 0",
              borderBottom: "1px solid var(--hairline)",
              alignItems: "baseline",
            }}
          >
            <div>
              {r.code && (
                <div
                  className="mono"
                  style={{ color: "var(--ink-faint)", fontSize: "0.62rem" }}
                >
                  {r.code}
                </div>
              )}
              <div
                className="mono"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--ink)",
                }}
              >
                {r.term}
              </div>
            </div>
            <div style={{ fontSize: "0.94rem", lineHeight: 1.6 }}>{r.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
