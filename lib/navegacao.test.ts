import { describe, expect, it } from "vitest";
import { abaDoCaminho, caminhoDaAba, caminhoNoOutroFut } from "./navegacao";

describe("abaDoCaminho", () => {
  it("treats the fut's root, the history and a Partida as the Partidas tab", () => {
    expect(abaDoCaminho("/g/fut-de-quinta")).toBe("partidas");
    expect(abaDoCaminho("/g/fut-de-quinta/")).toBe("partidas");
    expect(abaDoCaminho("/g/fut-de-quinta/partidas")).toBe("partidas");
    expect(abaDoCaminho("/g/fut-de-quinta/partidas/0b6c3c8e-7a51-4d0e-9a5f-2f5d1b3c4e6a")).toBe("partidas");
  });

  it("recognizes the Elenco and Você tabs", () => {
    expect(abaDoCaminho("/g/fut-de-quinta/elenco")).toBe("elenco");
    expect(abaDoCaminho("/g/fut-de-quinta/voce")).toBe("voce");
  });

  it("lights Você on Pessoas, which hangs off it", () => {
    expect(abaDoCaminho("/g/fut-do-dev/pessoas")).toBe("voce");
    expect(caminhoNoOutroFut("/g/fut-do-dev/pessoas", "outro")).toBe("/g/outro/voce");
  });

  it("doesn't mistake a fut whose slug starts like a tab for that tab", () => {
    expect(abaDoCaminho("/g/elenco")).toBe("partidas");
    expect(abaDoCaminho("/g/fut/elencos")).toBe("partidas");
  });
});

describe("caminhoDaAba", () => {
  it("builds each tab's root", () => {
    expect(caminhoDaAba("fut-de-quinta", "partidas")).toBe("/g/fut-de-quinta");
    expect(caminhoDaAba("fut-de-quinta", "elenco")).toBe("/g/fut-de-quinta/elenco");
    expect(caminhoDaAba("fut-de-quinta", "voce")).toBe("/g/fut-de-quinta/voce");
  });
});

describe("caminhoNoOutroFut", () => {
  it("keeps the tab when switching futs", () => {
    expect(caminhoNoOutroFut("/g/quinta/elenco", "sabado")).toBe("/g/sabado/elenco");
    expect(caminhoNoOutroFut("/g/quinta/voce", "sabado")).toBe("/g/sabado/voce");
  });

  it("leaves a Partida for the other fut's next one, since its id belongs to the first fut", () => {
    expect(caminhoNoOutroFut("/g/quinta/partidas/0b6c3c8e-7a51-4d0e-9a5f-2f5d1b3c4e6a", "sabado")).toBe("/g/sabado");
    expect(caminhoNoOutroFut("/g/quinta/partidas", "sabado")).toBe("/g/sabado");
  });
});
