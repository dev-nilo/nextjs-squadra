import { describe, expect, it, vi } from "vitest";
import {
  doCampoDeData,
  esperaAteComecar,
  estadoDaPartida,
  formatarInicio,
  oQueVouFaz,
  organizarPresencas,
  paraCampoDeData,
  partidaSchema,
  situacaoDoJogador,
  type Presenca,
} from "./partida";

const p = (jogador_id: string, situacao: Presenca["situacao"], minuto?: number): Presenca => ({
  jogador_id,
  situacao,
  pediu_vaga_em: minuto === undefined ? null : `2026-11-10T20:${String(minuto).padStart(2, "0")}:00Z`,
});

describe("organizarPresencas", () => {
  const presencas = [
    p("c2", "confirmado", 2),
    p("e2", "espera", 9),
    p("n1", "nao_vou"),
    p("c1", "confirmado", 1),
    p("e1", "espera", 7),
  ];

  it("groups by situação and orders by when each asked for a vaga", () => {
    const lista = organizarPresencas(presencas, 2);
    expect(lista.confirmados.map((x) => x.jogador_id)).toEqual(["c1", "c2"]);
    expect(lista.espera.map((x) => x.jogador_id)).toEqual(["e1", "e2"]);
    expect(lista.naoVou.map((x) => x.jogador_id)).toEqual(["n1"]);
  });

  it("counts free vagas and says when the Partida is full", () => {
    expect(organizarPresencas(presencas, 2)).toMatchObject({ vagasLivres: 0, lotada: true });
    expect(organizarPresencas(presencas, 5)).toMatchObject({ vagasLivres: 3, lotada: false });
  });

  it("never reports negative free vagas", () => {
    expect(organizarPresencas(presencas, 1).vagasLivres).toBe(0);
  });

  it("breaks a tie in time by Jogador, like promover_espera", () => {
    const lista = organizarPresencas([p("b", "espera", 5), p("a", "espera", 5)], 0);
    expect(lista.espera.map((x) => x.jogador_id)).toEqual(["a", "b"]);
  });
});

describe("situacaoDoJogador", () => {
  const lista = organizarPresencas([p("c1", "confirmado", 1), p("e1", "espera", 3), p("e2", "espera", 4), p("n1", "nao_vou")], 1);

  it("gives the place in the lista de espera, starting at 1", () => {
    expect(situacaoDoJogador(lista, "e2")).toEqual({ situacao: "espera", posicao: 2 });
  });

  it("knows confirmed, not going and no answer yet", () => {
    expect(situacaoDoJogador(lista, "c1")).toEqual({ situacao: "confirmado" });
    expect(situacaoDoJogador(lista, "n1")).toEqual({ situacao: "nao_vou" });
    expect(situacaoDoJogador(lista, "ninguem")).toBeNull();
  });
});

describe("oQueVouFaz", () => {
  it("confirms while there are free vagas, else joins the lista de espera", () => {
    expect(oQueVouFaz(organizarPresencas([p("a", "confirmado", 1)], 2))).toBe("confirma");
    expect(oQueVouFaz(organizarPresencas([p("a", "confirmado", 1), p("b", "confirmado", 2)], 2))).toBe("entra-na-espera");
  });
});

describe("estadoDaPartida", () => {
  const agora = new Date("2026-11-10T20:00:00Z");
  it("is cancelled, over once it started, or open", () => {
    expect(estadoDaPartida({ inicio: "2026-11-12T20:00:00Z", cancelada_em: "2026-11-10T10:00:00Z" }, agora)).toBe("cancelada");
    expect(estadoDaPartida({ inicio: "2026-11-10T19:00:00Z", cancelada_em: null }, agora)).toBe("encerrada");
    expect(estadoDaPartida({ inicio: "2026-11-12T20:00:00Z", cancelada_em: null }, agora)).toBe("aberta");
  });
});

describe("esperaAteComecar", () => {
  const agora = new Date("2026-11-10T20:00:00Z");
  it("waits until an open Partida starts, and not at all once it can't change by itself", () => {
    expect(esperaAteComecar({ inicio: "2026-11-10T20:30:00Z", cancelada_em: null }, agora)).toBe(30 * 60_000);
    expect(esperaAteComecar({ inicio: "2026-11-10T19:00:00Z", cancelada_em: null }, agora)).toBeNull();
    expect(esperaAteComecar({ inicio: "2026-11-10T20:30:00Z", cancelada_em: "2026-11-10T10:00:00Z" }, agora)).toBeNull();
  });

  it("caps a far-off start at what setTimeout can wait, so the screen checks again later", () => {
    expect(esperaAteComecar({ inicio: "2027-02-01T20:00:00Z", cancelada_em: null }, agora)).toBe(2 ** 31 - 1);
  });

  it("flips the state when the wait is over (fake clock)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(agora);
    const partida = { inicio: "2026-11-10T20:30:00Z", cancelada_em: null };
    let estado = estadoDaPartida(partida, new Date());
    setTimeout(() => (estado = estadoDaPartida(partida, new Date())), esperaAteComecar(partida, new Date())!);
    vi.advanceTimersByTime(30 * 60_000 - 1);
    expect(estado).toBe("aberta");
    vi.advanceTimersByTime(1);
    expect(estado).toBe("encerrada");
    vi.useRealTimers();
  });
});

describe("partidaSchema", () => {
  it("accepts a form's strings and trims the place", () => {
    const ok = partidaSchema.parse({ inicio: "2026-11-12T20:00", local: "  Quadra do Zé  ", vagas: "14" });
    expect(ok.local).toBe("Quadra do Zé");
    expect(ok.vagas).toBe(14);
  });

  it("refuses too few or too many vagas and a blank place", () => {
    expect(partidaSchema.safeParse({ inicio: "2026-11-12T20:00", local: "Quadra", vagas: 1 }).success).toBe(false);
    expect(partidaSchema.safeParse({ inicio: "2026-11-12T20:00", local: "Quadra", vagas: 61 }).success).toBe(false);
    expect(partidaSchema.safeParse({ inicio: "2026-11-12T20:00", local: "  ", vagas: 10 }).success).toBe(false);
    expect(partidaSchema.safeParse({ inicio: "não é data", local: "Quadra", vagas: 10 }).success).toBe(false);
  });
});

describe("dates in Brasília time", () => {
  it("reads a datetime-local value as Brasília time", () => {
    expect(doCampoDeData("2026-11-12T20:00")).toBe("2026-11-12T23:00:00.000Z");
    expect(doCampoDeData("12/11/2026 20:00")).toBeNull();
    expect(doCampoDeData("")).toBeNull();
  });

  it("writes an instant back as the same datetime-local value", () => {
    expect(paraCampoDeData("2026-11-12T23:00:00.000Z")).toBe("2026-11-12T20:00");
    expect(paraCampoDeData(doCampoDeData("2026-12-31T23:30")!)).toBe("2026-12-31T23:30");
  });

  it("formats the start the same way whatever the machine's timezone", () => {
    expect(formatarInicio("2026-11-12T23:00:00.000Z")).toMatch(/12\/11.*20:00/);
  });
});
