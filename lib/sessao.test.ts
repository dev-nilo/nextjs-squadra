import { describe, expect, it, vi } from "vitest";
import {
  classifyAuthUrlError,
  completeEmailConfirmation,
  confirmEmailWithToken,
  isEmailUnconfirmedError,
  isSupabaseConfigured,
  login,
  logout,
  resendConfirmation,
  signup,
  type SessaoAuth,
} from "@/lib/sessao";

function createFakeAuth(overrides: Partial<SessaoAuth> = {}): SessaoAuth {
  return {
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({
      data: { user: { id: "1", identities: [{ id: "i1" }] } },
      error: null,
    })),
    resend: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    exchangeCodeForSession: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    ...overrides,
  };
}

describe("isSupabaseConfigured", () => {
  it("is false when url or key missing", () => {
    expect(isSupabaseConfigured({ url: "", key: "k" })).toBe(false);
    expect(isSupabaseConfigured({ url: "u", key: "" })).toBe(false);
  });

  it("is true when both present", () => {
    expect(isSupabaseConfigured({ url: "https://x.supabase.co", key: "anon" })).toBe(
      true,
    );
  });
});

describe("classifyAuthUrlError", () => {
  it("detects otp_expired as expired_link", () => {
    const result = classifyAuthUrlError({
      errorCode: "otp_expired",
      errorDescription: null,
    });
    expect(result.kind).toBe("expired_link");
  });

  it("detects invalid/expired in description", () => {
    const result = classifyAuthUrlError({
      errorCode: "access_denied",
      errorDescription: "Email+link+is+invalid+or+has+expired",
    });
    expect(result.kind).toBe("expired_link");
    expect(result.message).toContain("invalid");
  });

  it("returns generic auth_error otherwise", () => {
    const result = classifyAuthUrlError({
      errorCode: "server_error",
      errorDescription: "Something+broke",
    });
    expect(result.kind).toBe("auth_error");
    expect(result.message).toBe("Something broke");
  });
});

describe("login", () => {
  it("returns not_configured when env missing", async () => {
    const auth = createFakeAuth();
    const result = await login(auth, "a@b.com", "secret", {
      url: "",
      key: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns email_unconfirmed for unconfirmed errors", async () => {
    const auth = createFakeAuth({
      signInWithPassword: vi.fn(async () => ({
        error: { message: "Email not confirmed" },
      })),
    });
    const result = await login(auth, "a@b.com", "secret", {
      url: "u",
      key: "k",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("email_unconfirmed");
  });

  it("returns login_failed for other auth errors", async () => {
    const auth = createFakeAuth({
      signInWithPassword: vi.fn(async () => ({
        error: { message: "Invalid login credentials" },
      })),
    });
    const result = await login(auth, "a@b.com", "bad", { url: "u", key: "k" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("login_failed");
  });
});

describe("signup", () => {
  it("rejects mismatched passwords without calling auth", async () => {
    const auth = createFakeAuth();
    const result = await signup(
      auth,
      { email: "a@b.com", password: "123456", confirmPassword: "999999" },
      "https://app/auth/callback",
      { url: "u", key: "k" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("password_mismatch");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("rejects short passwords", async () => {
    const auth = createFakeAuth();
    const result = await signup(
      auth,
      { email: "a@b.com", password: "123", confirmPassword: "123" },
      "https://app/auth/callback",
      { url: "u", key: "k" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("password_too_short");
  });

  it("detects duplicate email via empty identities", async () => {
    const auth = createFakeAuth({
      signUp: vi.fn(async () => ({
        data: { user: { id: "1", identities: [] } },
        error: null,
      })),
    });
    const result = await signup(
      auth,
      { email: "a@b.com", password: "123456", confirmPassword: "123456" },
      "https://app/auth/callback",
      { url: "u", key: "k" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("email_taken");
  });
});

describe("completeEmailConfirmation", () => {
  it("returns expired_link for URL errors before calling auth", async () => {
    const auth = createFakeAuth();
    const result = await completeEmailConfirmation(auth, {
      errorCode: "otp_expired",
      errorDescription: null,
      code: null,
      tokenHash: null,
      type: "signup",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("expired_link");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges PKCE code on success", async () => {
    const auth = createFakeAuth();
    const result = await completeEmailConfirmation(auth, {
      errorCode: null,
      errorDescription: null,
      code: "abc",
      tokenHash: null,
      type: "signup",
    });
    expect(result).toEqual({ ok: true, code: "confirmed", via: "pkce" });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("verifies OTP token_hash", async () => {
    const auth = createFakeAuth();
    const result = await completeEmailConfirmation(auth, {
      errorCode: null,
      errorDescription: null,
      code: null,
      tokenHash: "tok",
      type: "signup",
    });
    expect(result).toEqual({ ok: true, code: "confirmed", via: "otp" });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "tok",
      type: "signup",
    });
  });

  it("returns pkce_failed when exchange fails", async () => {
    const auth = createFakeAuth({
      exchangeCodeForSession: vi.fn(async () => ({
        error: { message: "bad code" },
      })),
    });
    const result = await completeEmailConfirmation(auth, {
      errorCode: null,
      errorDescription: null,
      code: "abc",
      tokenHash: null,
      type: "signup",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("pkce_failed");
  });

  it("returns no_session when nothing to complete", async () => {
    const auth = createFakeAuth();
    const result = await completeEmailConfirmation(auth, {
      errorCode: null,
      errorDescription: null,
      code: null,
      tokenHash: null,
      type: "signup",
    });
    expect(result).toEqual({ ok: false, code: "no_session" });
  });
});

describe("confirmEmailWithToken / logout / resend", () => {
  it("confirmEmailWithToken succeeds", async () => {
    const auth = createFakeAuth();
    const result = await confirmEmailWithToken(auth, "hash", "signup");
    expect(result).toEqual({ ok: true, code: "confirmed" });
  });

  it("logout succeeds", async () => {
    const auth = createFakeAuth();
    expect(await logout(auth)).toEqual({ ok: true, code: "logged_out" });
  });

  it("resendConfirmation requires email", async () => {
    const auth = createFakeAuth();
    const result = await resendConfirmation(auth, "", "https://cb", {
      url: "u",
      key: "k",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("email_required");
  });
});

describe("isEmailUnconfirmedError", () => {
  it("matches known phrases", () => {
    expect(isEmailUnconfirmedError("Email not confirmed")).toBe(true);
    expect(isEmailUnconfirmedError("User not confirmed")).toBe(true);
    expect(isEmailUnconfirmedError("Invalid login")).toBe(false);
  });
});
