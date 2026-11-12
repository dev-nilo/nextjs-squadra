"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizePlayer } from "@/lib/jogador";
import { sortearTimes } from "@/lib/sorteio";
import {
  atribuicao,
  cabeNoSorteio,
  MAX_TIMES,
  minimoDeConfirmados,
  MOTIVO_DO_SORTEIO,
  numeroDeTimesSchema,
} from "@/lib/sorteio-partida";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const sorteadoEmSchema = z.string().datetime({ offset: true });
const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";

type Resultado = { ok: true } | { ok: false; message: string };

function falha(error: { code?: string; hint?: string | null } | null, acao: string, generica: string): Resultado {
  if (error?.code === "28000" || error?.code === "PGRST301") return { ok: false, message: SESSAO_EXPIRADA };
  if (error?.hint && MOTIVO_DO_SORTEIO[error.hint]) return { ok: false, message: MOTIVO_DO_SORTEIO[error.hint] };
  Sentry.captureException(error ?? new Error(`${acao} returned no row`), { tags: { action: acao } });
  return { ok: false, message: generica };
}

/**
 * Draws the Times on the server, over the confirmed Jogadores as the database
 * has them. The browser only says how many Times; it never sends Jogadores or
 * ratings, so a draw can't be rigged from DevTools.
 */
export async function sortearDaPartida(slug: string, partidaId: string, numTimes: number): Promise<Resultado> {
  if (!idSchema.safeParse(partidaId).success) return { ok: false, message: "Partida inválida." };
  const quantos = numeroDeTimesSchema.safeParse(numTimes);
  if (!quantos.success) return { ok: false, message: quantos.error.issues[0]?.message ?? "Número de times inválido." };

  const supabase = await createClient();
  const { data: confirmados, error: erroLeitura } = await supabase
    .from("presencas")
    .select("players(id, name, position, nationality, image_url, ovr, velocidade, resistencia, chute, posicionamento, defesa, drible, passe, fisico)")
    .eq("partida_id", partidaId)
    .eq("situacao", "confirmado");
  if (erroLeitura) return falha(erroLeitura, "sortearDaPartida", "Não deu pra ler os confirmados agora.");

  const jogadores = (confirmados ?? []).flatMap((c) => (c.players ? [normalizePlayer(c.players)] : []));
  if (!cabeNoSorteio(jogadores.length, quantos.data)) {
    return {
      ok: false,
      message: `Pra ${quantos.data} Times precisa de pelo menos ${minimoDeConfirmados(quantos.data)} confirmados (tem ${jogadores.length}).`,
    };
  }

  const times = sortearTimes(jogadores, quantos.data);
  const { data, error } = await supabase.rpc("salvar_sorteio", { partida: partidaId, times: atribuicao(times), novo: true });
  if (error || !data) return falha(error, "sortearDaPartida", "Não deu pra salvar o sorteio agora. Tenta de novo.");

  revalidatePath(`/g/${slug}/partidas/${partidaId}`);
  return { ok: true };
}

/**
 * Moves a Jogador to another Time (before publishing). Ratings stay as drawn.
 * The move happens inside mover_no_sorteio, under the Partida's lock, so two
 * admins moving at once both get their move. `sorteadoEm` is the draw the
 * admin is looking at: if the Times were drawn again since, it's refused.
 */
export async function moverNoSorteio(
  slug: string,
  partidaId: string,
  jogadorId: string,
  paraTime: number,
  sorteadoEm: string,
): Promise<Resultado> {
  if (!idSchema.safeParse(partidaId).success || !idSchema.safeParse(jogadorId).success) {
    return { ok: false, message: "Partida ou jogador inválido." };
  }
  if (!Number.isInteger(paraTime) || paraTime < 0 || paraTime >= MAX_TIMES) {
    return { ok: false, message: "Time inválido." };
  }
  if (!sorteadoEmSchema.safeParse(sorteadoEm).success) return { ok: false, message: MOTIVO_DO_SORTEIO["sorteio-mudou"] };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mover_no_sorteio", {
    partida: partidaId,
    jogador: jogadorId,
    para_time: paraTime,
    sorteado_em: sorteadoEm,
  });
  if (error || !data) return falha(error, "moverNoSorteio", "Não deu pra mover agora. Tenta de novo.");

  revalidatePath(`/g/${slug}/partidas/${partidaId}`);
  return { ok: true };
}

/** Shows the Times to every Membro and freezes them. */
export async function publicarSorteio(slug: string, partidaId: string): Promise<Resultado> {
  if (!idSchema.safeParse(partidaId).success) return { ok: false, message: "Partida inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publicar_sorteio", { partida: partidaId });
  if (error || !data) return falha(error, "publicarSorteio", "Não deu pra publicar agora. Tenta de novo.");
  revalidatePath(`/g/${slug}/partidas/${partidaId}`);
  return { ok: true };
}
