import "server-only";
import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import { slugSchema, type Participacao } from "@/lib/grupo";
import { resolverGrupo } from "@/lib/grupo-server";

/**
 * The seam every Server Action goes through (ADR 0007). It resolves the
 * Sessão and, for a Grupo's actions, the Grupo from its slug, runs the
 * action's body and turns whatever went wrong into one message for the
 * screen, with one policy for every action.
 *
 * Inside a body, a refusal is thrown (`recusar`, `exigir`, `validar`), so the
 * body reads top to bottom. Nothing thrown crosses the seam: callers always
 * get a `Resultado`.
 */

export type Resultado<T = null> = { ok: true; valor: T } | { ok: false; message: string };

export type ContextoDaSessao = { supabase: SupabaseClient; user: User };
export type ContextoDoGrupo = ContextoDaSessao & { grupo: Participacao };

export type Opcoes = {
  /** Sentry tag for errors nobody expected. */
  acao: string;
  /** What the screen says when the error is unexpected. */
  generica: string;
  /**
   * Known refusals, by the HINT the database function raised or by Postgres
   * error code (e.g. `MOTIVO_DA_PRESENCA`, or `{ "23514": "Confira…" }`).
   */
  motivos?: Readonly<Record<string, string>>;
};

export const SESSAO_EXPIRADA = "Sua sessão expirou. Entre de novo.";
export const SEM_PERMISSAO = "Só quem organiza o fut pode fazer isso.";
export const FUT_NAO_ENCONTRADO = "Esse fut não existe, ou você não faz parte dele.";

export const idSchema = z.string().uuid();

type ErroDoBanco = { code?: string; hint?: string | null; message?: string };

/** A refusal with a message the screen can show as is. */
class Recusa extends Error {}

/** The database said no, or returned nothing: the error table decides what that means. */
class FalhaDoBanco extends Error {
  constructor(readonly erro: ErroDoBanco | null) {
    super(erro?.message ?? "no row returned");
  }
}

export function recusar(message: string): never {
  throw new Recusa(message);
}

/** The parsed value, or a refusal with the schema's first message. */
export function validar<T>(schema: z.ZodType<T>, valor: unknown, mensagem: string): T {
  const parsed = schema.safeParse(valor);
  if (!parsed.success) recusar(parsed.error.issues[0]?.message ?? mensagem);
  return parsed.data;
}

/** The data of a Supabase call, or a failure for the error table (an error, or no row at all). */
export function exigir<T>({ data, error }: { data: T; error: ErroDoBanco | null }): NonNullable<T> {
  if (error || data === null || data === undefined) throw new FalhaDoBanco(error);
  return data;
}

/**
 * Like `exigir`, for an update or delete filtered by RLS: no rows back means
 * the row isn't one this user can change.
 */
export function exigirLinhas<T>(resposta: { data: T[] | null; error: ErroDoBanco | null }): T[] {
  const linhas: T[] = exigir(resposta);
  if (linhas.length === 0) recusar(SEM_PERMISSAO);
  return linhas;
}

/** An action for whoever is signed in, with no Grupo yet (creating one, accepting a Convite). */
export async function comSessao<T>(
  supabase: SupabaseClient,
  opcoes: Opcoes,
  corpo: (ctx: ContextoDaSessao) => Promise<T>,
): Promise<Resultado<T>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: SESSAO_EXPIRADA };
    return { ok: true, valor: await corpo({ supabase, user }) };
  } catch (e) {
    return { ok: false, message: traduzir(e, opcoes) };
  }
}

/**
 * An action inside the Grupo at `slug`. The Grupo comes from the slug, read
 * with the user's session, never from an id the browser sent. Whether the
 * papel allows the write stays with RLS and the database functions.
 */
export async function noGrupo<T>(
  supabase: SupabaseClient,
  slug: unknown,
  opcoes: Opcoes,
  corpo: (ctx: ContextoDoGrupo) => Promise<T>,
): Promise<Resultado<T>> {
  const valido = slugSchema.safeParse(slug);
  if (!valido.success) return { ok: false, message: FUT_NAO_ENCONTRADO };
  return comSessao(supabase, opcoes, async (ctx) => {
    const grupo = await resolverGrupo(supabase, ctx.user.id, valido.data);
    if (!grupo) recusar(FUT_NAO_ENCONTRADO);
    return corpo({ ...ctx, grupo });
  });
}

/** The error table: one policy for every action. */
function traduzir(e: unknown, { acao, generica, motivos = {} }: Opcoes): string {
  if (e instanceof Recusa) return e.message;
  if (e instanceof FalhaDoBanco) {
    const { code, hint } = e.erro ?? {};
    if (code === "28000" || code === "PGRST301") return SESSAO_EXPIRADA;
    if (hint && motivos[hint]) return motivos[hint];
    if (code && motivos[code]) return motivos[code];
    // RLS refused the row: a membro trying what only the dono and admins can.
    if (code === "42501" || hint === "sem-permissao") return SEM_PERMISSAO;
    Sentry.captureException(e.erro ?? new Error(`${acao} returned no row`), { tags: { action: acao } });
    return generica;
  }
  Sentry.captureException(e, { tags: { action: acao } });
  return generica;
}
