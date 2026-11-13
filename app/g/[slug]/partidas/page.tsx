import type { Metadata } from "next";
import { EntrarParaVer, FutNaoEncontrado } from "@/components/partida/entrar-para-ver";
import { PartidasView } from "@/components/partida/partidas-view";
import { carregarGrupo, ehGestor } from "@/lib/grupo-server";
import { lerHistorico } from "@/lib/leitura-da-partida";

export const metadata: Metadata = { title: "Partidas · Squadra" };

/** The Grupo's Partidas, read on the server under the user's RLS. */
export default async function PartidasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  if (ctx.status === "sem-sessao") return <EntrarParaVer />;
  if (ctx.status === "nao-encontrado") return <FutNaoEncontrado />;

  const { supabase, grupo, agora } = ctx;
  const { partidas, frequencia } = await lerHistorico(supabase, grupo.id);
  return <PartidasView grupo={grupo} partidas={partidas} frequencia={frequencia} podeCriar={ehGestor(grupo.papel)} agora={agora} />;
}
