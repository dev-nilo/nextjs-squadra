import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MOTIVO_DA_PRESENCA, partidaSchema, type SituacaoPresenca } from "@/lib/partida";
import { exigir, exigirLinhas, idSchema, noGrupo, validar } from "./executar";

export type DadosDaPartida = { inicio: string; local: string; vagas: number | string };

const MOTIVOS = { ...MOTIVO_DA_PRESENCA, "23514": "Confira o local e as vagas." };

function dadosValidos(dados: unknown) {
  const valido = validar(partidaSchema, dados, "Confira os dados.");
  return { ...valido, inicio: valido.inicio.toISOString() };
}

/** A new Partida in the Grupo. RLS only lets its dono and admins create one. */
export const criarPartida = (supabase: SupabaseClient, slug: unknown, dados: unknown) =>
  noGrupo(
    supabase,
    slug,
    { acao: "criarPartida", generica: "Não deu pra criar a partida agora. Tenta de novo.", motivos: MOTIVOS },
    async ({ grupo }) => {
      const valores = dadosValidos(dados);
      const { id } = exigir(await supabase.from("partidas").insert({ grupo_id: grupo.id, ...valores }).select("id").single());
      return { id: id as string };
    },
  );

/** Changes the start, place or vagas. More vagas promote the lista de espera (in the database). */
export const editarPartida = (supabase: SupabaseClient, slug: unknown, partidaId: unknown, dados: unknown) =>
  noGrupo(
    supabase,
    slug,
    { acao: "editarPartida", generica: "Não deu pra salvar a partida agora. Tenta de novo.", motivos: MOTIVOS },
    async ({ grupo }) => {
      const id = validar(idSchema, partidaId, "Partida inválida.");
      const valores = dadosValidos(dados);
      exigirLinhas(await supabase.from("partidas").update(valores).eq("id", id).eq("grupo_id", grupo.id).select("id"));
      return null;
    },
  );

/** Cancels a Partida. Its presence list stays, frozen. */
export const cancelarPartida = (supabase: SupabaseClient, slug: unknown, partidaId: unknown) =>
  noGrupo(supabase, slug, { acao: "cancelarPartida", generica: "Não deu pra cancelar agora. Tenta de novo." }, async ({ grupo }) => {
    const id = validar(idSchema, partidaId, "Partida inválida.");
    exigirLinhas(
      await supabase
        .from("partidas")
        .update({ cancelada_em: new Date().toISOString() })
        .eq("id", id)
        .eq("grupo_id", grupo.id)
        .is("cancelada_em", null)
        .select("id"),
    );
    return null;
  });

/** Vou / não vou, through responder_presenca (the Partida's row lock decides the last vaga). */
export const responderPresenca = (supabase: SupabaseClient, slug: unknown, partidaId: unknown, jogadorId: unknown, vou: unknown) =>
  noGrupo(
    supabase,
    slug,
    { acao: "responderPresenca", generica: "Não deu pra responder agora. Tenta de novo.", motivos: MOTIVOS },
    async () => {
      const partida = validar(idSchema, partidaId, "Partida inválida.");
      const jogador = validar(idSchema, jogadorId, "Jogador inválido.");
      const resposta = validar(z.boolean(), vou, "Resposta inválida.");
      const { situacao } = exigir(await supabase.rpc("responder_presenca", { partida, jogador, vou: resposta }));
      return { situacao: situacao as SituacaoPresenca };
    },
  );
