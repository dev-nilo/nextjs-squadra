import type { Metadata } from "next";
import { VoceView } from "@/components/voce/voce-view";
import { carregarGrupo } from "@/lib/grupo-server";
import { COLUNAS_DO_JOGADOR, jogadorDaLinha, type LinhaDoJogador } from "@/lib/jogador";

export const metadata: Metadata = { title: "Você · Squadra" };

/**
 * You in this fut: your Jogador (or picking it), your Frequência, this fut
 * (your papel, its people, leaving), your account.
 * The whole Elenco is read too, so "Qual desses é você?" can list who's unclaimed.
 */
export default async function VocePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  // The layout shows the sign-in or not-found screen.
  if (ctx.status !== "pronto") return null;

  const { supabase, user, grupo } = ctx;
  const { data: linhas, error } = await supabase.from("players").select(COLUNAS_DO_JOGADOR).eq("grupo_id", grupo.id);
  if (error) throw new Error(`Could not load the Elenco: ${error.message}`);
  const jogadores = ((linhas ?? []) as unknown as LinhaDoJogador[]).map(jogadorDaLinha);
  const meu = jogadores.find((j) => j.conta_id === user.id) ?? null;

  const { data: frequencia } = meu
    ? await supabase.from("frequencia_jogadores").select("partidas, presencas, frequencia").eq("jogador_id", meu.id).maybeSingle()
    : { data: null };

  const { count: pessoas } = await supabase.from("grupo_membros").select("user_id", { count: "exact", head: true }).eq("grupo_id", grupo.id);

  return (
    <VoceView
      pessoas={pessoas ?? 0}
      grupo={grupo}
      jogadores={jogadores}
      meu={meu}
      email={user.email ?? ""}
      frequencia={frequencia && frequencia.partidas > 0 ? (frequencia as { partidas: number; presencas: number; frequencia: number }) : null}
    />
  );
}
