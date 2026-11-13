import { describe, expect, it } from "vitest";
import type { Attributes } from "@/types";
import {
  calculateOVR,
  DEFAULT_ATTRIBUTES,
  ehFotoDoGrupo,
  jogadorDaLinha,
  jogadorParaLinha,
  jogadorSchema,
  type LinhaDoJogador,
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

describe("jogadorDaLinha", () => {
  const linha: LinhaDoJogador = {
    id: "8f9c2f0e-2c43-4a8e-9d3a-0f6b1e2a7c11",
    grupo_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    user_id: null,
    conta_id: "conta-1",
    name: "Paredão",
    position: "GOL",
    nationality: "BR",
    image_url: null,
    ovr: 62,
    ...DEFAULT_ATTRIBUTES,
    defesa: 76,
  };

  it("maps a players row to a Jogador, taking the database's rating as is", () => {
    expect(jogadorDaLinha(linha)).toEqual({
      id: linha.id,
      name: "Paredão",
      position: "GOL",
      nationality: "BR",
      image: null,
      attributes: { ...DEFAULT_ATTRIBUTES, defesa: 76 },
      rating: 62,
      user_id: undefined,
      grupo_id: linha.grupo_id,
      conta_id: "conta-1",
    });
  });

  it("never recomputes the rating: the trigger players_ovr owns it", () => {
    expect(jogadorDaLinha({ ...linha, ovr: 10 }).rating).toBe(10);
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

  it("maps to the players columns and leaves the rating to the database", () => {
    const linha = jogadorParaLinha(jogadorSchema.parse(valido));
    expect(linha).toMatchObject({ name: "Paredão", position: "GOL", image_url: null, defesa: 90 });
    expect(linha).not.toHaveProperty("ovr");
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
