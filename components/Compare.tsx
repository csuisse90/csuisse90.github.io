"use client";

import { useState } from "react";
import { COMPARISONS } from "@/lib/comparisons";
import RichText from "./RichText";

export default function Compare({ initial }: { initial?: string }) {
  const [id, setId] = useState(initial ?? COMPARISONS[0].id);
  const pair = COMPARISONS.find((c) => c.id === id) ?? COMPARISONS[0];

  return (
    <>
      <div className="comparePick">
        {COMPARISONS.map((c) => (
          <button
            key={c.id}
            className="comparePickBtn"
            data-active={c.id === pair.id}
            onClick={() => setId(c.id)}
          >
            <span className="mono compareUnit">{c.unit}</span>
            {c.left} <span className="compareVs">vs</span> {c.right}
          </button>
        ))}
      </div>

      <div className="compareBody">
        <p className="prose compareWhy">
          <strong>Why this pair is confusing.</strong> {pair.confusion}
        </p>

        <div className="tableWrap">
          <table className="compareTable">
            <thead>
              <tr>
                <th />
                <th>{pair.left}</th>
                <th>{pair.right}</th>
              </tr>
            </thead>
            <tbody>
              {pair.rows.map((row) => (
                <tr key={row.axis}>
                  <th scope="row">{row.axis}</th>
                  <td>
                    <RichText text={row.left} />
                  </td>
                  <td>
                    <RichText text={row.right} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="takeaway">
          <div className="takeawayMark">How to tell which the question wants</div>
          <div>
            <RichText text={pair.tell} />
          </div>
        </div>
      </div>
    </>
  );
}
