import { z } from "zod";
import type { Player } from "@/types";

/** Same limits as criar_meu_jogador in the database. */
export const meuJogadorSchema = z.object({
  nome: z.string().trim().min(1, "Diz seu nome.").max(40, "Use até 40 caracteres."),
  posicao: z.enum(["GOL", "FIX", "ALA", "ATA"], { message: "Escolha uma posição." }),
});

/** Why the database refused a link, from the function's HINT. */
export const MOTIVO_DO_VINCULO: Record<string, string> = {
  "nao-membro": "Esse Jogador não é do seu fut.",
  "ja-vinculado": "Esse Jogador já é de outra pessoa. Fala com quem organiza o fut.",
  "ja-tem-jogador": "Você já tem um Jogador nesse fut.",
  "sem-permissao": "Só quem organiza o fut, ou a própria pessoa, desfaz o vínculo.",
};

/** The Jogador linked to this account in the Elenco, if any. */
export function meuJogador(players: readonly Player[], userId: string | undefined): Player | null {
  if (!userId) return null;
  return players.find((p) => p.conta_id === userId) ?? null;
}

/** Jogadores someone can still claim ("sou esse aqui"), by name. */
export function semConta(players: readonly Player[]): Player[] {
  return players.filter((p) => !p.conta_id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
