import katex from "katex";

// Plain component, deliberately not marked "use client": it renders to HTML at
// build time inside server components, and still works if a client component
// needs it.
export function M({ children }: { children: string }) {
  const html = katex.renderToString(children, {
    displayMode: false,
    throwOnError: false,
    output: "html",
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function MB({ children }: { children: string }) {
  const html = katex.renderToString(children, {
    displayMode: true,
    throwOnError: false,
    output: "html",
  });
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
