import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MOTIVO_DO_VINCULO, meuJogadorSchema } from "@/lib/vinculo";
import { exigir, idSchema, noGrupo, validar } from "./executar";

const MOTIVOS = {
  ...MOTIVO_DO_VINCULO,
  // Two claims racing for the same account hit the unique index.
  "23505": MOTIVO_DO_VINCULO["ja-tem-jogador"],
  "22023": "Confira o nome e a posição.",
};

/** "Sou esse aqui": link the signed-in account to a Jogador with none. */
export const vincularJogador = (supabase: SupabaseClient, slug: unknown, jogadorId: unknown) =>
  noGrupo(supabase, slug, { acao: "vincularJogador", generica: "Não deu pra vincular agora. Tenta de novo.", motivos: MOTIVOS }, async () => {
    const jogador = validar(idSchema, jogadorId, "Jogador inválido.");
    exigir(await supabase.rpc("vincular_jogador", { jogador }));
    return null;
  });

/** "Não estou na lista": add the signed-in user to the Elenco, already linked. */
export const criarMeuJogador = (supabase: SupabaseClient, slug: unknown, nome: unknown, posicao: unknown) =>
  noGrupo(
    supabase,
    slug,
    { acao: "criarMeuJogador", generica: "Não deu pra criar seu jogador agora. Tenta de novo.", motivos: MOTIVOS },
    async ({ grupo }) => {
      const dados = validar(meuJogadorSchema, { nome, posicao }, "Confira o nome e a posição.");
      exigir(await supabase.rpc("criar_meu_jogador", { grupo: grupo.id, nome: dados.nome, posicao: dados.posicao }));
      return null;
    },
  );

/** Unlink a Jogador from its account (dono, admin, or the person themselves). */
export const desvincularJogador = (supabase: SupabaseClient, slug: unknown, jogadorId: unknown) =>
  noGrupo(supabase, slug, { acao: "desvincularJogador", generica: "Não deu pra desvincular agora. Tenta de novo.", motivos: MOTIVOS }, async () => {
    const jogador = validar(idSchema, jogadorId, "Jogador inválido.");
    exigir(await supabase.rpc("desvincular_jogador", { jogador }));
    return null;
  });
