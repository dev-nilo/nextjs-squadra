"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { GrupoSwitcher } from "@/components/grupo/grupo-switcher";
import { BrandLockup } from "@/components/ui/logo";
import type { Participacao } from "@/lib/grupo";
import { caminhoNoOutroFut } from "@/lib/navegacao";
import { AbasNoTopo } from "./abas-do-fut";

/**
 * One slim row on every fut page: the mark (home), the fut switcher, and on
 * wider screens the tabs. Clears the iPhone's status bar when installed.
 */
export function CabecalhoDoFut({ grupo, participacoes }: { grupo: Participacao; participacoes: readonly Participacao[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const trocar = useCallback((slug: string) => router.push(caminhoNoOutroFut(pathname, slug)), [router, pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-content1/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link
          href={`/g/${encodeURIComponent(grupo.slug)}`}
          aria-label="Squadra, próxima partida"
          className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandLockup compactOnMobile />
        </Link>
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-divider" />
        <div className="min-w-0 max-w-[65vw] sm:max-w-xs">
          <GrupoSwitcher grupo={grupo} participacoes={participacoes} onTrocar={trocar} />
        </div>
        <AbasNoTopo slug={grupo.slug} />
      </div>
    </header>
  );
}
