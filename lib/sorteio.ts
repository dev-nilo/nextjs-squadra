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

const shuffleArray = <T extends object>(array: T[], random: RandomFn): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = shuffled[i];
    const b = shuffled[j];
    if (!a || !b) continue; // never: 0 <= j <= i < length, and T holds no undefined
    shuffled[i] = b;
    shuffled[j] = a;
  }
  return shuffled;
};

/** A rating's tier, strongest first: the draw deals the Jogadores tier by tier. */
const faixaDoRating = (rating: number): number =>
  rating >= 90 ? 0 : rating >= 80 ? 1 : rating >= 70 ? 2 : rating >= 60 ? 3 : 4;

const somaDosAtributos = (a: Attributes): number =>
  a.velocidade + a.resistencia + a.chute + a.posicionamento + a.defesa + a.drible + a.passe + a.fisico;

export const teamAverage = (members: Player[]): number =>
  members.length ? Math.round(members.reduce((sum, p) => sum + (p.rating ?? 0), 0) / members.length) : 0;

/**
 * Move a Jogador from one post-draw Time to another, recomputing avg for both.
 * No-op (same array reference) for a same-team move, an unknown playerId,
 * or an out-of-range team index. Times other than fromTeam/toTeam keep their
 * reference on a successful move.
 */
export const moveMember = (teams: Time[], playerId: string, fromTeam: number, toTeam: number): Time[] => {
  if (fromTeam === toTeam || !teams[fromTeam] || !teams[toTeam]) return teams;

  const playerToMove = teams[fromTeam].members.find((p) => p.id === playerId);
  if (!playerToMove) return teams;

  return teams.map((team, index) => {
    if (index === fromTeam) {
      const members = team.members.filter((p) => p.id !== playerId);
      return { ...team, members, avg: teamAverage(members) };
    }
    if (index === toTeam) {
      const members = [...team.members, playerToMove];
      return { ...team, members, avg: teamAverage(members) };
    }
    return team;
  });
};

/**
 * Sorteio: distribute Jogadores into Times with attribute-sum balancing.
 * Caller validates mínimo por time before calling.
 */
export const sortearTimes = (selectedPlayers: Player[], numTeams: number, options: SorteioOptions = {}): Time[] => {
  const random = options.random ?? Math.random;

  // Shuffled, then dealt strongest tier first. The sort is stable, so each
  // tier keeps its shuffled order.
  const sortedPlayers = shuffleArray(selectedPlayers, random).sort(
    (a, b) => faixaDoRating(a.rating) - faixaDoRating(b.rating),
  );
  const teams = Array.from({ length: numTeams }, (): { members: Player[]; total: number } => ({
    members: [],
    total: 0,
  }));

  // Each Jogador goes to the Time with the lowest attribute total so far, a
  // random one among ties.
  for (const player of sortedPlayers) {
    const minTotal = Math.min(...teams.map((t) => t.total));
    const tied = teams.filter((t) => t.total === minTotal);
    const team = tied[Math.floor(random() * tied.length)];
    if (!team) throw new RangeError("Sorteio needs at least one Time.");
    team.members.push(player);
    team.total += somaDosAtributos(player.attributes ?? EMPTY_ATTRIBUTES);
  }

  return teams.map(({ members }, idx) => ({
    name: `Time ${idx + 1}`,
    members,
    avg: teamAverage(members),
  }));
};

/**
 * How many more selected Jogadores a quick Sorteio needs: each Time gets at
 * least `minimoPorTime` (the Mínimo por time is a floor, not a cap: whoever
 * is left over joins a Time too). 0 when there are enough.
 */
export const faltamParaSortear = (selecionados: number, numTimes: number, minimoPorTime: number): number =>
  Math.max(0, numTimes * minimoPorTime - selecionados);

const porNome = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

/**
 * A Time's members by name. The draw order runs strongest to weakest, so
 * listing them that way (or numbering them) would rank people.
 */
export const membrosPorNome = <T extends { name: string }>(membros: readonly T[]): T[] =>
  [...membros].sort((a, b) => porNome.compare(a.name, b.name));
