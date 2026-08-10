import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import PyRunner from "@/components/PyRunner";
import { SpecList } from "@/components/Spec";
import { M } from "@/components/Math";
import { AcidDiagram, ErDiagram, Normalisation } from "@/components/figures/dbMl";

export const metadata: Metadata = { title: "Databases" };

export default function DatabasesPage() {
  return (
    <>
      <PageHead
        code="A3 · Databases"
        title="Databases"
        lede="Storing data so that it stays true. Almost every rule in this topic exists to stop the same fact being recorded twice and then disagreeing with itself."
      />

      <div className="prose">
        <p>
          You could keep everything in one enormous spreadsheet. People do, and
          it works until the day a tutor changes room. Then you discover that
          the room was written down four hundred times, you have updated three
          hundred and ninety-eight of them, and your database is now lying to
          you in two places.
        </p>
        <p>
          A <strong>database</strong> is a structured, persistent collection of
          data. A <strong>database management system</strong> is the software
          around it that enforces the structure, controls access, and makes sure
          that the fact above can only be written down once.
        </p>
      </div>

      <h2 className="display">The relational model</h2>
      <div className="prose">
        <p>
          Data lives in <strong>tables</strong> (also called relations). Each{" "}
          <strong>row</strong> is one thing; each <strong>column</strong> is one
          attribute of it. Tables are joined not by nesting but by referring to
          each other with keys.
        </p>
      </div>

      <SpecList
        title="The vocabulary"
        meta="A3"
        termWidth="10rem"
        rows={[
          { term: "Table", body: "A collection of rows all describing the same kind of thing. One table for students, one for courses." },
          { term: "Record / row", body: "One instance — one particular student." },
          { term: "Field / column", body: "One attribute, with a single data type for every row in it." },
          { term: "Primary key", body: "The column whose value uniquely identifies a row. Must be unique and can never be empty. If nothing natural fits, invent one — a studentId, not a name, because two students can share a name." },
          { term: "Foreign key", body: "A column holding another table's primary key, which is how a relationship is expressed. The database can then refuse to store an enrolment for a student who does not exist." },
          { term: "Composite key", body: "A primary key made from more than one column together, used when no single column is unique on its own." },
          { term: "Index", body: "An extra structure that makes searching a column fast, at the cost of storage and slightly slower writes. The same trade as the index at the back of a book." },
        ]}
      />

      <ErDiagram />

      <h2 className="display">Relationships</h2>
      <div className="prose">
        <ul>
          <li>
            <strong>One-to-one.</strong> One row here matches exactly one row
            there — a person and their passport. Often a sign the two tables
            should be one.
          </li>
          <li>
            <strong>One-to-many.</strong> The common case. One teacher has many
            students; each student has one form teacher. The foreign key goes on
            the &ldquo;many&rdquo; side.
          </li>
          <li>
            <strong>Many-to-many.</strong> Many students take many courses. A
            relational table cannot hold this directly, so you add a{" "}
            <strong>junction table</strong> whose rows each pair one student
            with one course — turning it into two one-to-many relationships, as
            in the diagram above.
          </li>
        </ul>
      </div>

      <h2 className="display">Normalisation</h2>
      <div className="prose">
        <p>
          Normalisation is the process of organising tables so each fact is
          stored exactly once. It exists to prevent three specific failures,
          which are worth naming precisely because exam questions ask for them
          by name.
        </p>
        <ul>
          <li>
            <strong>Update anomaly.</strong> A fact stored in many places is
            changed in some of them, and the database now contradicts itself.
          </li>
          <li>
            <strong>Insertion anomaly.</strong> You cannot record one fact
            without inventing another — you cannot add a new course until
            someone enrols on it.
          </li>
          <li>
            <strong>Deletion anomaly.</strong> Removing one fact destroys an
            unrelated one — deleting the last student on a course erases the
            course itself.
          </li>
        </ul>
      </div>

      <Normalisation />

      <SpecList
        title="The normal forms"
        meta="A3"
        termWidth="7rem"
        rows={[
          {
            term: "1NF",
            body: (
              <>
                Every cell holds a <strong>single value</strong>, and there are no
                repeating groups of columns. A column containing
                &ldquo;maths, physics, art&rdquo; breaks 1NF; so does having
                subject1, subject2 and subject3 columns.
              </>
            ),
          },
          {
            term: "2NF",
            body: (
              <>
                In 1NF, and every non-key column depends on the{" "}
                <strong>whole</strong> primary key, not just part of it. Only
                bites when the key is composite.
              </>
            ),
          },
          {
            term: "3NF",
            body: (
              <>
                In 2NF, and no non-key column depends on another non-key column.
                If a table holds studentId, tutorId and tutorRoom, the room
                depends on the tutor rather than on the student — so the tutor
                belongs in a table of its own.
              </>
            ),
          },
        ]}
      />

      <div className="callout">
        <div className="calloutHead">The one-line version</div>
        <p style={{ margin: 0 }}>
          Every non-key column must depend on <strong>the key, the whole key,
          and nothing but the key</strong>. If you can recite that and explain
          what each clause rules out, you have 1NF, 2NF and 3NF.
        </p>
      </div>

      <div className="prose">
        <p>
          Normalisation is not free. More tables mean more joins, and joins cost
          time. Systems that read far more than they write sometimes{" "}
          <strong>denormalise</strong> deliberately, accepting duplicated data
          in exchange for speed. That is a considered trade, not an excuse.
        </p>
      </div>

      <h2 className="display">Querying with SQL</h2>
      <div className="prose">
        <p>
          SQL is how you ask a relational database questions. The clauses always
          appear in the same order.
        </p>
      </div>

      <pre className="listing">{`SELECT   s.name, c.title, e.grade
FROM     Student s
JOIN     Enrolment e ON e.studentId = s.studentId
JOIN     Course    c ON c.courseId  = e.courseId
WHERE    c.level = 'HL'
ORDER BY e.grade DESC;`}</pre>

      <SpecList
        title="SQL you should recognise"
        termWidth="8rem"
        rows={[
          { term: "SELECT", body: "Which columns you want back." },
          { term: "FROM / JOIN", body: "Which tables, and how rows in them line up — normally a foreign key matching a primary key." },
          { term: "WHERE", body: "Which rows to keep. Filters before any grouping." },
          { term: "GROUP BY", body: "Collapse rows into groups so that COUNT, SUM and AVG can be applied to each." },
          { term: "HAVING", body: "Like WHERE, but filters the groups after grouping." },
          { term: "ORDER BY", body: "Sort the result. ASC by default, DESC for descending." },
          { term: "INSERT / UPDATE / DELETE", body: "Add, change and remove rows. An UPDATE or DELETE without a WHERE clause hits every row in the table — the single most expensive typo in the subject." },
        ]}
      />

      <div className="prose">
        <p>Change the query and run it again.</p>
      </div>

      <PyRunner
        packages={["sqlite3"]}
        caption="Three tables, foreign keys, a join, and a constraint doing its job."
        code={`import sqlite3

db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")

db.executescript("""
CREATE TABLE Student (
    studentId INTEGER PRIMARY KEY,
    name      TEXT NOT NULL
);
CREATE TABLE Course (
    courseId INTEGER PRIMARY KEY,
    title    TEXT NOT NULL,
    level    TEXT NOT NULL
);
CREATE TABLE Enrolment (
    enrolmentId INTEGER PRIMARY KEY,
    studentId   INTEGER REFERENCES Student(studentId),
    courseId    INTEGER REFERENCES Course(courseId),
    grade       INTEGER
);
""")

db.executemany("INSERT INTO Student VALUES (?, ?)",
               [(1, "Aisha"), (2, "Ben"), (3, "Chidi")])
db.executemany("INSERT INTO Course VALUES (?, ?, ?)",
               [(10, "Computer Science", "HL"), (20, "Maths", "HL"), (30, "Art", "SL")])
db.executemany("INSERT INTO Enrolment VALUES (?, ?, ?, ?)",
               [(1, 1, 10, 7), (2, 1, 20, 6), (3, 2, 10, 5),
                (4, 3, 30, 7), (5, 2, 20, 7)])

print("HL results, best first")
print("-" * 34)
for name, title, grade in db.execute("""
        SELECT s.name, c.title, e.grade
        FROM Student s
        JOIN Enrolment e ON e.studentId = s.studentId
        JOIN Course    c ON c.courseId  = e.courseId
        WHERE c.level = 'HL'
        ORDER BY e.grade DESC"""):
    print(f"{name:<8} {title:<18} {grade}")

print()
print("Average grade per course")
print("-" * 34)
for title, avg, n in db.execute("""
        SELECT c.title, ROUND(AVG(e.grade), 2), COUNT(*)
        FROM Course c
        JOIN Enrolment e ON e.courseId = c.courseId
        GROUP BY c.courseId
        HAVING COUNT(*) > 1"""):
    print(f"{title:<18} {avg}  (n={n})")

# The foreign key refuses to store an enrolment for a student who does not exist.
try:
    db.execute("INSERT INTO Enrolment VALUES (6, 99, 10, 7)")
except sqlite3.IntegrityError as e:
    print()
    print("Referential integrity held:", e)`}
      />

      <h2 className="display">Transactions and ACID</h2>
      <div className="prose">
        <p>
          A <strong>transaction</strong> is a group of operations treated as a
          single unit. Moving money between accounts is two writes, and the
          database must never do one without the other. The guarantees are
          remembered as ACID.
        </p>
      </div>

      <AcidDiagram />

      <SpecList
        title="ACID"
        termWidth="9rem"
        rows={[
          { term: "Atomicity", body: "All of the transaction happens, or none of it. A failure halfway is rolled back as if it never began." },
          { term: "Consistency", body: "The database moves from one valid state to another. Every rule — keys, constraints, data types — still holds afterwards." },
          { term: "Isolation", body: "Concurrent transactions do not see each other's half-finished work. Two people withdrawing at once cannot both read the same starting balance." },
          { term: "Durability", body: "Once committed, it survives a crash or power failure, because it has been written to permanent storage." },
        ]}
      />

      <h2 className="display">Security, integrity and privacy</h2>
      <div className="prose">
        <p>
          <strong>Integrity</strong> is the data being correct: enforced by data
          types, constraints such as NOT NULL and UNIQUE, referential integrity
          through foreign keys, and validation rules.
        </p>
        <p>
          <strong>Security</strong> is the data being protected: user accounts
          with the least privilege each role needs, encryption of sensitive
          columns and of backups, audit logs recording who changed what, and
          regular tested restores. A backup nobody has ever restored is a
          hypothesis, not a backup.
        </p>
        <p>
          <strong>Privacy</strong> is the data being handled lawfully and
          ethically: collecting only what is needed, keeping it only as long as
          necessary, and being honest about what is held. This is where the
          syllabus expects you to discuss consequences rather than mechanisms.
        </p>
      </div>

      <div className="callout warn">
        <div className="calloutHead">SQL injection</div>
        <p style={{ margin: 0 }}>
          If a query is built by gluing user input into a string, a user can
          type SQL instead of a name and have it executed. The fix is{" "}
          <strong>parameterised queries</strong> — the <M>{"?"}</M> placeholders
          in the Python above — which send the data separately from the command,
          so it can never be read as instructions.
        </p>
      </div>

      <h2 className="display">Beyond relational</h2>
      <div className="prose">
        <p>
          <strong>NoSQL</strong> databases drop some relational guarantees for
          scale and flexibility: document stores keep whole JSON-like objects,
          key-value stores act as enormous dictionaries, and graph databases
          store relationships as first-class things. They suit huge, rapidly
          changing or poorly structured data. Relational databases remain the
          right answer whenever the data has a clear shape and correctness
          matters more than raw throughput — which is most of the time.
        </p>
        <p>
          A <strong>data warehouse</strong> holds historical data from many
          systems, organised for analysis rather than day-to-day operation;{" "}
          <strong>data mining</strong> is the process of looking for patterns in
          it, which is where this topic hands over to{" "}
          <a href="/machine-learning/">machine learning</a>.
        </p>
      </div>

      <p className="annotation">
        <b>Exam note.</b> Normalisation questions usually hand you a badly
        designed table and ask you to fix it. Say which normal form is broken,
        say <em>why</em> using the word anomaly, then show the resulting tables
        with primary and foreign keys marked. All three steps earn marks.
      </p>
    </>
  );
}
