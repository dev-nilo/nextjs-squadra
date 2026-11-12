"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ehFotoDoGrupo, jogadorParaLinha, jogadorSchema } from "@/lib/jogador";

const idSchema = z.string().uuid();
/** Same check as `grupos.slug`; it only picks which page to revalidate. */
const slugSchema = z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const importacaoSchema = z
  .array(jogadorSchema.extend({ image: z.null() }))
  .min(1, "Nenhum jogador pra importar.")
  .max(200, "Importe até 200 Jogadores por vez.");

const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";
const SO_GESTOR = "Só quem organiza o fut mexe no elenco.";

type Resultado<T = null> = { ok: true; valor: T } | { ok: false; message: string };
type Erro = { code?: string; message?: string } | null;

function falha(error: Erro, acao: string, generica: string): { ok: false; message: string } {
  if (error?.code === "28000" || error?.code === "PGRST301") return { ok: false, message: SESSAO_EXPIRADA };
  // RLS refused the row: a membro trying what only the dono and admins can.
  if (error?.code === "42501") return { ok: false, message: SO_GESTOR };
  Sentry.captureException(error ?? new Error(`${acao} returned no row`), { tags: { action: acao } });
  return { ok: false, message: generica };
}

function grupoValido(slug: string, grupoId: string) {
  return slugSchema.safeParse(slug).success && idSchema.safeParse(grupoId).success;
}

/**
 * Creates or edits a Jogador in the Grupo; RLS only lets its dono and admins
 * do either. The rating is computed here from the attributes, and a new
 * Jogador's author is whoever is signed in.
 */
export async function salvarJogador(slug: string, grupoId: string, dados: unknown): Promise<Resultado<{ criado: boolean }>> {
  if (!grupoValido(slug, grupoId)) return { ok: false, message: "Fut inválido." };
  const parsed = jogadorSchema.safeParse(dados);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os dados do jogador." };
  const jogador = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: SESSAO_EXPIRADA };

  const { data: atual, error: erroAoLer } = await supabase
    .from("players")
    .select("id, image_url")
    .eq("id", jogador.id)
    .eq("grupo_id", grupoId)
    .maybeSingle();
  if (erroAoLer) return falha(erroAoLer, "salvarJogador", "Não deu pra salvar a carta agora. Tenta de novo.");

  // The photo stays as it was, is removed, or is one uploaded for this Grupo.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (jogador.image !== null && jogador.image !== atual?.image_url && !ehFotoDoGrupo(jogador.image, grupoId, supabaseUrl)) {
    return { ok: false, message: "Não deu pra usar essa foto. Envie de novo." };
  }

  const linha = jogadorParaLinha(jogador);
  if (atual) {
    const { data, error } = await supabase
      .from("players")
      .update({ ...linha, updated_at: new Date().toISOString() })
      .eq("id", jogador.id)
      .eq("grupo_id", grupoId)
      .select("id");
    if (error) return falha(error, "salvarJogador", "Não deu pra salvar a carta agora. Tenta de novo.");
    if (!data?.length) return { ok: false, message: SO_GESTOR };
  } else {
    const { error } = await supabase
      .from("players")
      .insert({ id: jogador.id, grupo_id: grupoId, user_id: user.id, ...linha });
    if (error) return falha(error, "salvarJogador", "Não deu pra criar a carta agora. Tenta de novo.");
  }

  revalidatePath(`/g/${slug}`);
  return { ok: true, valor: { criado: !atual } };
}

/** Removes a Jogador from the Elenco, with their presences. RLS only lets the dono and admins. */
export async function excluirJogador(slug: string, jogadorId: string): Promise<Resultado> {
  if (!slugSchema.safeParse(slug).success || !idSchema.safeParse(jogadorId).success) {
    return { ok: false, message: "Jogador inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("players").delete().eq("id", jogadorId).select("id");
  if (error) return falha(error, "excluirJogador", "Não deu pra excluir a carta agora. Tenta de novo.");
  if (!data?.length) return { ok: false, message: SO_GESTOR };

  revalidatePath(`/g/${slug}`);
  return { ok: true, valor: null };
}

/** Adds the Jogadores from a CSV in one insert: all of them or none. */
export async function importarJogadores(slug: string, grupoId: string, dados: unknown): Promise<Resultado<{ total: number }>> {
  if (!grupoValido(slug, grupoId)) return { ok: false, message: "Fut inválido." };
  const parsed = importacaoSchema.safeParse(dados);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const linha = typeof issue?.path[0] === "number" ? `Jogador ${issue.path[0] + 1}: ` : "";
    return { ok: false, message: `${linha}${issue?.message ?? "Confira o CSV."}` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: SESSAO_EXPIRADA };

  const { error } = await supabase
    .from("players")
    .insert(parsed.data.map((j) => ({ id: j.id, grupo_id: grupoId, user_id: user.id, ...jogadorParaLinha(j) })));
  if (error) return falha(error, "importarJogadores", "Não deu pra importar agora. Tenta de novo.");

  revalidatePath(`/g/${slug}`);
  return { ok: true, valor: { total: parsed.data.length } };
}
