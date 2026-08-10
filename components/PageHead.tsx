export default function PageHead({
  code,
  title,
  lede,
}: {
  code: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="pageHead">
      <div className="kicker">{code}</div>
      <h1 className="display">{title}</h1>
      <p className="lede" style={{ marginTop: "1rem" }}>
        {lede}
      </p>
    </header>
  );
}
