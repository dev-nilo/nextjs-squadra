"use client";

import { useSyncExternalStore } from "react";

function assinar(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

/**
 * True while the browser says there's no network. Writes are disabled then
 * (nothing is queued for later), and the fut's pages show the offline bar.
 * The server render assumes a connection.
 */
export function useSemConexao(): boolean {
  return useSyncExternalStore(
    assinar,
    () => !navigator.onLine,
    () => false,
  );
}
