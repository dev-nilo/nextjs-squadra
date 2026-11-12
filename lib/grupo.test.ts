import { describe, expect, it } from "vitest";
import { grupoAtual, grupoParaAbrir, lembrarFut, lerFutsRecentes, slugDoCaminho, validarNomeDoGrupo } from "./grupo";

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

describe("grupoParaAbrir", () => {
  const p = (slug: string, papel: "dono" | "admin" | "membro", desde: string) => ({
    id: `id-${slug}`,
    slug,
    nome: slug,
    papel,
    desde,
  });
  const participacoes = [p("antigo", "dono", "2026-01-01"), p("novo", "membro", "2026-06-01")];

  it("reopens the most recent Grupo used on this device", () => {
    expect(grupoParaAbrir(participacoes, ["novo", "antigo"])).toEqual({
      id: "id-novo",
      slug: "novo",
      nome: "novo",
      papel: "membro",
    });
  });

  it("skips a recent slug the user isn't in", () => {
    expect(grupoParaAbrir(participacoes, ["de-outro", "novo"])).toMatchObject({ slug: "novo" });
  });

  it("falls back to the default Grupo", () => {
    expect(grupoParaAbrir(participacoes, [])).toMatchObject({ slug: "antigo" });
    expect(grupoParaAbrir(participacoes, ["saiu"])).toMatchObject({ slug: "antigo" });
  });

  it("is null with no Grupo at all, so the first-access screen", () => {
    expect(grupoParaAbrir([], ["qualquer"])).toBeNull();
  });
});

describe("futs recentes cookie", () => {
  it("puts the opened slug first, without repeats, keeping five", () => {
    expect(lembrarFut("a,b,c", "b")).toBe("b,a,c");
    expect(lembrarFut(undefined, "a")).toBe("a");
    expect(lembrarFut("a,b,c,d,e", "f")).toBe("f,a,b,c,d");
  });

  it("ignores anything that isn't a slug", () => {
    expect(lerFutsRecentes("ok,Not Ok,,../x,fut-2")).toEqual(["ok", "fut-2"]);
    expect(lembrarFut("a", "<script>")).toBe("a");
  });
});

describe("slugDoCaminho", () => {
  it("reads the slug from /g/<slug>", () => {
    expect(slugDoCaminho("/g/fut-de-quinta")).toBe("fut-de-quinta");
    expect(slugDoCaminho("/g/fut-de-quinta/")).toBe("fut-de-quinta");
  });

  it("is null anywhere else", () => {
    expect(slugDoCaminho("/")).toBeNull();
    expect(slugDoCaminho("/auth")).toBeNull();
    expect(slugDoCaminho(null)).toBeNull();
  });
});
