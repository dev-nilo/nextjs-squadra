import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validarNomeDoGrupo, type Participacao } from "@/lib/grupo";
import { comSessao, exigir, recusar } from "./executar";

/**
 * First access: the user names their Grupo. `criar_grupo` makes them its dono
 * and moves their Jogadores that have no Grupo into it, in one transaction.
 */
export const criarGrupo = (supabase: SupabaseClient, nome: string) =>
  comSessao(supabase, { acao: "criarGrupo", generica: "Não deu pra criar o fut agora. Tenta de novo." }, async ({ user }): Promise<Participacao> => {
    const validacao = validarNomeDoGrupo(nome);
    if (!validacao.ok) recusar(validacao.message);

    // A second submit (another tab, a retry after a lost response) must not
    // create a second Grupo: hand back the one this user already owns.
    const { data: existente } = await supabase
      .from("grupo_membros")
      .select("grupos(id, slug, nome)")
      .eq("user_id", user.id)
      .eq("papel", "dono")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const jaTem = existente?.grupos as { id: string; slug: string; nome: string } | null | undefined;
    if (jaTem) return { ...jaTem, papel: "dono" };

    const criado = exigir(await supabase.rpc("criar_grupo", { nome_do_grupo: validacao.nome }));
    return { id: criado.id, slug: criado.slug, nome: criado.nome, papel: "dono" };
  });
