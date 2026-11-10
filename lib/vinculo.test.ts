import { describe, expect, it } from "vitest";
import type { Player } from "@/types";
import { meuJogador, meuJogadorSchema, semConta } from "./vinculo";

const jogador = (name: string, conta_id?: string): Player => ({
  id: name,
  name,
  position: "ALA",
  nationality: "BR",
  image: null,
  attributes: { velocidade: 60, resistencia: 60, chute: 60, posicionamento: 60, defesa: 60, drible: 60, passe: 60, fisico: 60 },
  rating: 60,
  conta_id,
});

describe("meuJogador / semConta", () => {
  const elenco = [jogador("Zé", "conta-ze"), jogador("Bruno"), jogador("Ana")];

  it("finds the Jogador linked to the account", () => {
    expect(meuJogador(elenco, "conta-ze")?.name).toBe("Zé");
    expect(meuJogador(elenco, "outra")).toBeNull();
    expect(meuJogador(elenco, undefined)).toBeNull();
  });

  it("lists the Jogadores nobody claimed yet, by name", () => {
    expect(semConta(elenco).map((p) => p.name)).toEqual(["Ana", "Bruno"]);
  });
});

describe("meuJogadorSchema", () => {
  it("trims the name and accepts the four positions", () => {
    expect(meuJogadorSchema.parse({ nome: "  Zé  ", posicao: "GOL" })).toEqual({ nome: "Zé", posicao: "GOL" });
  });

  it("refuses a blank or long name and an unknown position", () => {
    expect(meuJogadorSchema.safeParse({ nome: "  ", posicao: "ALA" }).success).toBe(false);
    expect(meuJogadorSchema.safeParse({ nome: "x".repeat(41), posicao: "ALA" }).success).toBe(false);
    expect(meuJogadorSchema.safeParse({ nome: "Zé", posicao: "PIVO" }).success).toBe(false);
  });
});
