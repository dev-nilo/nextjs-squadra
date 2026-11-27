"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { veioDaCopiaSalva } from "@/lib/pwa/conexao";
import { guardaOffline, guardarPagina } from "@/lib/pwa/paginas";

/** Back after this long away, the page reads everything again. */
const AUSENCIA_QUE_PEDE_ATUALIZAR = 30_000;
/** While showing a saved copy, how often to check whether the network answers again. */
const INTERVALO_DA_COPIA = 15_000;

/**
 * Whether the network answers now: a small file the service worker doesn't
 * keep, with a short wait (signal that's there but doesn't carry data hangs).
 */
async function redeResponde(): Promise<boolean> {
  try {
    const r = await fetch("/manifest.webmanifest", { cache: "no-store", signal: AbortSignal.timeout(3500) });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Keeps an installed app current without a pull-to-refresh: back in the
 * foreground after a while, or back online, the fut's page renders again, and
 * the service worker checks for a new version. A page shown from its saved
 * copy reloads itself as soon as the network answers. Also asks the service
 * worker to save the fut's pages when they're reached by a tab (a client
 * navigation the service worker never sees).
 */
export function AoVoltar() {
  const router = useRouter();
  const pathname = usePathname();
  const saiuEm = useRef<number | null>(null);

  useEffect(() => {
    if (guardaOffline(pathname) && navigator.onLine && !veioDaCopiaSalva()) guardarPagina(pathname);
  }, [pathname]);

  useEffect(() => {
    const copia = veioDaCopiaSalva();
    const tentarAPaginaDeVerdade = async () => {
      if (document.visibilityState === "visible" && (await redeResponde())) location.reload();
    };

    const visibilidade = () => {
      if (document.visibilityState === "hidden") {
        saiuEm.current = Date.now();
        return;
      }
      const saiu = saiuEm.current;
      saiuEm.current = null;
      if (copia) return void tentarAPaginaDeVerdade();
      if (saiu !== null && Date.now() - saiu >= AUSENCIA_QUE_PEDE_ATUALIZAR && navigator.onLine) {
        router.refresh();
        if (guardaOffline(location.pathname)) guardarPagina(location.pathname);
        // An installed app seldom loads a page in full, so it'd only see a new version on a cold start.
        void navigator.serviceWorker
          ?.getRegistration()
          .then((r) => r?.update())
          .catch(() => {});
      }
    };
    const voltouAConexao = () => (copia ? void tentarAPaginaDeVerdade() : router.refresh());
    const intervalo = copia ? window.setInterval(tentarAPaginaDeVerdade, INTERVALO_DA_COPIA) : undefined;

    document.addEventListener("visibilitychange", visibilidade);
    window.addEventListener("online", voltouAConexao);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", visibilidade);
      window.removeEventListener("online", voltouAConexao);
    };
  }, [router]);

  return null;
}
