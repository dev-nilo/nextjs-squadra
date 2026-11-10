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

/**
 * The Grupo the app opens. Until switching at /g/[slug] exists, that's the
 * oldest Grupo the user owns, else the oldest one they joined.
 */
export function grupoAtual(participacoes: readonly (Participacao & { desde: string })[]): Participacao | null {
  if (participacoes.length === 0) return null;
  const ordenadas = [...participacoes].sort((a, b) => {
    const donoA = a.papel === "dono" ? 0 : 1;
    const donoB = b.papel === "dono" ? 0 : 1;
    return donoA - donoB || a.desde.localeCompare(b.desde);
  });
  const { desde: _desde, ...grupo } = ordenadas[0];
  return grupo;
}

/**
 * Whose Elenco the app is working on. The Grupo owns the Jogadores; the user
 * is who is signed in, recorded as the author of the Jogadores they create.
 */
export type ElencoScope = { userId: string; grupoId: string };
