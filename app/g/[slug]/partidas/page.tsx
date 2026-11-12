import type { Metadata } from "next";
import { EntrarParaVer, FutNaoEncontrado } from "@/components/partida/entrar-para-ver";
import { PartidasView, type FrequenciaDoJogador, type ResumoDaPartida } from "@/components/partida/partidas-view";
import type { TimeSalvo } from "@/lib/sorteio-partida";
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
  const [{ data: confirmados }, { data: sorteios }, { data: jogadores }, { data: frequencias }] = await Promise.all([
    ids.length
      ? supabase.from("presencas").select("partida_id, jogador_id").in("partida_id", ids).eq("situacao", "confirmado")
      : Promise.resolve({ data: [] as { partida_id: string; jogador_id: string }[] }),
    // RLS hides drafts from membros; the history only shows published Times anyway.
    ids.length
      ? supabase.from("sorteios").select("partida_id, times").in("partida_id", ids).not("publicado_em", "is", null)
      : Promise.resolve({ data: [] as { partida_id: string; times: unknown }[] }),
    supabase.from("players").select("id, name").eq("grupo_id", grupo.id),
    supabase.from("frequencia_jogadores").select("jogador_id, partidas, presencas, frequencia").eq("grupo_id", grupo.id),
  ]);

  const nome = new Map((jogadores ?? []).map((j) => [j.id, j.name as string]));
  const quemFoi = new Map<string, string[]>();
  for (const c of confirmados ?? []) quemFoi.set(c.partida_id, [...(quemFoi.get(c.partida_id) ?? []), nome.get(c.jogador_id) ?? "Jogador"]);
  const timesDe = new Map((sorteios ?? []).map((s) => [s.partida_id, s.times as TimeSalvo[]]));

  const resumo: ResumoDaPartida[] = (partidas ?? []).map((p) => {
    const nomes = (quemFoi.get(p.id) ?? []).sort((a, b) => a.localeCompare(b, "pt-BR"));
    const times = timesDe.get(p.id);
    return {
      ...p,
      confirmados: nomes.length,
      quemFoi: nomes,
      times: times ? times.map((t) => ({ nome: t.nome, jogadores: t.jogadores.map((j) => j.name) })) : null,
    };
  });

  const frequencia: FrequenciaDoJogador[] = (frequencias ?? [])
    .filter((f) => f.partidas > 0)
    .map((f) => ({ nome: nome.get(f.jogador_id) ?? "Jogador", partidas: f.partidas, presencas: f.presencas, frequencia: f.frequencia ?? 0 }))
    .sort((a, b) => b.frequencia - a.frequencia || a.nome.localeCompare(b.nome, "pt-BR"));

  return <PartidasView grupo={grupo} partidas={resumo} frequencia={frequencia} podeCriar={ehGestor(grupo.papel)} agora={agora} />;
}
