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
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        const done = () => {
          if (!alive) return;
          setState("ready");
          window.localStorage.setItem("offline.told", "yes");
          setTimeout(() => alive && setState("idle"), 6000);
        };
        if (registration.active) return done();
        registration.installing?.addEventListener("statechange", function () {
          if (this.state === "activated") done();
        });
      })
      .catch(() => alive && setState("idle"));

    return () => {
      alive = false;
    };
  }, []);

  if (state === "idle") return null;

  return (
    <div className="offlineNote" data-state={state} role="status">
      {state === "caching" ? "Saving the site for offline use…" : "Ready to use offline."}
    </div>
  );
}
