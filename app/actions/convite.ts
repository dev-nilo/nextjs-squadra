"use server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PROBLEMA_DO_CONVITE, situacaoDoConvite, tokenDoConviteSchema } from "@/lib/convite";

const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";
const idSchema = z.string().uuid();

export type Convite = { id: string; token: string; expira_em: string };

type Resultado<T> = { ok: true; valor: T } | { ok: false; message: string };

/** A new invite link for the Grupo. RLS only lets its dono and admins create one. */
export async function criarConvite(grupoId: string): Promise<Resultado<Convite>> {
  if (!idSchema.safeParse(grupoId).success) return { ok: false, message: "Fut inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("convites")
    .insert({ grupo_id: grupoId })
    .select("id, token, expira_em")
    .single();

  if (error || !data) {
    if (error?.code === "42501") return { ok: false, message: "Só quem organiza o fut pode convidar." };
    if (error?.code === "PGRST301") return { ok: false, message: SESSAO_EXPIRADA };
    Sentry.captureException(error ?? new Error("convites insert returned no row"), { tags: { action: "criarConvite" } });
    return { ok: false, message: "Não deu pra gerar o link agora. Tenta de novo." };
  }
  return { ok: true, valor: data };
}

/** Stops a link from working. Already-joined Membros stay. */
export async function revogarConvite(conviteId: string): Promise<Resultado<null>> {
  if (!idSchema.safeParse(conviteId).success) return { ok: false, message: "Convite inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("convites")
    .update({ revogado_em: new Date().toISOString() })
    .eq("id", conviteId)
    .select("id");

  if (error) {
    Sentry.captureException(error, { tags: { action: "revogarConvite" } });
    return { ok: false, message: "Não deu pra cancelar o link agora. Tenta de novo." };
  }
  if (!data?.length) return { ok: false, message: "Só quem organiza o fut pode cancelar convites." };
  return { ok: true, valor: null };
}

/** The signed-in user joins the link's Grupo as membro (or keeps their papel). */
export async function aceitarConvite(token: string): Promise<Resultado<{ slug: string; nome: string }>> {
  if (!tokenDoConviteSchema.safeParse(token).success) {
    return { ok: false, message: PROBLEMA_DO_CONVITE.inexistente.titulo };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: SESSAO_EXPIRADA };

  const { data, error } = await supabase.rpc("aceitar_convite", { token_do_convite: token });
  if (error || !data) {
    if (error?.code === "28000") return { ok: false, message: SESSAO_EXPIRADA };
    const motivo = situacaoDoConvite(error?.hint);
    if (error?.hint && motivo !== "valido") return { ok: false, message: PROBLEMA_DO_CONVITE[motivo].titulo };
    Sentry.captureException(error ?? new Error("aceitar_convite returned no row"), { tags: { action: "aceitarConvite" } });
    return { ok: false, message: "Não deu pra entrar no fut agora. Tenta de novo." };
  }
  return { ok: true, valor: { slug: data.slug, nome: data.nome } };
}
