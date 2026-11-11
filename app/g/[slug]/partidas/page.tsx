import type { Metadata } from "next";
import { EntrarParaVer, FutNaoEncontrado } from "@/components/partida/entrar-para-ver";
import { PartidasView, type ResumoDaPartida } from "@/components/partida/partidas-view";
import { carregarGrupo, ehGestor } from "@/lib/grupo-server";

export const metadata: Metadata = { title: "Partidas · Squadra" };

/** The Grupo's Partidas, read on the server under the user's RLS. */
export default async function PartidasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await carregarGrupo(slug);
  if (ctx.status === "sem-sessao") return <EntrarParaVer />;
  if (ctx.status === "nao-encontrado") return <FutNaoEncontrado />;

  const { supabase, grupo, agora } = ctx;
  const { data: partidas } = await supabase
    .from("partidas")
    .select("id, inicio, local, vagas, cancelada_em")
    .eq("grupo_id", grupo.id)
    .order("inicio", { ascending: false })
    .limit(40);

  const ids = (partidas ?? []).map((p) => p.id);
  const { data: confirmados } = ids.length
    ? await supabase.from("presencas").select("partida_id").in("partida_id", ids).eq("situacao", "confirmado")
    : { data: [] as { partida_id: string }[] };
  const contagem = new Map<string, number>();
  for (const c of confirmados ?? []) contagem.set(c.partida_id, (contagem.get(c.partida_id) ?? 0) + 1);

  const resumo: ResumoDaPartida[] = (partidas ?? []).map((p) => ({ ...p, confirmados: contagem.get(p.id) ?? 0 }));

  return <PartidasView grupo={grupo} partidas={resumo} podeCriar={ehGestor(grupo.papel)} agora={agora} />;
}
