"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { guardaOffline, guardarPagina } from "@/lib/pwa/paginas";

/** Back after this long away, the page reads everything again. */
const AUSENCIA_QUE_PEDE_ATUALIZAR = 30_000;

/**
 * Keeps an installed app current without a pull-to-refresh: back in the
 * foreground after a while, or back online, the fut's page renders again.
 * Also asks the service worker to save the fut's home and Elenco when they're
 * reached by a tab (a client navigation the service worker never sees).
 */
export function AoVoltar() {
  const router = useRouter();
  const pathname = usePathname();
  const saiuEm = useRef<number | null>(null);

  useEffect(() => {
    if (guardaOffline(pathname) && navigator.onLine) guardarPagina(pathname);
  }, [pathname]);

  useEffect(() => {
    const visibilidade = () => {
      if (document.visibilityState === "hidden") {
        saiuEm.current = Date.now();
        return;
      }
      const saiu = saiuEm.current;
      saiuEm.current = null;
      if (saiu !== null && Date.now() - saiu >= AUSENCIA_QUE_PEDE_ATUALIZAR && navigator.onLine) {
        router.refresh();
        if (guardaOffline(location.pathname)) guardarPagina(location.pathname);
      }
    };
    const voltouAConexao = () => router.refresh();
    document.addEventListener("visibilitychange", visibilidade);
    window.addEventListener("online", voltouAConexao);
    return () => {
      document.removeEventListener("visibilitychange", visibilidade);
      window.removeEventListener("online", voltouAConexao);
    };
  }, [router]);

  return null;
}
