"use client";

import { useSyncExternalStore } from "react";
import { MARCA_DE_COPIA } from "@/lib/pwa/paginas";

function assinar(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

/**
 * Whether this page came from the service worker's saved copy: the network
 * failed or didn't answer in time. The phone can still say it's online then
 * (wifi with no internet, signal that doesn't carry data), so `navigator.onLine`
 * alone would leave writes on over an old list.
 */
export function veioDaCopiaSalva(): boolean {
  return document.querySelector(`meta[name="${MARCA_DE_COPIA}"]`) !== null;
}

/**
 * True while there's no working network: the browser says so, or this page is
 * the saved copy. Writes are disabled then (nothing is queued for later), and
 * the fut's pages show the offline bar. The server render assumes a connection.
 */
export function useSemConexao(): boolean {
  return useSyncExternalStore(
    assinar,
    () => !navigator.onLine || veioDaCopiaSalva(),
    () => false,
  );
}
