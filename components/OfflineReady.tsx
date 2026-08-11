"use client";

import { useEffect, useState } from "react";

/** Registers the service worker, which takes a copy of the whole site so it
 *  works with no network. Shows a one-off note when the copy is complete. */
export default function OfflineReady() {
  const [state, setState] = useState<"idle" | "caching" | "ready">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.localStorage.getItem("offline.told") === "yes") {
      void navigator.serviceWorker.register("/sw.js");
      return;
    }

    let alive = true;
    setState("caching");

    // Nothing here is allowed to leave the note on screen for ever. A worker
    // that is already waiting fires neither branch below, and a slow install
    // fires them late, so a plain deadline hides the note either way.
    const giveUp = setTimeout(() => alive && setState("idle"), 12_000);
    let fade: ReturnType<typeof setTimeout> | undefined;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        const done = () => {
          if (!alive) return;
          clearTimeout(giveUp);
          setState("ready");
          window.localStorage.setItem("offline.told", "yes");
          fade = setTimeout(() => alive && setState("idle"), 4000);
        };
        if (registration.active) return done();
        (registration.installing ?? registration.waiting)?.addEventListener(
          "statechange",
          function () {
            if (this.state === "activated") done();
          },
        );
      })
      .catch(() => alive && setState("idle"));

    return () => {
      alive = false;
      clearTimeout(giveUp);
      clearTimeout(fade);
    };
  }, []);

  if (state === "idle") return null;

  return (
    <div className="offlineNote" data-state={state} role="status">
      {state === "caching" ? "Saving the site for offline use…" : "Ready to use offline."}
    </div>
  );
}
