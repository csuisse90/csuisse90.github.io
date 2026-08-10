"use client";

import PyRunner from "../PyRunner";

const SCHEMA = `import sqlite3
db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE Student (studentId INTEGER PRIMARY KEY, name TEXT, year INTEGER);
CREATE TABLE Course  (courseId  INTEGER PRIMARY KEY, title TEXT, level TEXT);
CREATE TABLE Enrolment (
    enrolmentId INTEGER PRIMARY KEY,
    studentId INTEGER REFERENCES Student(studentId),
    courseId  INTEGER REFERENCES Course(courseId),
    grade INTEGER);

INSERT INTO Student VALUES (1,'Aisha',12),(2,'Ben',12),(3,'Chidi',13),(4,'Dara',13);
INSERT INTO Course  VALUES (10,'Computer Science','HL'),(20,'Maths','HL'),
                           (30,'Art','SL'),(40,'Biology','SL');
INSERT INTO Enrolment VALUES (1,1,10,7),(2,1,20,6),(3,2,10,5),(4,2,30,7),
                             (5,3,20,7),(6,3,40,4),(7,4,10,6),(8,4,20,5);
""")

def run(sql):
    """Run a query and print it as a table."""
    cur = db.execute(sql)
    headers = [d[0] for d in cur.description]
    rows = cur.fetchall()
    widths = [max(len(str(h)), *(len(str(r[i])) for r in rows)) if rows else len(str(h))
              for i, h in enumerate(headers)]
    print(" | ".join(str(h).ljust(w) for h, w in zip(headers, widths)))
    print("-+-".join("-" * w for w in widths))
    for r in rows:
        print(" | ".join(str(c).ljust(w) for c, w in zip(r, widths)))
    print(f"({len(rows)} rows)")

`;

const QUERIES: { label: string; sql: string }[] = [
  { label: "Everything", sql: "SELECT * FROM Student" },
  {
    label: "A join",
    sql: `SELECT s.name, c.title, e.grade
FROM Student s
JOIN Enrolment e ON e.studentId = s.studentId
JOIN Course    c ON c.courseId  = e.courseId
ORDER BY s.name`,
  },
  {
    label: "Filter with WHERE",
    sql: `SELECT s.name, c.title, e.grade
FROM Student s
JOIN Enrolment e ON e.studentId = s.studentId
JOIN Course    c ON c.courseId  = e.courseId
WHERE c.level = 'HL' AND e.grade >= 6`,
  },
  {
    label: "GROUP BY and HAVING",
    sql: `SELECT c.title, COUNT(*) AS students, ROUND(AVG(e.grade),2) AS mean
FROM Course c
JOIN Enrolment e ON e.courseId = c.courseId
GROUP BY c.courseId
HAVING COUNT(*) > 1
ORDER BY mean DESC`,
  },
];

export default function SqlLab() {
  return (
    <>
      <p className="prose">
        The schema is set up in the code below. Change the query at the bottom
        and run it. Ask for a column that does not exist and read the error —
        that is usually more instructive than a query that works.
      </p>

      <div className="cardGrid">
        {QUERIES.map((q) => (
          <div className="card" key={q.label}>
            <div className="cardTitle">{q.label}</div>
            <pre className="cardBody mono" style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "0.72rem" }}>
              {q.sql}
            </pre>
          </div>
        ))}
      </div>

      <PyRunner
        packages={["sqlite3"]}
        caption="Copy a query from above into run(...), or write your own."
        code={`${SCHEMA}run("""
SELECT s.name, c.title, e.grade
FROM Student s
JOIN Enrolment e ON e.studentId = s.studentId
JOIN Course    c ON c.courseId  = e.courseId
WHERE c.level = 'HL'
ORDER BY e.grade DESC
""")`}
      />

      <p className="annotation">
        <b>Exam habit.</b> Write the FROM and JOIN first, then the WHERE, and
        only then decide which columns you want. Working outside-in is how you
        end up joining on the wrong key.
      </p>
    </>
  );
}
