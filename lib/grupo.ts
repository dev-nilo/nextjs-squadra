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

export type GrupoResolvido =
  | { status: "pronto"; grupo: Participacao }
  /** No Grupo at all: the first-access screen. */
  | { status: "sem-grupo" }
  /** The URL names a Grupo that doesn't exist or the user isn't in. */
  | { status: "nao-encontrado" };

/**
 * Which Grupo to open. `/g/<slug>` opens that one, if the user is in it.
 * `/` opens the last one used on this device, if they're still in it, else
 * the default.
 */
export function resolverGrupo(input: {
  participacoes: readonly ParticipacaoDesde[];
  slug: string | null;
  ultimoId: string | null;
}): GrupoResolvido {
  const semDesde = ({ desde: _desde, ...grupo }: ParticipacaoDesde): Participacao => grupo;
  const { participacoes, slug, ultimoId } = input;

  if (slug) {
    const pedido = participacoes.find((p) => p.slug === slug);
    return pedido ? { status: "pronto", grupo: semDesde(pedido) } : { status: "nao-encontrado" };
  }

  const ultimo = ultimoId ? participacoes.find((p) => p.id === ultimoId) : undefined;
  if (ultimo) return { status: "pronto", grupo: semDesde(ultimo) };

  const padrao = grupoAtual(participacoes);
  return padrao ? { status: "pronto", grupo: padrao } : { status: "sem-grupo" };
}

/** The Grupo's slug in a pathname like `/g/fut-de-quinta`, or null. */
export function slugDoCaminho(pathname: string | null): string | null {
  const match = pathname?.match(/^\/g\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Whose Elenco the app is working on. The Grupo owns the Jogadores; the user
 * is who is signed in, recorded as the author of the Jogadores they create.
 */
export type ElencoScope = { userId: string; grupoId: string };
