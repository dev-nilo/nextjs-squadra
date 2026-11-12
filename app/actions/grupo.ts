"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { validarNomeDoGrupo, type Participacao } from "@/lib/grupo";
import { RECUSA_DA_DEMO } from "@/lib/demo";

export type CriarGrupoState =
  | { status: "idle" }
  | { status: "error"; message: string; nome: string }
  | { status: "ok"; grupo: Participacao };

const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";

/**
 * First access: the user names their Grupo. `criar_grupo` makes them its dono
 * and moves their Jogadores that have no Grupo into it, in one transaction.
 */
export async function criarGrupo(_prev: CriarGrupoState, formData: FormData): Promise<CriarGrupoState> {
  const raw = formData.get("nome");
  const nome = typeof raw === "string" ? raw : "";

  const validacao = validarNomeDoGrupo(nome);
  if (!validacao.ok) return { status: "error", message: validacao.message, nome };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: SESSAO_EXPIRADA, nome };

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
  if (jaTem) return { status: "ok", grupo: { ...jaTem, papel: "dono" } };

  const { data, error } = await supabase.rpc("criar_grupo", { nome_do_grupo: validacao.nome });
  if (error || !data) {
    if (error?.code === "28000") return { status: "error", message: SESSAO_EXPIRADA, nome };
    if (error?.hint === "demo") return { status: "error", message: RECUSA_DA_DEMO, nome };
    Sentry.captureException(error ?? new Error("criar_grupo returned no row"), { tags: { action: "criarGrupo" } });
    return { status: "error", message: "Não deu pra criar o fut agora. Tenta de novo.", nome };
  }

  return { status: "ok", grupo: { id: data.id, slug: data.slug, nome: data.nome, papel: "dono" } };
}
