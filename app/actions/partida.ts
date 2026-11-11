"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MOTIVO_DA_PRESENCA, partidaSchema, type SituacaoPresenca } from "@/lib/partida";

const idSchema = z.string().uuid();
const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";

type Resultado<T = null> = { ok: true; valor: T } | { ok: false; message: string };

type Erro = { code?: string; hint?: string | null; message?: string } | null;

function falha(error: Erro, acao: string, generica: string): { ok: false; message: string } {
  if (error?.code === "28000" || error?.code === "PGRST301") return { ok: false, message: SESSAO_EXPIRADA };
  if (error?.hint && MOTIVO_DA_PRESENCA[error.hint]) return { ok: false, message: MOTIVO_DA_PRESENCA[error.hint] };
  if (error?.code === "42501") return { ok: false, message: "Só quem organiza o fut pode fazer isso." };
  if (error?.code === "23514") return { ok: false, message: "Confira o local e as vagas." };
  Sentry.captureException(error ?? new Error(`${acao} returned no row`), { tags: { action: acao } });
  return { ok: false, message: generica };
}

type DadosDaPartida = { inicio: string; local: string; vagas: number | string };

function validar(dados: DadosDaPartida) {
  const parsed = partidaSchema.safeParse(dados);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Confira os dados." };
  return { ok: true as const, valor: { ...parsed.data, inicio: parsed.data.inicio.toISOString() } };
}

/** A new Partida in the Grupo. RLS only lets its dono and admins create one. */
export async function criarPartida(slug: string, grupoId: string, dados: DadosDaPartida): Promise<Resultado<{ id: string }>> {
  if (!idSchema.safeParse(grupoId).success) return { ok: false, message: "Fut inválido." };
  const validos = validar(dados);
  if (!validos.ok) return validos;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partidas")
    .insert({ grupo_id: grupoId, ...validos.valor })
    .select("id")
    .single();
  if (error || !data) return falha(error, "criarPartida", "Não deu pra criar a Partida agora. Tenta de novo.");

  revalidatePath(`/g/${slug}/partidas`);
  return { ok: true, valor: { id: data.id } };
}

/** Changes the start, place or vagas. More vagas promote the lista de espera (in the database). */
export async function editarPartida(slug: string, partidaId: string, dados: DadosDaPartida): Promise<Resultado> {
  if (!idSchema.safeParse(partidaId).success) return { ok: false, message: "Partida inválida." };
  const validos = validar(dados);
  if (!validos.ok) return validos;

  const supabase = await createClient();
  const { data, error } = await supabase.from("partidas").update(validos.valor).eq("id", partidaId).select("id");
  if (error) return falha(error, "editarPartida", "Não deu pra salvar a Partida agora. Tenta de novo.");
  if (!data?.length) return { ok: false, message: "Só quem organiza o fut pode editar a Partida." };

  revalidatePath(`/g/${slug}/partidas`);
  revalidatePath(`/g/${slug}/partidas/${partidaId}`);
  return { ok: true, valor: null };
}

/** Cancels a Partida. Its presence list stays, frozen. */
export async function cancelarPartida(slug: string, partidaId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidaId).success) return { ok: false, message: "Partida inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partidas")
    .update({ cancelada_em: new Date().toISOString() })
    .eq("id", partidaId)
    .is("cancelada_em", null)
    .select("id");
  if (error) return falha(error, "cancelarPartida", "Não deu pra cancelar agora. Tenta de novo.");
  if (!data?.length) return { ok: false, message: "Só quem organiza o fut pode cancelar a Partida." };

  revalidatePath(`/g/${slug}/partidas`);
  revalidatePath(`/g/${slug}/partidas/${partidaId}`);
  return { ok: true, valor: null };
}

/** Vou / não vou, through responder_presenca (the Partida's row lock decides the last vaga). */
export async function responderPresenca(
  partidaId: string,
  jogadorId: string,
  vou: boolean,
): Promise<Resultado<{ situacao: SituacaoPresenca }>> {
  if (!idSchema.safeParse(partidaId).success || !idSchema.safeParse(jogadorId).success) {
    return { ok: false, message: "Partida ou Jogador inválido." };
  }
  if (typeof vou !== "boolean") return { ok: false, message: "Resposta inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("responder_presenca", { partida: partidaId, jogador: jogadorId, vou });
  if (error || !data) return falha(error, "responderPresenca", "Não deu pra responder agora. Tenta de novo.");
  return { ok: true, valor: { situacao: data.situacao } };
}
