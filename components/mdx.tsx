// Everything an MDX page can use without importing it. Content files should
// read as prose with the occasional component dropped in, never as React.
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

import Aside from "./Aside";
import { LazyFaultFinder, LazyKMap } from "./LazyEngine";
import CircuitFigure from "./CircuitFigure";
import Compare from "./Compare";
import PyRunner from "./PyRunner";
import TruthTable from "./TruthTable";
import Topology from "./Topology";
import { M, MB } from "./Math";
import { circuit } from "@/lib/circuits";

import * as systems from "./figures/systems";
import * as dataNet from "./figures/dataNet";
import * as dbMl from "./figures/dbMl";
import * as foundations from "./figures/foundations";
import * as programming from "./figures/programming";

/** `<Circuit id="halfAdder" table />` — the diagram is looked up at build time
 *  and only that one circuit is sent to the browser. */
function Circuit({
  id,
  table,
  ...rest
}: { id: string; table?: boolean } & Omit<
  ComponentProps<typeof CircuitFigure>,
  "data" | "withTable"
>) {
  return <CircuitFigure data={circuit(id)} withTable={table} {...rest} />;
}

/** A figure with a numbered caption. Diagrams are the point of this site, so
 *  they get a frame rather than floating in the text. */
function Figure({ caption, children }: { caption?: ReactNode; children: ReactNode }) {
  return (
    <figure className="figure">
      <div className="figureBody figureZoom" data-zoomable>
        {children}
      </div>
      {caption && <figcaption className="figureCaption">{caption}</figcaption>}
    </figure>
  );
}

/** The one-line summary a reader should leave the page with. */
function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div className="takeaway">
      <div className="takeawayMark">The point</div>
      <div>{children}</div>
    </div>
  );
}

/** A term being defined. Collected into the glossary at build time. */
function Term({ children }: { children: ReactNode }) {
  return <strong className="term">{children}</strong>;
}

export const MDX_COMPONENTS = {
  a: ({ href = "", ...rest }: ComponentProps<"a">) =>
    href.startsWith("/") ? (
      <Link href={href} {...rest} />
    ) : (
      <a href={href} target="_blank" rel="noreferrer noopener" {...rest} />
    ),
  table: (props: ComponentProps<"table">) => (
    <div className="tableWrap">
      <table {...props} />
    </div>
  ),
  Aside,
  Circuit,
  /** `<Fault id="halfAdder" />` — the same circuit, with one gate quietly
   *  wrong, for the reader to track down. */
  Fault: ({ id }: { id: string }) => <LazyFaultFinder data={circuit(id)} />,
  Compare,
  Figure,
  KMap: LazyKMap,
  M,
  MB,
  /** Takes its code as a child so a snippet can be written as a plain block
   *  rather than squeezed into an attribute:
   *
   *    <Py caption="...">{`
   *    print("hello")
   *    `}</Py>
   */
  Py: ({
    children,
    code,
    ...rest
  }: { children?: ReactNode; code?: string } & Omit<
    ComponentProps<typeof PyRunner>,
    "code"
  >) => <PyRunner code={code ?? (typeof children === "string" ? children : "")} {...rest} />,
  Takeaway,
  Term,
  Topology,
  TruthTable,
  ...systems,
  ...dataNet,
  ...dbMl,
  ...foundations,
  ...programming,
};
