import { z } from "zod";

export type SituacaoPresenca = "confirmado" | "espera" | "nao_vou";

export type Partida = {
  id: string;
  grupo_id: string;
  inicio: string;
  local: string;
  vagas: number;
  cancelada_em: string | null;
};

export type Presenca = {
  jogador_id: string;
  situacao: SituacaoPresenca;
  pediu_vaga_em: string | null;
};

export type ListaDePresenca = {
  confirmados: Presenca[];
  /** In line order: `espera[0]` is next to get a vaga. */
  espera: Presenca[];
  naoVou: Presenca[];
  vagasLivres: number;
  lotada: boolean;
};

const porPedido = (a: Presenca, b: Presenca) =>
  (a.pediu_vaga_em ?? "").localeCompare(b.pediu_vaga_em ?? "") || a.jogador_id.localeCompare(b.jogador_id);

/**
 * The presence list as the database leaves it. The database decides who is
 * confirmed (responder_presenca); this only groups and orders, the same way
 * promover_espera picks the next in line.
 */
export function organizarPresencas(presencas: readonly Presenca[], vagas: number): ListaDePresenca {
  const confirmados = presencas.filter((p) => p.situacao === "confirmado").sort(porPedido);
  const espera = presencas.filter((p) => p.situacao === "espera").sort(porPedido);
  const naoVou = presencas.filter((p) => p.situacao === "nao_vou");
  const vagasLivres = Math.max(0, vagas - confirmados.length);
  return { confirmados, espera, naoVou, vagasLivres, lotada: vagasLivres === 0 };
}

/** Where a Jogador stands: confirmed, waiting (with their place in line), not going, or no answer yet. */
export function situacaoDoJogador(
  lista: ListaDePresenca,
  jogadorId: string,
): { situacao: SituacaoPresenca; posicao?: number } | null {
  if (lista.confirmados.some((p) => p.jogador_id === jogadorId)) return { situacao: "confirmado" };
  const naFila = lista.espera.findIndex((p) => p.jogador_id === jogadorId);
  if (naFila >= 0) return { situacao: "espera", posicao: naFila + 1 };
  if (lista.naoVou.some((p) => p.jogador_id === jogadorId)) return { situacao: "nao_vou" };
  return null;
}

/** What saying "vou" would do right now, for the button's wording. Final word is the database's. */
export function oQueVouFaz(lista: ListaDePresenca): "confirma" | "entra-na-espera" {
  return lista.lotada ? "entra-na-espera" : "confirma";
}

export type EstadoDaPartida = "cancelada" | "encerrada" | "aberta";

export function estadoDaPartida(partida: Pick<Partida, "inicio" | "cancelada_em">, agora: Date): EstadoDaPartida {
  if (partida.cancelada_em) return "cancelada";
  return new Date(partida.inicio).getTime() <= agora.getTime() ? "encerrada" : "aberta";
}

/** Same limits as the partidas table. */
export const partidaSchema = z.object({
  inicio: z.coerce.date({ message: "Escolha dia e hora." }),
  local: z.string().trim().min(1, "Diz onde vai ser.").max(80, "Use até 80 caracteres."),
  vagas: z.coerce.number().int("Vagas é um número inteiro.").min(2, "Pelo menos 2 vagas.").max(60, "No máximo 60 vagas."),
});

/** Why the database refused an answer, from responder_presenca's HINT. */
export const MOTIVO_DA_PRESENCA: Record<string, string> = {
  "nao-encontrada": "Partida não encontrada.",
  cancelada: "Essa partida foi cancelada.",
  "jogador-de-fora": "Esse jogador não é desse fut.",
  "sem-permissao": "Você só responde pelo seu jogador.",
  "vagas-abaixo-dos-confirmados": "Já tem mais confirmados do que essas vagas.",
};

// ---------------------------------------------------------------------------
// Dates. The pelada plays in Brazil, and the server renders in UTC, so every
// date is shown and typed in Brasília time. Brasília has had no daylight
// saving since 2019, so its offset is a constant.
// ---------------------------------------------------------------------------
export const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00";

const formatoInicio = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** "qui., 12/11, 20:00" in Brasília time, the same on the server and in the browser. */
export function formatarInicio(iso: string): string {
  return formatoInicio.format(new Date(iso));
}

/** An instant as a `datetime-local` value ("2026-11-12T20:00") in Brasília time. */
export function paraCampoDeData(iso: string): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

/** A `datetime-local` value, read as Brasília time, as an ISO instant. Null if it isn't one. */
export function doCampoDeData(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  const data = new Date(`${valor}:00${OFFSET}`);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}
