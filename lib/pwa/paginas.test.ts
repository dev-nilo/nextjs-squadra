import { describe, expect, it } from "vitest";
import { guardaOffline, quandoFoiSalvo } from "./paginas";

describe("guardaOffline", () => {
  it("keeps a fut's home and its Elenco", () => {
    expect(guardaOffline("/g/fut-do-dev")).toBe(true);
    expect(guardaOffline("/g/fut-do-dev/")).toBe(true);
    expect(guardaOffline("/g/fut-do-dev/elenco")).toBe(true);
  });

  it("leaves the other pages to the network", () => {
    expect(guardaOffline("/")).toBe(false);
    expect(guardaOffline("/auth")).toBe(false);
    expect(guardaOffline("/g/fut-do-dev/voce")).toBe(false);
    expect(guardaOffline("/g/fut-do-dev/partidas")).toBe(false);
    expect(guardaOffline("/g/fut-do-dev/partidas/123")).toBe(false);
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
