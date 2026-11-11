import { z } from "zod";
import { teamAverage } from "@/lib/sorteio";
import type { Presenca } from "@/lib/partida";
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

/** Who goes into the draw: the confirmed Jogadores, never the lista de espera. */
export function quemSorteia(presencas: readonly Presenca[]): string[] {
  return presencas.filter((p) => p.situacao === "confirmado").map((p) => p.jogador_id);
}

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

export const numeroDeTimesSchema = z.coerce
  .number()
  .int()
  .min(2, "Pelo menos 2 Times.")
  .max(6, "No máximo 6 Times.");

/** Enough confirmed Jogadores for that many Times? */
export function cabeNoSorteio(confirmados: number, numTimes: number): boolean {
  return confirmados >= numTimes * MINIMO_POR_TIME;
}

/** Why the database refused a Sorteio, from the functions' HINT. */
export const MOTIVO_DO_SORTEIO: Record<string, string> = {
  "nao-encontrada": "Partida não encontrada.",
  cancelada: "Essa Partida foi cancelada.",
  "sem-permissao": "Só quem organiza o fut sorteia e publica os Times.",
  publicado: "Os Times já foram publicados.",
  "times-invalidos": "Os Times vieram inválidos. Sorteie de novo.",
  "lista-mudou": "A lista de confirmados mudou desde o sorteio. Sorteie de novo.",
  "sem-sorteio": "Sorteie os Times antes de publicar.",
};
