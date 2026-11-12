import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROBLEMA_DO_CONVITE, tokenDoConviteSchema } from "@/lib/convite";
import { comSessao, exigir, exigirLinhas, idSchema, noGrupo, recusar, validar } from "./executar";

export type Convite = { id: string; token: string; expira_em: string };

/** A new invite link for the Grupo. RLS only lets its dono and admins create one. */
export const criarConvite = (supabase: SupabaseClient, slug: unknown) =>
  noGrupo(supabase, slug, { acao: "criarConvite", generica: "Não deu pra gerar o link agora. Tenta de novo." }, async ({ grupo }) =>
    exigir(await supabase.from("convites").insert({ grupo_id: grupo.id }).select("id, token, expira_em").single()) as Convite,
  );

/** Stops a link from working. Already-joined Membros stay. */
export const revogarConvite = (supabase: SupabaseClient, slug: unknown, conviteId: unknown) =>
  noGrupo(supabase, slug, { acao: "revogarConvite", generica: "Não deu pra cancelar o link agora. Tenta de novo." }, async ({ grupo }) => {
    const id = validar(idSchema, conviteId, "Convite inválido.");
    exigirLinhas(
      await supabase.from("convites").update({ revogado_em: new Date().toISOString() }).eq("id", id).eq("grupo_id", grupo.id).select("id"),
    );
    return null;
  });

const MOTIVO_DO_CONVITE = {
  inexistente: PROBLEMA_DO_CONVITE.inexistente.titulo,
  revogado: PROBLEMA_DO_CONVITE.revogado.titulo,
  expirado: PROBLEMA_DO_CONVITE.expirado.titulo,
};

/** The signed-in user joins the link's Grupo as membro (or keeps their papel). */
export const aceitarConvite = (supabase: SupabaseClient, token: unknown) =>
  comSessao(
    supabase,
    { acao: "aceitarConvite", generica: "Não deu pra entrar no fut agora. Tenta de novo.", motivos: MOTIVO_DO_CONVITE },
    async () => {
      const valido = tokenDoConviteSchema.safeParse(token);
      if (!valido.success) recusar(PROBLEMA_DO_CONVITE.inexistente.titulo);
      const { slug, nome } = exigir(await supabase.rpc("aceitar_convite", { token_do_convite: valido.data }));
      return { slug: slug as string, nome: nome as string };
    },
  );
