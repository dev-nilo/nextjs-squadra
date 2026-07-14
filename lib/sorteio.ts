import type { Attributes, Player, Time } from "@/types";

export type RandomFn = () => number;

export type SorteioOptions = {
  /** Returns a float in [0, 1). Defaults to Math.random. */
  random?: RandomFn;
};

const EMPTY_ATTRIBUTES: Attributes = {
  velocidade: 0,
  resistencia: 0,
  chute: 0,
  posicionamento: 0,
  defesa: 0,
  drible: 0,
  passe: 0,
  fisico: 0,
};

const shuffleArray = <T,>(array: T[], random: RandomFn): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const teamAverage = (members: Player[]): number =>
  members.length
    ? Math.round(
        members.reduce((sum, p) => sum + (p.rating ?? 0), 0) / members.length,
      )
    : 0;

/**
 * Sorteio: distribute Jogadores into Times with attribute-sum balancing.
 * Caller validates mínimo por time before calling.
 */
export const sortearTimes = (
  selectedPlayers: Player[],
  numTeams: number,
  options: SorteioOptions = {},
): Time[] => {
  const random = options.random ?? Math.random;

  const shuffledPlayers = shuffleArray(selectedPlayers, random);
  const ratingTiers: Player[][] = [[], [], [], [], []];

  shuffledPlayers.forEach((player) => {
    if (player.rating >= 90) ratingTiers[0].push(player);
    else if (player.rating >= 80) ratingTiers[1].push(player);
    else if (player.rating >= 70) ratingTiers[2].push(player);
    else if (player.rating >= 60) ratingTiers[3].push(player);
    else ratingTiers[4].push(player);
  });

  const sortedPlayers = ratingTiers.flat();
  const teams: Player[][] = Array.from({ length: numTeams }, () => []);

  const teamAttributeSums = Array.from({ length: numTeams }, () => ({
    ...EMPTY_ATTRIBUTES,
  }));

  sortedPlayers.forEach((player) => {
    const teamTotals = teamAttributeSums.map((sums) =>
      Object.values(sums).reduce((a, b) => a + b, 0),
    );

    const minTotal = Math.min(...teamTotals);
    const teamsWithMinTotal = teamTotals
      .map((total, idx) => ({ total, idx }))
      .filter((t) => t.total === minTotal);

    const minIndex =
      teamsWithMinTotal[Math.floor(random() * teamsWithMinTotal.length)].idx;
    teams[minIndex].push(player);

    const attrs = player.attributes ?? EMPTY_ATTRIBUTES;
    teamAttributeSums[minIndex].velocidade += attrs.velocidade;
    teamAttributeSums[minIndex].resistencia += attrs.resistencia;
    teamAttributeSums[minIndex].chute += attrs.chute;
    teamAttributeSums[minIndex].posicionamento += attrs.posicionamento;
    teamAttributeSums[minIndex].defesa += attrs.defesa;
    teamAttributeSums[minIndex].drible += attrs.drible;
    teamAttributeSums[minIndex].passe += attrs.passe;
    teamAttributeSums[minIndex].fisico += attrs.fisico;
  });

  return teams.map((members, idx) => ({
    name: `TIME ${String.fromCharCode(65 + idx)}`,
    members,
    avg: teamAverage(members),
  }));
};
