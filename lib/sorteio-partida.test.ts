import { describe, expect, it } from "vitest";
import type { Presenca } from "@/lib/partida";
import { moveMember } from "@/lib/sorteio";
import { atribuicao, cabeNoSorteio, quemSorteia, sorteioEstaEmDia, timesDoSorteio, type TimeSalvo } from "./sorteio-partida";

const attrs = (n: number) => ({ velocidade: n, resistencia: n, chute: n, posicionamento: n, defesa: n, drible: n, passe: n, fisico: n });
const j = (id: string, rating: number) => ({ id, name: id, position: "ALA" as const, rating, image: null, attributes: attrs(rating) });

const salvo: TimeSalvo[] = [
  { nome: "Time 1", jogadores: [j("a", 80), j("b", 60)] },
  { nome: "Time 2", jogadores: [j("c", 70), j("d", 72)] },
];

describe("quemSorteia", () => {
  it("takes the confirmed Jogadores and never the lista de espera or não vou", () => {
    const presencas: Presenca[] = [
      { jogador_id: "c1", situacao: "confirmado", pediu_vaga_em: "2026-11-10T20:00:00Z" },
      { jogador_id: "e1", situacao: "espera", pediu_vaga_em: "2026-11-10T20:05:00Z" },
      { jogador_id: "n1", situacao: "nao_vou", pediu_vaga_em: null },
      { jogador_id: "c2", situacao: "confirmado", pediu_vaga_em: "2026-11-10T20:01:00Z" },
    ];
    expect(quemSorteia(presencas)).toEqual(["c1", "c2"]);
  });
});

describe("timesDoSorteio / atribuicao", () => {
  it("rebuilds Times from the snapshot, with each Time's average", () => {
    const times = timesDoSorteio(salvo);
    expect(times.map((t) => [t.name, t.avg])).toEqual([
      ["Time 1", 70],
      ["Time 2", 71],
    ]);
    expect(times[0].members[0]).toMatchObject({ id: "a", rating: 80 });
  });

  it("turns an adjustment (moveMember) into what salvar_sorteio takes", () => {
    const movido = moveMember(timesDoSorteio(salvo), "b", 0, 1);
    expect(atribuicao(movido)).toEqual([["a"], ["c", "d", "b"]]);
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
