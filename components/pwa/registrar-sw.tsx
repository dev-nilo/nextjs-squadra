"use client";

import { useEffect } from "react";
// Imported for its side effect too: it starts listening for the browser's
// install prompt, which fires once, early.
import "@/lib/pwa/instalar";

/**
 * Registers the service worker (`public/sw.js`) in production builds. Updates
 * are silent: the browser checks `sw.js` on each visit, and a new worker takes
 * over at once.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e) => {
      console.error("[pwa] Service worker registration failed:", e);
    });
  }, []);
  return null;
}
