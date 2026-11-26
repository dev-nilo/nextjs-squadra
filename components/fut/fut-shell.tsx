import type { Participacao } from "@/lib/grupo";
import { BarraDeAbas } from "./abas-do-fut";
import { AoVoltar } from "./ao-voltar";
import { CabecalhoDoFut } from "./cabecalho-do-fut";
import { SemConexao } from "./sem-conexao";

/**
 * The frame every fut page shares: the same header, the same tabs and the
 * same width, so moving between Partidas, Elenco and Você only changes the
 * content. On phones the bottom of the page leaves room for the tab bar
 * (h-16) and the home indicator.
 *
 * Each page marks itself for the service worker to save (MarcaOffline), not
 * this frame: see why there.
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
      <main className="margem-lateral mx-auto w-full max-w-5xl pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:pt-8 md:pb-16 baixa:pb-[calc(4rem+env(safe-area-inset-bottom))] baixa:pt-4">
        <SemConexao />
        {children}
      </main>
      <BarraDeAbas slug={grupo.slug} />
      <AoVoltar />
    </div>
  );
}
