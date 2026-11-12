import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ehFotoDoGrupo, jogadorParaLinha, jogadorSchema } from "@/lib/jogador";
import { exigir, exigirLinhas, idSchema, noGrupo, recusar, validar } from "./executar";

const importacaoSchema = z
  .array(jogadorSchema.extend({ image: z.null() }))
  .min(1, "Nenhum jogador pra importar.")
  .max(200, "Importe até 200 Jogadores por vez.");

/** An id already taken by a Jogador of another Grupo (only a tampered request sends one). */
const ID_DE_OUTRO_FUT = { "23505": "Esse jogador não é desse fut. Recarregue a página." };

/**
 * Creates or edits a Jogador in the Grupo; RLS only lets its dono and admins
 * do either. The rating is computed here from the attributes, and a new
 * Jogador's author is whoever is signed in.
 */
export const salvarJogador = (supabase: SupabaseClient, slug: unknown, dados: unknown) =>
  noGrupo(
    supabase,
    slug,
    { acao: "salvarJogador", generica: "Não deu pra salvar a carta agora. Tenta de novo.", motivos: ID_DE_OUTRO_FUT },
    async ({ user, grupo }) => {
      const jogador = validar(jogadorSchema, dados, "Confira os dados do jogador.");

      const { data: atual, error } = await supabase
        .from("players")
        .select("id, image_url")
        .eq("id", jogador.id)
        .eq("grupo_id", grupo.id)
        .maybeSingle();
      if (error) exigir({ data: null, error });

      // The photo stays as it was, is removed, or is one uploaded for this Grupo.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      if (jogador.image !== null && jogador.image !== atual?.image_url && !ehFotoDoGrupo(jogador.image, grupo.id, supabaseUrl)) {
        recusar("Não deu pra usar essa foto. Envie de novo.");
      }

      const linha = jogadorParaLinha(jogador);
      if (atual) {
        exigirLinhas(
          await supabase
            .from("players")
            .update({ ...linha, updated_at: new Date().toISOString() })
            .eq("id", jogador.id)
            .eq("grupo_id", grupo.id)
            .select("id"),
        );
      } else {
        exigir(
          await supabase
            .from("players")
            .insert({ id: jogador.id, grupo_id: grupo.id, user_id: user.id, ...linha })
            .select("id")
            .single(),
        );
      }
      return { criado: !atual };
    },
  );

/** Removes a Jogador from the Elenco, with their presences. RLS only lets the dono and admins. */
export const excluirJogador = (supabase: SupabaseClient, slug: unknown, jogadorId: unknown) =>
  noGrupo(supabase, slug, { acao: "excluirJogador", generica: "Não deu pra excluir a carta agora. Tenta de novo." }, async ({ grupo }) => {
    const id = validar(idSchema, jogadorId, "Jogador inválido.");
    exigirLinhas(await supabase.from("players").delete().eq("id", id).eq("grupo_id", grupo.id).select("id"));
    return null;
  });

/** Adds the Jogadores from a CSV in one insert: all of them or none. */
export const importarJogadores = (supabase: SupabaseClient, slug: unknown, dados: unknown) =>
  noGrupo(
    supabase,
    slug,
    { acao: "importarJogadores", generica: "Não deu pra importar agora. Tenta de novo.", motivos: ID_DE_OUTRO_FUT },
    async ({ user, grupo }) => {
      const parsed = importacaoSchema.safeParse(dados);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const linha = typeof issue?.path[0] === "number" ? `Jogador ${issue.path[0] + 1}: ` : "";
        recusar(`${linha}${issue?.message ?? "Confira o CSV."}`);
      }
      exigir(
        await supabase
          .from("players")
          .insert(parsed.data.map((j) => ({ id: j.id, grupo_id: grupo.id, user_id: user.id, ...jogadorParaLinha(j) })))
          .select("id"),
      );
      return { total: parsed.data.length };
    },
  );
