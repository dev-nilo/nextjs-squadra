import { z } from "zod";

export type Papel = "dono" | "admin" | "membro";

export type Grupo = {
  id: string;
  slug: string;
  nome: string;
};

export type Participacao = Grupo & { papel: Papel };

/** Same limits as the `grupos.nome` check and `criar_grupo` in the database. */
export const NOME_DO_GRUPO_MAX = 60;

export const nomeDoGrupoSchema = z
  .string()
  .trim()
  .min(1, "Dê um nome pro seu fut.")
  .max(NOME_DO_GRUPO_MAX, `Use até ${NOME_DO_GRUPO_MAX} caracteres.`);

export type ValidacaoNome = { ok: true; nome: string } | { ok: false; message: string };

export function validarNomeDoGrupo(input: unknown): ValidacaoNome {
  const parsed = nomeDoGrupoSchema.safeParse(typeof input === "string" ? input : "");
  if (parsed.success) return { ok: true, nome: parsed.data };
  return { ok: false, message: parsed.error.issues[0]?.message ?? "Nome inválido." };
}

export type ParticipacaoDesde = Participacao & { desde: string };

/**
 * The default Grupo: the oldest one the user owns, else the oldest one they
 * joined.
 */
export function grupoAtual(participacoes: readonly ParticipacaoDesde[]): Participacao | null {
  if (participacoes.length === 0) return null;
  const ordenadas = [...participacoes].sort((a, b) => {
    const donoA = a.papel === "dono" ? 0 : 1;
    const donoB = b.papel === "dono" ? 0 : 1;
    return donoA - donoB || a.desde.localeCompare(b.desde);
  });
  const { desde: _desde, ...grupo } = ordenadas[0];
  return grupo;
}

/** Cookie with the slugs of the Grupos last opened on this device, most recent first. */
export const COOKIE_FUTS_RECENTES = "squadra-futs";
const MAX_FUTS_RECENTES = 5;
/** Same check as `grupos.slug` in the database. */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const slugSchema = z.string().max(80).regex(SLUG);

/** The recent slugs in the cookie's value, ignoring anything that isn't a slug. */
export function lerFutsRecentes(valor: string | null | undefined): string[] {
  return (valor ?? "").split(",").filter((slug) => slug.length <= 80 && SLUG.test(slug)).slice(0, MAX_FUTS_RECENTES);
}

/** The cookie's next value after opening `slug`. */
export function lembrarFut(valor: string | null | undefined, slug: string): string {
  const recentes = lerFutsRecentes(valor).filter((s) => s !== slug);
  return (SLUG.test(slug) ? [slug, ...recentes] : recentes).slice(0, MAX_FUTS_RECENTES).join(",");
}

/**
 * Which Grupo `/` opens: the most recent one on this device the user is still
 * in (a slug of a Grupo they aren't in is skipped), else the default. Null
 * means no Grupo at all, so the first-access screen.
 */
export function grupoParaAbrir(
  participacoes: readonly ParticipacaoDesde[],
  recentes: readonly string[],
): Participacao | null {
  for (const slug of recentes) {
    const recente = participacoes.find((p) => p.slug === slug);
    if (recente) {
      const { desde: _desde, ...grupo } = recente;
      return grupo;
    }
  }
  return grupoAtual(participacoes);
}

/** The Grupo's slug in a pathname like `/g/fut-de-quinta`, or null. */
export function slugDoCaminho(pathname: string | null): string | null {
  const match = pathname?.match(/^\/g\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

