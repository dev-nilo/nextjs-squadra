import { describe, expect, it } from "vitest";
import { caminhoSeguro, situacaoDoConvite, tokenDoConviteSchema } from "./convite";

const ORIGEM = "https://squadra-eight.vercel.app";

describe("caminhoSeguro", () => {
  it("keeps a path on this site, from an absolute URL or a relative path", () => {
    expect(caminhoSeguro(`${ORIGEM}/convite/abc`, ORIGEM)).toBe("/convite/abc");
    expect(caminhoSeguro("/convite/abc?x=1#y", ORIGEM)).toBe("/convite/abc?x=1#y");
  });

  it("sends anything off-site to /", () => {
    expect(caminhoSeguro("https://evil.example/convite/abc", ORIGEM)).toBe("/");
    expect(caminhoSeguro("//evil.example/x", ORIGEM)).toBe("/");
    expect(caminhoSeguro("javascript:alert(1)", ORIGEM)).toBe("/");
  });

  it("is / when there's no next", () => {
    expect(caminhoSeguro(null, ORIGEM)).toBe("/");
    expect(caminhoSeguro("", ORIGEM)).toBe("/");
  });
});

describe("tokenDoConviteSchema", () => {
  it("accepts 32 lowercase hex characters only", () => {
    expect(tokenDoConviteSchema.safeParse("0123456789abcdef0123456789abcdef").success).toBe(true);
    expect(tokenDoConviteSchema.safeParse("0123456789ABCDEF0123456789ABCDEF").success).toBe(false);
    expect(tokenDoConviteSchema.safeParse("curto").success).toBe(false);
    expect(tokenDoConviteSchema.safeParse("'; drop table convites; --").success).toBe(false);
  });
});

describe("situacaoDoConvite", () => {
  it("passes known situations through and treats anything else as not found", () => {
    expect(situacaoDoConvite("valido")).toBe("valido");
    expect(situacaoDoConvite("expirado")).toBe("expirado");
    expect(situacaoDoConvite(undefined)).toBe("inexistente");
    expect(situacaoDoConvite("qualquer")).toBe("inexistente");
  });
});
