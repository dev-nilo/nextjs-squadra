import { describe, expect, it } from "vitest";
import { nomeDaPessoa, O_QUE_O_PAPEL_FAZ, papelDadoSchema } from "./pessoas";

describe("nomeDaPessoa", () => {
  it("is the linked Jogador's name, else the email the organizers see, else 'Sem jogador'", () => {
    expect(nomeDaPessoa({ jogador_nome: "Canhoto", email: "c@x.com" })).toBe("Canhoto");
    expect(nomeDaPessoa({ jogador_nome: null, email: "c@x.com" })).toBe("c@x.com");
    expect(nomeDaPessoa({ jogador_nome: null, email: null })).toBe("Sem jogador");
  });
});

describe("papelDadoSchema", () => {
  it("hands out admin and membro, never dono", () => {
    expect(papelDadoSchema.safeParse("admin").success).toBe(true);
    expect(papelDadoSchema.safeParse("membro").success).toBe(true);
    expect(papelDadoSchema.safeParse("dono").success).toBe(false);
  });
});

it("explains every papel", () => {
  expect(Object.keys(O_QUE_O_PAPEL_FAZ).sort()).toEqual(["admin", "dono", "membro"]);
});
