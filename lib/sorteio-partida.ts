import { z } from "zod";
import { teamAverage } from "@/lib/sorteio";
import type { Attributes, Player, PlayerPosition, Time } from "@/types";

/** A Jogador as the Sorteio saved them: a copy taken at draw time (ADR 0004). */
export type JogadorDoSorteio = {
  id: string;
  name: string;
  position: PlayerPosition;
  rating: number;
  image: string | null;
  attributes: Attributes;
};

export type TimeSalvo = { nome: string; jogadores: JogadorDoSorteio[] };

export type SorteioSalvo = {
  times: TimeSalvo[];
  publicado_em: string | null;
  sorteado_em: string;
};

/** The saved snapshot as Times for the screen (and for moveMember). */
export function timesDoSorteio(times: readonly TimeSalvo[]): Time[] {
  return times.map((t) => {
    const members: Player[] = t.jogadores.map((j) => ({
      id: j.id,
      name: j.name,
      position: j.position,
      nationality: "BR",
      image: j.image,
      attributes: j.attributes,
      rating: j.rating,
    }));
    return { name: t.nome, members, avg: teamAverage(members) };
  });
}

/** Who is in which Time, as salvar_sorteio takes it: one array of Jogador ids per Time. */
export function atribuicao(times: readonly Time[]): string[][] {
  return times.map((t) => t.members.map((m) => m.id));
}

/** Whether the snapshot still matches the confirmed list (else it has to be drawn again). */
export function sorteioEstaEmDia(times: readonly TimeSalvo[], confirmados: readonly string[]): boolean {
  const sorteados = new Set(times.flatMap((t) => t.jogadores.map((j) => j.id)));
  return sorteados.size === confirmados.length && confirmados.every((id) => sorteados.has(id));
}

export const MINIMO_POR_TIME = 2;

/** How many Times a Partida's Sorteio can have. salvar_sorteio checks the same range. */
export const MIN_TIMES = 2;
export const MAX_TIMES = 6;
export const OPCOES_DE_TIMES = Array.from({ length: MAX_TIMES - MIN_TIMES + 1 }, (_, i) => MIN_TIMES + i);

export const numeroDeTimesSchema = z.coerce
  .number()
  .int()
  .min(MIN_TIMES, `Pelo menos ${MIN_TIMES} Times.`)
  .max(MAX_TIMES, `No máximo ${MAX_TIMES} Times.`);

/** How many confirmed Jogadores a draw into that many Times needs. */
export const minimoDeConfirmados = (numTimes: number) => numTimes * MINIMO_POR_TIME;

/** Enough confirmed Jogadores for that many Times? */
export function cabeNoSorteio(confirmados: number, numTimes: number): boolean {
  return confirmados >= minimoDeConfirmados(numTimes);
}

/** Why the database refused a Sorteio, from the functions' HINT. */
export const MOTIVO_DO_SORTEIO: Record<string, string> = {
  "nao-encontrada": "Partida não encontrada.",
  cancelada: "Essa partida foi cancelada.",
  publicado: "Os times já foram publicados.",
  "times-invalidos": "Os times vieram inválidos. Sorteie de novo.",
  "lista-mudou": "A lista de confirmados mudou desde o sorteio. Sorteie de novo.",
  "sem-sorteio": "Sorteie os times antes de publicar.",
  "sorteio-mudou": "Os times foram sorteados de novo. Confira e mova outra vez.",
  "fora-do-sorteio": "Esse jogador não está no sorteio.",
  "time-vazio": "Um time não pode ficar vazio.",
};
