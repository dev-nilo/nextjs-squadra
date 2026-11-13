import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { COLUNAS_DO_JOGADOR, jogadorDaLinha, type LinhaDoJogador } from "@/lib/jogador";
import { sortearTimes } from "@/lib/sorteio";
import {
  atribuicao,
  cabeNoSorteio,
  MAX_TIMES,
  minimoDeConfirmados,
  MOTIVO_DO_SORTEIO,
  numeroDeTimesSchema,
} from "@/lib/sorteio-partida";
import { exigir, idSchema, noGrupo, recusar, validar } from "./executar";

const paraTimeSchema = z.number().int().min(0).max(MAX_TIMES - 1);
const sorteadoEmSchema = z.string().datetime({ offset: true });

/**
 * Draws the Times on the server, over the confirmed Jogadores as the database
 * has them. The browser only says how many Times; it never sends Jogadores or
 * ratings, so a draw can't be rigged from DevTools.
 */
export const sortearDaPartida = (supabase: SupabaseClient, slug: unknown, partidaId: unknown, numTimes: unknown) =>
  noGrupo(
    supabase,
    slug,
    { acao: "sortearDaPartida", generica: "Não deu pra salvar o sorteio agora. Tenta de novo.", motivos: MOTIVO_DO_SORTEIO },
    async () => {
      const partida = validar(idSchema, partidaId, "Partida inválida.");
      const quantos = validar(numeroDeTimesSchema, numTimes, "Número de times inválido.");

      const confirmados = exigir(
        await supabase
          .from("presencas")
          .select(`players(${COLUNAS_DO_JOGADOR})`)
          .eq("partida_id", partida)
          .eq("situacao", "confirmado"),
      );
      const jogadores = (confirmados as unknown as { players: LinhaDoJogador | null }[]).flatMap((c) =>
        c.players ? [jogadorDaLinha(c.players)] : [],
      );
      if (!cabeNoSorteio(jogadores.length, quantos)) {
        recusar(`Pra ${quantos} Times precisa de pelo menos ${minimoDeConfirmados(quantos)} confirmados (tem ${jogadores.length}).`);
      }

      exigir(await supabase.rpc("salvar_sorteio", { partida, times: atribuicao(sortearTimes(jogadores, quantos)) }));
      return null;
    },
  );

/**
 * Moves a Jogador to another Time (before publishing). Ratings stay as drawn.
 * The move happens inside mover_no_sorteio, under the Partida's lock, so two
 * admins moving at once both get their move. `sorteadoEm` is the draw the
 * admin is looking at: if the Times were drawn again since, it's refused.
 */
export const moverNoSorteio = (
  supabase: SupabaseClient,
  slug: unknown,
  partidaId: unknown,
  jogadorId: unknown,
  paraTime: unknown,
  sorteadoEm: unknown,
) =>
  noGrupo(
    supabase,
    slug,
    { acao: "moverNoSorteio", generica: "Não deu pra mover agora. Tenta de novo.", motivos: MOTIVO_DO_SORTEIO },
    async () => {
      const partida = validar(idSchema, partidaId, "Partida inválida.");
      const jogador = validar(idSchema, jogadorId, "Jogador inválido.");
      const para_time = validar(paraTimeSchema, paraTime, "Time inválido.");
      const sorteado_em = validar(sorteadoEmSchema, sorteadoEm, MOTIVO_DO_SORTEIO["sorteio-mudou"]);
      exigir(await supabase.rpc("mover_no_sorteio", { partida, jogador, para_time, sorteado_em }));
      return null;
    },
  );

/** Shows the Times to every Membro and freezes them. */
export const publicarSorteio = (supabase: SupabaseClient, slug: unknown, partidaId: unknown) =>
  noGrupo(
    supabase,
    slug,
    { acao: "publicarSorteio", generica: "Não deu pra publicar agora. Tenta de novo.", motivos: MOTIVO_DO_SORTEIO },
    async () => {
      const partida = validar(idSchema, partidaId, "Partida inválida.");
      exigir(await supabase.rpc("publicar_sorteio", { partida }));
      return null;
    },
  );
