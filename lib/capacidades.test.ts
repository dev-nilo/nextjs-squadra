import { describe, expect, it } from "vitest";
import type { Papel } from "@/lib/grupo";
import type { EstadoDaPartida } from "@/lib/partida";
import { capacidades } from "./capacidades";

// The same table the integration tests prove on the database side
// (elenco-papeis, convites, partidas, sorteios, jogador-conta).

const EU = "user-eu";
const meu = { conta_id: EU };
const deOutro = { conta_id: "user-outro" };
const semConta = { conta_id: null };
const PAPEIS: Papel[] = ["dono", "admin", "membro"];

describe("capacidades", () => {
  it.each([
    ["dono", true],
    ["admin", true],
    ["membro", false],
  ] as const)("%s: edits the Elenco, invites and runs Partidas → %s", (papel, organiza) => {
    const pode = capacidades(papel, EU);
    expect([pode.editaElenco, pode.convida, pode.gerePartidas]).toEqual([organiza, organiza, organiza]);
  });

  const respostas: [Papel, EstadoDaPartida, { meu: boolean; deOutro: boolean; semConta: boolean }][] = [
    ["dono", "aberta", { meu: true, deOutro: true, semConta: true }],
    ["dono", "encerrada", { meu: true, deOutro: true, semConta: true }],
    ["dono", "cancelada", { meu: false, deOutro: false, semConta: false }],
    ["admin", "encerrada", { meu: true, deOutro: true, semConta: true }],
    ["admin", "cancelada", { meu: false, deOutro: false, semConta: false }],
    ["membro", "aberta", { meu: true, deOutro: false, semConta: false }],
    ["membro", "encerrada", { meu: false, deOutro: false, semConta: false }],
    ["membro", "cancelada", { meu: false, deOutro: false, semConta: false }],
  ];
  it.each(respostas)("%s answers in a Partida %s: %o", (papel, estado, esperado) => {
    const pode = capacidades(papel, EU);
    expect({
      meu: pode.respondePor(meu, estado),
      deOutro: pode.respondePor(deOutro, estado),
      semConta: pode.respondePor(semConta, estado),
    }).toEqual(esperado);
  });

  it("unlinks: the dono and admins any linked Jogador, a membro only their own", () => {
    for (const papel of PAPEIS) {
      const pode = capacidades(papel, EU);
      const organiza = papel !== "membro";
      expect([pode.desvincula(meu), pode.desvincula(deOutro), pode.desvincula(semConta)]).toEqual([true, organiza, false]);
    }
  });

  it("without a user, nothing of anyone's counts as theirs", () => {
    const pode = capacidades("membro", null);
    expect(pode.respondePor(semConta, "aberta")).toBe(false);
    expect(pode.desvincula(semConta)).toBe(false);
  });
});
