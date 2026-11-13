import { z } from "zod";
import type { Papel } from "@/lib/grupo";

/** Someone in the fut, as `pessoas_do_grupo` returns them. */
export type Pessoa = {
  user_id: string;
  papel: Papel;
  /** When they joined. */
  desde: string;
  jogador_id: string | null;
  /** Their linked Jogador's name: how the fut knows them. Null with no Jogador yet. */
  jogador_nome: string | null;
  /** Only for the dono and admins (null for a membro asking). */
  email: string | null;
};

/** What each papel can do, in one line, the same everywhere it's explained. */
export const O_QUE_O_PAPEL_FAZ: Record<Papel, { nome: string; descricao: string }> = {
  dono: {
    nome: "Dono",
    descricao: "Faz tudo o que o admin faz, e cuida das pessoas e do fut: papéis, remover, renomear, excluir.",
  },
  admin: {
    nome: "Admin",
    descricao: "Organiza: cria partidas, sorteia os times, edita o elenco e convida gente.",
  },
  membro: {
    nome: "Membro",
    descricao: "Responde se vai ou não e vê tudo do fut.",
  },
};

/** Why the database refused, from the function's HINT. */
export const MOTIVO_DAS_PESSOAS: Record<string, string> = {
  "sem-permissao": "Só o dono do fut pode fazer isso.",
  "nao-membro": "Esse fut não existe, ou você não faz parte dele.",
  "pessoa-fora": "Essa pessoa não está mais no fut.",
  "e-o-dono": "O dono não pode ser mudado nem removido.",
  "e-voce": "Isso não vale pra você mesmo.",
  "so-para-admin": "O fut só pode passar pra um admin. Torne a pessoa admin primeiro.",
  "dono-nao-sai": "Passe o fut pra um admin antes de sair.",
  "nome-nao-confere": "O nome digitado não confere com o do fut.",
  "22023": "Confira o que foi digitado.",
};

/** The papéis the dono hands out. Nobody becomes dono this way: only by `passar_posse`. */
export const papelDadoSchema = z.enum(["admin", "membro"], { message: "Papel inválido." });

/** How a Pessoa is called on screen. */
export function nomeDaPessoa(pessoa: Pick<Pessoa, "jogador_nome" | "email">): string {
  return pessoa.jogador_nome ?? pessoa.email ?? "Sem jogador";
}
