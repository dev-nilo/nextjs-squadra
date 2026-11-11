import type { Metadata } from "next";
import { z } from "zod";
import { EntrarParaVer, FutNaoEncontrado } from "@/components/partida/entrar-para-ver";
import { PartidaView, type JogadorDaLista } from "@/components/partida/partida-view";
import { carregarGrupo, ehGestor } from "@/lib/grupo-server";
import type { Partida, Presenca } from "@/lib/partida";

export const metadata: Metadata = { title: "Partida · Squadra" };

/**
 * One Partida. The first render comes from the server (RLS-filtered reads);
 * after that the presence list follows Supabase Realtime in the browser.
 */
export default async function PartidaPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ctx = await carregarGrupo(slug);
  if (ctx.status === "sem-sessao") return <EntrarParaVer />;
  if (ctx.status === "nao-encontrado" || !z.string().uuid().safeParse(id).success) return <FutNaoEncontrado />;

  const { supabase, grupo, user, agora } = ctx;
  const [{ data: partida }, { data: presencas }, { data: jogadores }] = await Promise.all([
    supabase
      .from("partidas")
      .select("id, grupo_id, inicio, local, vagas, cancelada_em")
      .eq("id", id)
      .eq("grupo_id", grupo.id)
      .maybeSingle(),
    supabase.from("presencas").select("jogador_id, situacao, pediu_vaga_em").eq("partida_id", id),
    supabase.from("players").select("id, name, position, ovr, conta_id").eq("grupo_id", grupo.id).order("name"),
  ]);
  if (!partida) return <FutNaoEncontrado />;

  return (
    <PartidaView
      grupo={grupo}
      userId={user.id}
      podeGerir={ehGestor(grupo.papel)}
      partidaInicial={partida as Partida}
      presencasIniciais={(presencas ?? []) as Presenca[]}
      jogadores={(jogadores ?? []) as JogadorDaLista[]}
      agora={agora}
    />
  );
}
