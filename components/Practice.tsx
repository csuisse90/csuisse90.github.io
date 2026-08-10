export type QA = { marks: number; q: React.ReactNode; a: React.ReactNode };

/** Question set at the foot of a topic page. Answers stay collapsed so the
 *  page still reads as notes until you want to be tested. */
export default function Practice({ items }: { items: QA[] }) {
  return (
    <>
      <h2 className="display">Practice</h2>
      <p className="prose">
        Try each on paper before opening the answer.
      </p>
      {items.map((item, i) => (
        <div className="panel" key={i}>
          <div className="panelHead">
            <span>Question {i + 1}</span>
            <span>
              [{item.marks} mark{item.marks === 1 ? "" : "s"}]
            </span>
          </div>
          <div className="panelBody">
            <div className="prose" style={{ maxWidth: "none" }}>
              {item.q}
            </div>
            <details style={{ marginTop: "0.9rem" }}>
              <summary
                className="mono"
                style={{
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "var(--alarm)",
                }}
              >
                Answer
              </summary>
              <div
                className="prose"
                style={{
                  maxWidth: "none",
                  marginTop: "0.9rem",
                  paddingTop: "0.9rem",
                  borderTop: "1px dashed var(--hairline)",
                }}
              >
                {item.a}
              </div>
            </details>
          </div>
        </div>
      ))}
    </>
  );
}
