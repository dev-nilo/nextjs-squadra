import type { Participacao } from "@/lib/grupo";
import { BarraDeAbas } from "./abas-do-fut";
import { CabecalhoDoFut } from "./cabecalho-do-fut";

/**
 * The frame every fut page shares: the same header, the same tabs and the
 * same width, so moving between Partidas, Elenco and Você only changes the
 * content. On phones the bottom of the page leaves room for the tab bar
 * (h-16) and the home indicator.
 */
export function FutShell({
  grupo,
  participacoes,
  children,
}: {
  grupo: Participacao;
  participacoes: readonly Participacao[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CabecalhoDoFut grupo={grupo} participacoes={participacoes} />
      <main className="mx-auto w-full max-w-5xl px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8 md:pb-16">
        {children}
      </main>
      <BarraDeAbas slug={grupo.slug} />
    </div>
  );
}
