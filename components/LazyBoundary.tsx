"use client";

import { Component, type ReactNode } from "react";

/** Anything loaded with next/dynamic fetches a chunk over the network, and a
 *  chunk that fails to arrive throws during render — which, without a boundary,
 *  takes the whole application down and replaces it with "a client-side
 *  exception has occurred". A missing chunk is nearly always a stale page after
 *  a deploy, so the fix is a reload, and this says so instead of dying. */
export default class LazyBoundary extends Component<
  { children: ReactNode; what: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="lazyFailed" role="alert">
        <strong>{this.props.what} could not load.</strong>
        <p>
          This usually means the page has been open since before the site was
          last updated, so the file it went looking for is no longer there.
          Reloading fixes it.
        </p>
        <button className="paletteBtn" style={{ width: "auto", margin: 0 }} onClick={() => location.reload()}>
          Reload the page
        </button>
        <code>{this.state.error.message}</code>
      </div>
    );
  }
}
