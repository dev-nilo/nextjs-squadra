import type { Metadata } from "next";
import { ElencoView } from "@/components/elenco/elenco-view";
import { carregarGrupo } from "@/lib/grupo-server";
import { COLUNAS_DO_JOGADOR, jogadorDaLinha, type LinhaDoJogador } from "@/lib/jogador";

export const metadata: Metadata = { title: "Elenco · Squadra" };

/** The fut's Elenco, read on the server under the user's RLS. */
export default async function ElencoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  // The layout shows the sign-in or not-found screen.
  if (ctx.status !== "pronto") return null;

  const { supabase, user, grupo } = ctx;
  const { data: linhas, error } = await supabase.from("players").select(COLUNAS_DO_JOGADOR).eq("grupo_id", grupo.id);
  // Caught by app/error.tsx, which offers to try again.
  if (error) throw new Error(`Could not load the Elenco: ${error.message}`);

  return (
    <ElencoView
      // A new Grupo starts with a clean search, selection and draw.
      key={grupo.id}
      grupo={grupo}
      jogadores={((linhas ?? []) as unknown as LinhaDoJogador[]).map(jogadorDaLinha)}
      userId={user.id}
    />
  );
}
