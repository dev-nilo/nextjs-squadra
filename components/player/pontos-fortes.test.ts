import { describe, expect, it } from "vitest";
import { pontosFortes } from "@/components/player/PlayerCard";

describe("pontosFortes", () => {
  const base = { velocidade: 60, posicionamento: 60, resistencia: 60, defesa: 60, chute: 60, drible: 60, passe: 60, fisico: 60 };

  it("picks the two best attributes", () => {
    expect(pontosFortes({ ...base, chute: 90, passe: 80 })).toEqual(new Set(["chute", "passe"]));
  });

  it("breaks ties by table order", () => {
    expect(pontosFortes(base)).toEqual(new Set(["velocidade", "posicionamento"]));
  });
});
