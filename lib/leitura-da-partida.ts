import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUNAS_DO_JOGADOR, jogadorDaLinha, type LinhaDoJogador } from "@/lib/jogador";
import type { Partida, Presenca } from "@/lib/partida";
import type { SorteioSalvo, TimeSalvo } from "@/lib/sorteio-partida";
import type { Player } from "@/types";

/**
 * How the screens read a Partida and the Grupo's history, with whichever
 * client the caller has: the server's for the first render, the browser's
 * when Realtime says something changed. Every read runs under the caller's
 * RLS, so a membro never gets a draft Sorteio and an outsider gets nothing.
 */

/** A live Jogador as the Partida page lists it (the Sorteio's snapshot is a separate copy, ADR 0004). */
export type JogadorDaLista = Pick<Player, "id" | "name" | "position" | "rating" | "conta_id">;

/** What changes while the page is open: the Partida itself, its presence list and its Sorteio. */
export type PartidaAoVivo = { partida: Partida; presencas: Presenca[]; sorteio: SorteioSalvo | null };

export type LeituraDaPartida = PartidaAoVivo & { jogadores: JogadorDaLista[] };

export type ResumoDaPartida = {
  id: string;
  inicio: string;
  local: string;
  vagas: number;
  cancelada_em: string | null;
  confirmados: number;
  /** Confirmed Jogadores, by name: who played, once the Partida is over. */
  quemFoi: string[];
  /** Published Times, by name; null when none were published. */
  times: { nome: string; jogadores: string[] }[] | null;
};

export type FrequenciaDoJogador = { nome: string; partidas: number; presencas: number; frequencia: number };

export type Historico = { partidas: ResumoDaPartida[]; frequencia: FrequenciaDoJogador[] };

const PARTIDA = "id, grupo_id, inicio, local, vagas, cancelada_em";
const PRESENCA = "jogador_id, situacao, pediu_vaga_em";
const SORTEIO = "times, publicado_em, sorteado_em";
/** How many Partidas the history page lists. */
const HISTORICO = 40;

type Erro = { message: string } | null;

function semErro<T>({ data, error }: { data: T; error: Erro }, leitura: string): T {
  if (error) throw new Error(`${leitura}: ${error.message}`);
  return data;
}

/** The live part of a Partida of the Grupo, or null when there's none the caller can see. */
export async function lerPartidaAoVivo(supabase: SupabaseClient, grupoId: string, id: string): Promise<PartidaAoVivo | null> {
  const [partida, presencas, sorteio] = await Promise.all([
    supabase.from("partidas").select(PARTIDA).eq("id", id).eq("grupo_id", grupoId).maybeSingle(),
    supabase.from("presencas").select(PRESENCA).eq("partida_id", id),
    // RLS: the dono and admins get the draft; everyone else only a published one.
    supabase.from("sorteios").select(SORTEIO).eq("partida_id", id).maybeSingle(),
  ]);
  const lida = semErro(partida, "partida");
  if (!lida) return null;
  return {
    partida: lida as Partida,
    presencas: (semErro(presencas, "presencas") ?? []) as Presenca[],
    sorteio: (semErro(sorteio, "sorteio") ?? null) as SorteioSalvo | null,
  };
}

/** Everything the Partida page shows, or null when there's no such Partida for the caller. */
export async function lerPartida(supabase: SupabaseClient, grupoId: string, id: string): Promise<LeituraDaPartida | null> {
  const [aoVivo, jogadores] = await Promise.all([
    lerPartidaAoVivo(supabase, grupoId, id),
    supabase.from("players").select(COLUNAS_DO_JOGADOR).eq("grupo_id", grupoId).order("name"),
  ]);
  if (!aoVivo) return null;
  const linhas = (semErro(jogadores, "jogadores") ?? []) as unknown as LinhaDoJogador[];
  return { ...aoVivo, jogadores: linhas.map(jogadorDaLinha) };
}

const porNome = (a: string, b: string) => a.localeCompare(b, "pt-BR");

/**
 * The Grupo's last Partidas, newest first, each with who was confirmed (by
 * name) and its published Times; and each Jogador's Frequência, highest
 * first, leaving out whoever had no Partida to count yet.
 */
export async function lerHistorico(supabase: SupabaseClient, grupoId: string): Promise<Historico> {
  const partidas =
    semErro(
      await supabase
        .from("partidas")
        .select("id, inicio, local, vagas, cancelada_em")
        .eq("grupo_id", grupoId)
        .order("inicio", { ascending: false })
        .limit(HISTORICO),
      "partidas",
    ) ?? [];

  const ids = partidas.map((p) => p.id as string);
  const [confirmados, sorteios, jogadores, frequencias] = await Promise.all([
    ids.length
      ? supabase.from("presencas").select("partida_id, jogador_id").in("partida_id", ids).eq("situacao", "confirmado")
      : Promise.resolve({ data: [] as { partida_id: string; jogador_id: string }[], error: null }),
    // RLS hides drafts from membros; the history only shows published Times anyway.
    ids.length
      ? supabase.from("sorteios").select("partida_id, times").in("partida_id", ids).not("publicado_em", "is", null)
      : Promise.resolve({ data: [] as { partida_id: string; times: unknown }[], error: null }),
    supabase.from("players").select("id, name").eq("grupo_id", grupoId),
    supabase.from("frequencia_jogadores").select("jogador_id, partidas, presencas, frequencia").eq("grupo_id", grupoId),
  ]);

  const nome = new Map((semErro(jogadores, "jogadores") ?? []).map((j) => [j.id as string, j.name as string]));
  const nomeDe = (id: string) => nome.get(id) ?? "Jogador";

  const quemFoi = new Map<string, string[]>();
  for (const c of semErro(confirmados, "confirmados") ?? []) {
    quemFoi.set(c.partida_id, [...(quemFoi.get(c.partida_id) ?? []), nomeDe(c.jogador_id)]);
  }
  const timesDe = new Map((semErro(sorteios, "sorteios") ?? []).map((s) => [s.partida_id as string, s.times as TimeSalvo[]]));

  return {
    partidas: partidas.map((p) => {
      const nomes = [...(quemFoi.get(p.id) ?? [])].sort(porNome);
      const times = timesDe.get(p.id);
      return {
        id: p.id,
        inicio: p.inicio,
        local: p.local,
        vagas: p.vagas,
        cancelada_em: p.cancelada_em,
        confirmados: nomes.length,
        quemFoi: nomes,
        times: times ? times.map((t) => ({ nome: t.nome, jogadores: t.jogadores.map((j) => j.name) })) : null,
      };
    }),
    frequencia: (semErro(frequencias, "frequencia") ?? [])
      .filter((f) => f.partidas > 0)
      .map((f) => ({ nome: nomeDe(f.jogador_id), partidas: f.partidas, presencas: f.presencas, frequencia: f.frequencia ?? 0 }))
      .sort((a, b) => b.frequencia - a.frequencia || porNome(a.nome, b.nome)),
  };
}
