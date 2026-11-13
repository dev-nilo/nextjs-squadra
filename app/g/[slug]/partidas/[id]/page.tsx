import type { Metadata } from "next";
import { z } from "zod";
import { EntrarParaVer, FutNaoEncontrado } from "@/components/partida/entrar-para-ver";
import { PartidaView } from "@/components/partida/partida-view";
import { carregarGrupo, ehGestor } from "@/lib/grupo-server";
import { lerPartida } from "@/lib/leitura-da-partida";

export const metadata: Metadata = { title: "Partida · Squadra" };

/**
 * One Partida. The first render comes from the server through the read model
 * (RLS-filtered); after that usePartidaAoVivo keeps it current in the browser.
 */
export default async function PartidaPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ctx = await carregarGrupo(slug);
  if (ctx.status === "sem-sessao") return <EntrarParaVer />;
  if (ctx.status === "nao-encontrado" || !z.string().uuid().safeParse(id).success) return <FutNaoEncontrado />;

  const { supabase, grupo, user, agora } = ctx;
  const lida = await lerPartida(supabase, grupo.id, id);
  if (!lida) return <FutNaoEncontrado />;
  const { jogadores, ...inicial } = lida;

  return (
    <PartidaView grupo={grupo} userId={user.id} podeGerir={ehGestor(grupo.papel)} inicial={inicial} jogadores={jogadores} agora={agora} />
  );
}
