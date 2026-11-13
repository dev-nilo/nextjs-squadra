import { describe, expect, it } from "vitest";
import { situacaoDoConvite, tokenDoConviteSchema } from "./convite";

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
