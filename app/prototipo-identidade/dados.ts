// PROTOTYPE (#146), never merged: fixed data from supabase/seed.sql, no database.

export type Atributos = {
  vel: number;
  res: number;
  chu: number;
  pos: number;
  def: number;
  dri: number;
  pas: number;
  fis: number;
};
export type Carta = {
  nome: string;
  posicao: "GOL" | "FIX" | "ALA" | "ATA";
  pais: string;
  ovr: number;
  atributos: Atributos;
  foto?: boolean;
  voce?: boolean;
};

const carta = (
  nome: string,
  posicao: Carta["posicao"],
  pais: string,
  v: number[],
  extra: Partial<Carta> = {},
): Carta => {
  const [vel = 0, res = 0, chu = 0, pos = 0, def = 0, dri = 0, pas = 0, fis = 0] = v;
  return {
    nome,
    posicao,
    pais,
    ovr: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
    atributos: { vel, res, chu, pos, def, dri, pas, fis },
    ...extra,
  };
};

export const ROTULOS: [keyof Atributos, string][] = [
  ["vel", "VEL"],
  ["res", "RES"],
  ["chu", "CHU"],
  ["pos", "POS"],
  ["def", "DEF"],
  ["dri", "DRI"],
  ["pas", "PAS"],
  ["fis", "FIS"],
];

export const CARTAS: Carta[] = [
  carta("Maestro", "ALA", "BR", [70, 74, 76, 82, 60, 84, 92, 64], { foto: true, voce: true }),
  carta("Fenômeno", "ATA", "BR", [95, 88, 96, 88, 60, 97, 90, 86]),
  carta("Foguete", "ALA", "BR", [92, 85, 70, 70, 55, 82, 74, 68]),
  carta("Paredão", "GOL", "BR", [45, 70, 40, 85, 80, 35, 60, 78]),
  carta("Corisco", "ALA", "AR", [88, 78, 72, 68, 50, 86, 72, 62]),
  carta("Muralha", "FIX", "PT", [52, 72, 48, 75, 80, 42, 62, 88]),
];

export const BRILHANTE = 85;

/** In the order they said "vou". */
const QUEM_VAI = [
  "Paredão",
  "Foguete",
  "Xerife",
  "Maestro",
  "Matador",
  "Corisco",
  "Motorzinho",
  "Zagueirão",
  "Canhota",
  "Artilheiro",
  "Luva",
  "Tranca",
];
const NA_ESPERA = ["Pé de Pano", "Muralha"];

export const EU = "Maestro";

export type Lista = { vagas: number; confirmados: string[]; espera: string[]; naoVao: string[]; semResposta: string[] };

/**
 * "Com vagas": 9 of 14, and you (Maestro) haven't answered, so the page asks.
 * "Lotada": 12 of 12, you're 4th, two waiting.
 */
export function lista(lotada: boolean): Lista {
  return lotada
    ? {
        vagas: 12,
        confirmados: QUEM_VAI,
        espera: NA_ESPERA,
        naoVao: ["Fenômeno", "Trator"],
        semResposta: ["Chuteira", "Bigode"],
      }
    : {
        vagas: 14,
        confirmados: QUEM_VAI.filter((n) => n !== EU).slice(0, 9),
        espera: [],
        naoVao: ["Fenômeno", "Trator"],
        semResposta: [EU, "Luva", "Tranca", "Chuteira", "Bigode"],
      };
}

export const PARTIDA = { dia: "Sábado", data: "22 de novembro", hora: "20h30", local: "Quadra do Zé, Vila Mariana" };

export const TIMES = [
  { nome: "Time 1", media: 74, jogadores: ["Paredão", "Xerife", "Maestro", "Corisco", "Canhota", "Artilheiro"] },
  { nome: "Time 2", media: 73, jogadores: ["Luva", "Zagueirão", "Foguete", "Matador", "Motorzinho", "Tranca"] },
];

export const FUT = "Fut do Dev";
