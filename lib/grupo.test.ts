import { describe, expect, it } from "vitest";
import { grupoAtual, validarNomeDoGrupo } from "./grupo";

describe("validarNomeDoGrupo", () => {
  it("accepts a name and trims it", () => {
    expect(validarNomeDoGrupo("  Fut de Quinta  ")).toEqual({ ok: true, nome: "Fut de Quinta" });
  });

  it("rejects an empty or blank name", () => {
    expect(validarNomeDoGrupo("")).toEqual({ ok: false, message: "Dê um nome pro seu fut." });
    expect(validarNomeDoGrupo("   ")).toEqual({ ok: false, message: "Dê um nome pro seu fut." });
  });

  it("accepts 60 characters and rejects 61, like the database", () => {
    expect(validarNomeDoGrupo("a".repeat(60)).ok).toBe(true);
    expect(validarNomeDoGrupo("a".repeat(61))).toEqual({ ok: false, message: "Use até 60 caracteres." });
  });

  it("treats a missing form field as empty", () => {
    expect(validarNomeDoGrupo(null).ok).toBe(false);
  });
});

describe("grupoAtual", () => {
  const grupo = (slug: string, papel: "dono" | "admin" | "membro", desde: string) => ({
    id: slug,
    slug,
    nome: slug,
    papel,
    desde,
  });

  it("is null for a user with no Grupo", () => {
    expect(grupoAtual([])).toBeNull();
  });

  it("prefers a Grupo the user owns over an older one they joined", () => {
    const atual = grupoAtual([
      grupo("pelada-do-ze", "membro", "2026-01-01"),
      grupo("fut-de-quinta", "dono", "2026-03-01"),
    ]);
    expect(atual).toEqual({ id: "fut-de-quinta", slug: "fut-de-quinta", nome: "fut-de-quinta", papel: "dono" });
  });

  it("picks the oldest among the same kind", () => {
    const atual = grupoAtual([
      grupo("novo", "admin", "2026-05-01"),
      grupo("antigo", "membro", "2026-02-01"),
    ]);
    expect(atual?.slug).toBe("antigo");
  });
});
