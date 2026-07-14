import { describe, expect, it } from "vitest";
import type { Attributes } from "@/types";
import {
  calculateOVR,
  coerceStat,
  DEFAULT_ATTRIBUTES,
  filterPlayersForUser,
  normalizeAttributes,
  normalizePlayer,
} from "@/lib/jogador";

describe("calculateOVR (Jogador domain seam)", () => {
  it("returns the rounded mean of all attributes", () => {
    const attrs: Attributes = {
      ...DEFAULT_ATTRIBUTES,
      velocidade: 80,
      resistencia: 70,
      chute: 90,
      posicionamento: 60,
      defesa: 50,
      drible: 100,
      passe: 40,
      fisico: 30,
    };
    // (80+70+90+60+50+100+40+30) / 8 = 65
    expect(calculateOVR(attrs)).toBe(65);
  });

  it("rounds .5 up via Math.round", () => {
    const attrs: Attributes = {
      velocidade: 71,
      resistencia: 71,
      chute: 71,
      posicionamento: 71,
      defesa: 71,
      drible: 71,
      passe: 71,
      fisico: 70,
    };
    // 568 / 8 = 71
    expect(calculateOVR(attrs)).toBe(71);
  });
});

describe("coerceStat", () => {
  it("keeps finite numbers", () => {
    expect(coerceStat(77)).toBe(77);
  });

  it("parses numeric strings and rounds", () => {
    expect(coerceStat("82.6")).toBe(83);
  });

  it("rejects empty string and non-finite values", () => {
    expect(coerceStat("")).toBeUndefined();
    expect(coerceStat("abc")).toBeUndefined();
    expect(coerceStat(NaN)).toBeUndefined();
    expect(coerceStat(null)).toBeUndefined();
  });
});

describe("normalizeAttributes", () => {
  it("fills missing keys from defaults", () => {
    expect(normalizeAttributes({ velocidade: 99 })).toEqual({
      ...DEFAULT_ATTRIBUTES,
      velocidade: 99,
    });
  });

  it("coerces string attribute values", () => {
    expect(normalizeAttributes({ chute: "88" }).chute).toBe(88);
  });
});

describe("normalizePlayer", () => {
  it("builds a Jogador with OVR from attributes when rating missing", () => {
    const player = normalizePlayer({
      id: "1",
      name: "Nilo",
      position: "ATA",
      nationality: "BR",
      velocidade: 80,
      resistencia: 80,
      chute: 80,
      posicionamento: 80,
      defesa: 80,
      drible: 80,
      passe: 80,
      fisico: 80,
    });

    expect(player.rating).toBe(80);
    expect(player.attributes.velocidade).toBe(80);
    expect(player.name).toBe("Nilo");
  });

  it("prefers nested attributes over defaults and maps image_url", () => {
    const player = normalizePlayer({
      id: "2",
      name: "Ana",
      attributes: { velocidade: 91 },
      image_url: "https://example.com/a.jpg",
      ovr: 55,
    });

    expect(player.attributes.velocidade).toBe(91);
    expect(player.attributes.chute).toBe(DEFAULT_ATTRIBUTES.chute);
    expect(player.image).toBe("https://example.com/a.jpg");
    expect(player.rating).toBe(55);
  });

  it("falls back unknown nationality to BR", () => {
    expect(normalizePlayer({ id: "3", nationality: "ZZ" }).nationality).toBe("BR");
  });
});

describe("filterPlayersForUser", () => {
  it("keeps only matching user_id (or unset) when scoped", () => {
    const players = [
      normalizePlayer({ id: "a", user_id: "u1" }),
      normalizePlayer({ id: "b", user_id: "u2" }),
      normalizePlayer({ id: "c" }),
    ];
    expect(filterPlayersForUser(players, "u1").map((p) => p.id).sort()).toEqual([
      "a",
      "c",
    ]);
  });

  it("keeps only unowned rows for guest scope", () => {
    const players = [
      normalizePlayer({ id: "a", user_id: "u1" }),
      normalizePlayer({ id: "b" }),
    ];
    expect(filterPlayersForUser(players, null).map((p) => p.id)).toEqual(["b"]);
  });
});
