"use server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MOTIVO_DO_VINCULO, meuJogadorSchema } from "@/lib/vinculo";

const idSchema = z.string().uuid();
const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";

type Resultado = { ok: true } | { ok: false; message: string };

function falha(error: { code?: string; hint?: string | null } | null, acao: string, generica: string): Resultado {
  if (error?.code === "28000") return { ok: false, message: SESSAO_EXPIRADA };
  // Two claims racing for the same account hit the unique index.
  if (error?.code === "23505") return { ok: false, message: MOTIVO_DO_VINCULO["ja-tem-jogador"] };
  if (error?.hint && MOTIVO_DO_VINCULO[error.hint]) return { ok: false, message: MOTIVO_DO_VINCULO[error.hint] };
  if (error?.code === "22023") return { ok: false, message: "Confira o nome e a posição." };
  Sentry.captureException(error ?? new Error(`${acao} returned no row`), { tags: { action: acao } });
  return { ok: false, message: generica };
}

/** "Sou esse aqui": link the signed-in account to a Jogador with none. */
export async function vincularJogador(jogadorId: string): Promise<Resultado> {
  if (!idSchema.safeParse(jogadorId).success) return { ok: false, message: "Jogador inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vincular_jogador", { jogador: jogadorId });
  if (error || !data) return falha(error, "vincularJogador", "Não deu pra vincular agora. Tenta de novo.");
  return { ok: true };
}

/** "Não estou na lista": add the signed-in user to the Elenco, already linked. */
export async function criarMeuJogador(grupoId: string, nome: string, posicao: string): Promise<Resultado> {
  if (!idSchema.safeParse(grupoId).success) return { ok: false, message: "Fut inválido." };
  const dados = meuJogadorSchema.safeParse({ nome, posicao });
  if (!dados.success) return { ok: false, message: dados.error.issues[0]?.message ?? "Confira o nome e a posição." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_meu_jogador", {
    grupo: grupoId,
    nome: dados.data.nome,
    posicao: dados.data.posicao,
  });
  if (error || !data) return falha(error, "criarMeuJogador", "Não deu pra criar seu Jogador agora. Tenta de novo.");
  return { ok: true };
}

/** Unlink a Jogador from its account (dono, admin, or the person themselves). */
export async function desvincularJogador(jogadorId: string): Promise<Resultado> {
  if (!idSchema.safeParse(jogadorId).success) return { ok: false, message: "Jogador inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("desvincular_jogador", { jogador: jogadorId });
  if (error || !data) return falha(error, "desvincularJogador", "Não deu pra desvincular agora. Tenta de novo.");
  return { ok: true };
}
