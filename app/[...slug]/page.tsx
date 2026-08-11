import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import manifest from "@/lib/generated/content.json";
import type { Manifest, Page } from "@/lib/content";
import { MDX_COMPONENTS } from "@/components/mdx";
import Contents from "@/components/Contents";
import { LazyPagePractice } from "@/components/LazyChrome";
import CardCollector from "@/components/CardCollector";

const { pages } = manifest as unknown as Manifest;
const byCode = new Map(pages.map((p) => [p.code, p]));

function find(slug: string[]): Page | undefined {
  return pages.find((p) => p.slug === slug.join("/"));
}

export function generateStaticParams() {
  return pages.map((p) => ({ slug: p.slug.split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const page = find((await params).slug);
  if (!page) return {};
  return { title: `${page.title} — ${page.code}`, description: page.lede };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const page = find((await params).slug);
  if (!page) notFound();

  const source = readFileSync(join(process.cwd(), "content", page.file), "utf8");
  const at = pages.findIndex((p) => p.code === page.code);
  const prev = pages[at - 1];
  const next = pages[at + 1];
  const prereqs = (page.prereqs ?? []).map((c) => byCode.get(c)).filter(Boolean) as Page[];

  return (
    <div className="topic">
      <article className="topicBody">
        <header className="pageHead">
          <div className="kicker">
            {page.code}
            {page.hl && <span className="hlTag">HL</span>}
          </div>
          <h1 className="display">{page.title}</h1>
          <p className="lede" style={{ marginTop: "1rem" }}>
            {page.lede}
          </p>
        </header>

        {prereqs.length > 0 && (
          <div className="prereqs">
            <span className="prereqMark">Read first</span>
            {prereqs.map((p) => (
              <Link key={p.code} href={p.href}>
                {p.code} {p.title}
              </Link>
            ))}
          </div>
        )}

        <div className="prose mdx">
          <MDXRemote
            source={source}
            components={MDX_COMPONENTS}
            options={{
              parseFrontmatter: true,
              // next-mdx-remote deletes every JS expression unless this is off,
              // which silently emptied `<Py>{`...`}</Py>` and any `attr={...}`.
              // The content is our own files, so there is nothing to sandbox.
              blockJS: false,
              blockDangerousJS: false,
              mdxOptions: {
                remarkPlugins: [remarkGfm, remarkMath],
                rehypePlugins: [[rehypeKatex, { output: "html" }]],
              },
            }}
          />
        </div>

        {page.practice && page.practice.length > 0 && (
          <LazyPagePractice code={page.code} title={page.title} items={page.practice} />
        )}

        <nav className="paging">
          {prev ? (
            <Link href={prev.href} className="pagingLink" data-dir="prev">
              <span className="pagingMark">Previous</span>
              <span className="pagingCode">{prev.code}</span>
              <span>{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={next.href} className="pagingLink" data-dir="next">
              <span className="pagingMark">Next</span>
              <span className="pagingCode">{next.code}</span>
              <span>{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      <Contents />
      <CardCollector code={page.code} title={page.title} cards={page.cards ?? []} />
    </div>
  );
}
