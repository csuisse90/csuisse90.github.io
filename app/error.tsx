"use client";

import { useEffect } from "react";

/** Replaces Next's bare "a client-side exception has occurred", which tells a
 *  reader nothing and offers them nothing. By far the most common cause here is
 *  a page left open across a deploy: the JavaScript it goes to fetch has been
 *  replaced, so the import fails. Reloading fixes exactly that. */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const chunk = /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/i.test(
    `${error.name} ${error.message}`,
  );

  return (
    <div className="prose" style={{ paddingTop: "3rem" }}>
      <h1 className="display">That did not work</h1>
      {chunk ? (
        <p>
          Part of the page failed to load. This almost always means the tab has
          been open since before the site was last updated, so the file it went
          looking for is no longer on the server. Reloading fixes it.
        </p>
      ) : (
        <p>Something went wrong while rendering this page.</p>
      )}
      <p style={{ display: "flex", gap: "0.6rem" }}>
        <button
          className="paletteBtn"
          style={{ width: "auto", margin: 0 }}
          onClick={() => location.reload()}
        >
          Reload the page
        </button>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={reset}>
          Try again without reloading
        </button>
      </p>
      <p className="annotation">
        <b>Details.</b> {error.message || error.name}
      </p>
    </div>
  );
}
