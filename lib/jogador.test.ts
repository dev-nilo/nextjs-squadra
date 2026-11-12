import { describe, expect, it } from "vitest";
import type { Attributes } from "@/types";
import {
  calculateOVR,
  coerceStat,
  DEFAULT_ATTRIBUTES,
  ehFotoDoGrupo,
  jogadorParaLinha,
  jogadorSchema,
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

  it("rounds half away from zero via Math.round (65.5 → 66)", () => {
    const attrs: Attributes = {
      velocidade: 66,
      resistencia: 66,
      chute: 66,
      posicionamento: 66,
      defesa: 66,
      drible: 66,
      passe: 66,
      fisico: 62,
    };
    // 524 / 8 = 65.5 → 66
    expect(calculateOVR(attrs)).toBe(66);
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

describe("jogadorSchema", () => {
  const valido = {
    id: "0b5c1f3e-8d2a-4c1b-9e7f-1a2b3c4d5e6f",
    name: "  Paredão ",
    position: "GOL",
    nationality: "BR",
    image: null,
    attributes: { ...DEFAULT_ATTRIBUTES, defesa: 90 },
  };

  it("accepts a Jogador and trims the name", () => {
    const parsed = jogadorSchema.parse(valido);
    expect(parsed.name).toBe("Paredão");
  });

  it.each([
    ["an attribute above 99", { attributes: { ...DEFAULT_ATTRIBUTES, chute: 120 } }],
    ["a fractional attribute", { attributes: { ...DEFAULT_ATTRIBUTES, chute: 60.5 } }],
    ["a missing attribute", { attributes: { velocidade: 60 } }],
    ["an unknown position", { position: "ZAG" }],
    ["an empty name", { name: "   " }],
    ["a name over 40 characters", { name: "x".repeat(41) }],
    ["a country that isn't a code", { nationality: "Brasil" }],
    ["an id that isn't a UUID", { id: "123" }],
  ])("rejects %s", (_caso, mudanca) => {
    expect(jogadorSchema.safeParse({ ...valido, ...mudanca }).success).toBe(false);
  });

  it("maps to the players columns with the rating computed from the attributes", () => {
    const linha = jogadorParaLinha(jogadorSchema.parse(valido));
    expect(linha).toMatchObject({ name: "Paredão", position: "GOL", image_url: null, defesa: 90 });
    expect(linha.ovr).toBe(calculateOVR({ ...DEFAULT_ATTRIBUTES, defesa: 90 }));
    expect(linha).not.toHaveProperty("rating");
  });
});

describe("ehFotoDoGrupo", () => {
  const base = "https://abc.supabase.co";
  const grupo = "11111111-1111-4111-8111-111111111111";
  const pasta = `${base}/storage/v1/object/public/player-images/${grupo}`;

  it("accepts a photo in this Grupo's folder, cache-busting query included", () => {
    expect(ehFotoDoGrupo(`${pasta}/jogador.jpg?v=1`, grupo, base)).toBe(true);
  });

  it.each([
    ["another site", `https://example.com/storage/v1/object/public/player-images/${grupo}/x.jpg`],
    ["another Grupo's folder", `${base}/storage/v1/object/public/player-images/22222222-2222-4222-8222-222222222222/x.jpg`],
    ["a path that climbs out of the folder", `${pasta}/../outro/x.jpg`],
    ["an encoded climb out of the folder", `${pasta}/%2e%2e/outro/x.jpg`],
    ["an inline image", "data:image/png;base64,AAAA"],
    ["something that isn't a URL", "jogador.jpg"],
  ])("rejects %s", (_caso, url) => {
    expect(ehFotoDoGrupo(url, grupo, base)).toBe(false);
  });
});
