import { describe, expect, it } from "vitest";
import {
  estadoDaPartida,
  oQueVouFaz,
  organizarPresencas,
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
