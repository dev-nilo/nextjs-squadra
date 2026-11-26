import { describe, expect, it } from "vitest";
import { ehDoFut, guardaOffline, quandoFoiSalvo } from "./paginas";

describe("guardaOffline", () => {
  it("keeps every tab of a fut, and a Partida opened from a link", () => {
    expect(guardaOffline("/g/fut-do-dev")).toBe(true);
    expect(guardaOffline("/g/fut-do-dev/")).toBe(true);
    expect(guardaOffline("/g/fut-do-dev/elenco")).toBe(true);
    expect(guardaOffline("/g/fut-do-dev/partidas")).toBe(true);
    expect(guardaOffline("/g/fut-do-dev/voce")).toBe(true);
    expect(guardaOffline("/g/fut-do-dev/partidas/0b6c3c8e-7a51-4d0e-9a5f-2f5d1b3c4e6a")).toBe(true);
  });

  it("leaves the other pages to the network", () => {
    expect(guardaOffline("/")).toBe(false);
    expect(guardaOffline("/auth")).toBe(false);
    expect(guardaOffline("/g/fut-do-dev/pessoas")).toBe(false);
    expect(guardaOffline("/g/fut-do-dev/partidas/123/editar")).toBe(false);
    expect(guardaOffline("/convite/abc")).toBe(false);
  });
});

describe("ehDoFut", () => {
  it("matches a fut's pages and nothing of a fut whose slug starts the same", () => {
    expect(ehDoFut("/g/fut", "fut")).toBe(true);
    expect(ehDoFut("/g/fut/elenco", "fut")).toBe(true);
    expect(ehDoFut("/g/fut-do-dev", "fut")).toBe(false);
    expect(ehDoFut("/g/outro/elenco", "fut")).toBe(false);
  });
});

describe("quandoFoiSalvo", () => {
  // 2026-11-13 20:15 in São Paulo (UTC-3).
  const salvo = Date.UTC(2026, 10, 13, 23, 15);

  it("says only the time on the same day", () => {
    expect(quandoFoiSalvo(salvo, salvo + 60 * 60_000)).toBe("20h15");
  });

  it("adds the date from another day", () => {
    expect(quandoFoiSalvo(salvo, salvo + 24 * 60 * 60_000)).toBe("13/11, 20h15");
  });
});
