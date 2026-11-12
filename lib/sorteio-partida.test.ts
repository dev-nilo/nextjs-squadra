import { describe, expect, it } from "vitest";
import { atribuicao, cabeNoSorteio, OPCOES_DE_TIMES, sorteioEstaEmDia, timesDoSorteio, type TimeSalvo } from "./sorteio-partida";

const attrs = (n: number) => ({ velocidade: n, resistencia: n, chute: n, posicionamento: n, defesa: n, drible: n, passe: n, fisico: n });
const j = (id: string, rating: number) => ({ id, name: id, position: "ALA" as const, rating, image: null, attributes: attrs(rating) });

const salvo: TimeSalvo[] = [
  { nome: "Time 1", jogadores: [j("a", 80), j("b", 60)] },
  { nome: "Time 2", jogadores: [j("c", 70), j("d", 72)] },
];

describe("timesDoSorteio / atribuicao", () => {
  it("rebuilds Times from the snapshot, with each Time's average", () => {
    const times = timesDoSorteio(salvo);
    expect(times.map((t) => [t.name, t.avg])).toEqual([
      ["Time 1", 70],
      ["Time 2", 71],
    ]);
    expect(times[0].members[0]).toMatchObject({ id: "a", rating: 80 });
  });

  it("turns Times into what salvar_sorteio takes: one array of Jogador ids per Time", () => {
    expect(atribuicao(timesDoSorteio(salvo))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("sorteioEstaEmDia", () => {
  it("is up to date only while the confirmed list is exactly the one drawn", () => {
    expect(sorteioEstaEmDia(salvo, ["a", "b", "c", "d"])).toBe(true);
    expect(sorteioEstaEmDia(salvo, ["a", "b", "c"])).toBe(false);
    expect(sorteioEstaEmDia(salvo, ["a", "b", "c", "d", "e"])).toBe(false);
  });
});

describe("cabeNoSorteio", () => {
  it("needs at least 2 confirmed per Time", () => {
    expect(cabeNoSorteio(4, 2)).toBe(true);
    expect(cabeNoSorteio(5, 3)).toBe(false);
  });
});

describe("OPCOES_DE_TIMES", () => {
  it("offers 2 to 6 Times, the range salvar_sorteio accepts", () => {
    expect(OPCOES_DE_TIMES).toEqual([2, 3, 4, 5, 6]);
  });
});
