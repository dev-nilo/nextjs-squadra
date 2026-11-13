import type { Metadata } from "next";
import { ElencoView } from "@/components/elenco/elenco-view";
import { EntrarParaVer, FutNaoEncontrado } from "@/components/partida/entrar-para-ver";
import { carregarGrupo, carregarParticipacoes } from "@/lib/grupo-server";
import { COLUNAS_DO_JOGADOR, jogadorDaLinha, type LinhaDoJogador } from "@/lib/jogador";

export const metadata: Metadata = { title: "Elenco · Squadra" };

/** The Grupo's Elenco, read on the server under the user's RLS. */
export default async function ElencoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  if (ctx.status === "sem-sessao") return <EntrarParaVer />;
  if (ctx.status === "nao-encontrado") return <FutNaoEncontrado />;

  const { supabase, user, grupo } = ctx;
  const [{ data: linhas, error }, participacoes] = await Promise.all([
    supabase.from("players").select(COLUNAS_DO_JOGADOR).eq("grupo_id", grupo.id),
    carregarParticipacoes(supabase, user.id),
  ]);
  // Caught by app/error.tsx, which offers to try again.
  if (error) throw new Error(`Could not load the Elenco: ${error.message}`);

  return (
    <ElencoView
      // A new Grupo starts with a clean search, selection and draw.
      key={grupo.id}
      grupo={grupo}
      participacoes={participacoes ?? [grupo]}
      jogadores={((linhas ?? []) as unknown as LinhaDoJogador[]).map(jogadorDaLinha)}
      userId={user.id}
    />
  );
}
