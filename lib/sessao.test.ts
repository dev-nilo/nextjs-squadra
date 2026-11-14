import { describe, expect, it, vi } from "vitest";
import {
  changePassword,
  classifyAuthUrlError,
  caminhoSeguro,
  concluirConfirmacao,
  definirNovaSenha,
  sessaoToast,
  isEmailUnconfirmedError,
  isSupabaseConfigured,
  login,
  logout,
  NOVA_SENHA,
  pedirNovaSenha,
  resendConfirmation,
  RETORNO_DA_RECUPERACAO,
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
    updateUser: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
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

const ORIGEM = "https://squadra-eight.vercel.app";
/** The link the confirmation email carries (supabase/templates/confirm-signup.html). */
const linkDoEmail = (next: string) => new URL(`${ORIGEM}/auth/confirm?token_hash=abc&type=signup&next=${encodeURIComponent(next)}`);

describe("concluirConfirmacao", () => {
  it("a plain sign-up lands on / in one hop, with one notice", async () => {
    const auth = createFakeAuth();
    const { destino, aviso } = await concluirConfirmacao(auth, linkDoEmail(`${ORIGEM}/`));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "signup" });
    expect(destino).toBe("/");
    expect(aviso).toEqual({ variant: "success", title: "Email confirmado! Você entrou." });
  });

  it("an invite sign-up lands on the invite", async () => {
    const { destino } = await concluirConfirmacao(createFakeAuth(), linkDoEmail(`${ORIGEM}/convite/0123456789abcdef0123456789abcdef`));
    expect(destino).toBe("/convite/0123456789abcdef0123456789abcdef");
  });

  it("a link sent before this change (next = /auth/callback) also lands on / directly", async () => {
    expect((await concluirConfirmacao(createFakeAuth(), linkDoEmail(`${ORIGEM}/auth/callback`))).destino).toBe("/");
  });

  it("never sends anyone off the site", async () => {
    expect((await concluirConfirmacao(createFakeAuth(), linkDoEmail("https://evil.example/x"))).destino).toBe("/");
  });

  it("an expired link in the URL goes to sign-in without calling auth", async () => {
    const auth = createFakeAuth();
    const url = new URL(`${ORIGEM}/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`);
    const { destino, aviso } = await concluirConfirmacao(auth, url);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(destino).toBe("/auth");
    expect(aviso).toMatchObject({ variant: "error", title: "Link expirado ou inválido" });
  });

  it("a token Supabase refuses goes to sign-in, saying why", async () => {
    const auth = createFakeAuth({ verifyOtp: vi.fn(async () => ({ error: { message: "Token has expired or is invalid" } })) });
    const { destino, aviso } = await concluirConfirmacao(auth, linkDoEmail(`${ORIGEM}/`));
    expect(destino).toBe("/auth");
    expect(aviso).toMatchObject({ variant: "error", title: "Não foi possível confirmar", description: "Token has expired or is invalid" });
  });

  it("exchanges a PKCE code", async () => {
    const auth = createFakeAuth();
    const { destino, aviso } = await concluirConfirmacao(auth, new URL(`${ORIGEM}/auth/callback?code=xyz`));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("xyz");
    expect(destino).toBe("/");
    expect(aviso?.variant).toBe("success");
  });

  it("with nothing to confirm and no session, goes to sign-in quietly", async () => {
    expect(await concluirConfirmacao(createFakeAuth(), new URL(`${ORIGEM}/auth/callback`))).toEqual({ destino: "/auth", aviso: null });
  });
});

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

describe("sessaoToast", () => {
  it("has a notice for every outcome, so a new code without one won't compile", () => {
    expect(sessaoToast({ ok: false, code: "logout_failed" })).toMatchObject({ variant: "error" });
    expect(sessaoToast({ ok: true, code: "logged_out" })).toMatchObject({ variant: "success" });
  });
});

describe("logout / resend", () => {
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

describe("changePassword", () => {
  const env = { url: "u", key: "k" };

  it("rejects wrong current password", async () => {
    const auth = createFakeAuth({
      signInWithPassword: vi.fn(async () => ({
        error: { message: "Invalid login credentials" },
      })),
    });
    const result = await changePassword(
      auth,
      "a@b.com",
      {
        currentPassword: "old",
        newPassword: "newpass",
        confirmPassword: "newpass",
      },
      env,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("wrong_current_password");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates password when current is valid", async () => {
    const auth = createFakeAuth();
    const result = await changePassword(
      auth,
      "a@b.com",
      {
        currentPassword: "oldpass",
        newPassword: "newpass",
        confirmPassword: "newpass",
      },
      env,
    );
    expect(result).toEqual({ ok: true, code: "password_changed" });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "newpass" });
  });
});

describe("pedirNovaSenha", () => {
  const env = { url: "u", key: "k" };

  it("sends the link to the trimmed email, coming back where Supabase's default email needs", async () => {
    const auth = createFakeAuth();
    const result = await pedirNovaSenha(auth, "  a@b.com ", `${ORIGEM}${RETORNO_DA_RECUPERACAO}`, env);
    expect(result).toEqual({ ok: true, code: "recovery_sent" });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.com", { redirectTo: `${ORIGEM}/auth/callback?next=${NOVA_SENHA}` });
  });

  it("needs an email, and says the same thing whether or not it has an account", async () => {
    const auth = createFakeAuth();
    expect(await pedirNovaSenha(auth, " ", "https://cb", env)).toEqual({ ok: false, code: "email_required" });
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(sessaoToast({ ok: true, code: "recovery_sent" }, "recovery")?.description).toMatch(/^Se esse email tiver conta/);
  });

  it("passes on what Supabase refused, e.g. asking again too soon", async () => {
    const auth = createFakeAuth({
      resetPasswordForEmail: vi.fn(async () => ({ error: { message: "For security purposes, you can only request this after 30 seconds." } })),
    });
    expect(await pedirNovaSenha(auth, "a@b.com", "https://cb", env)).toMatchObject({ ok: false, code: "recovery_failed" });
  });
});

describe("definirNovaSenha", () => {
  const env = { url: "u", key: "k" };
  const comSessao = () =>
    createFakeAuth({ getSession: vi.fn(async () => ({ data: { session: { access_token: "t" } }, error: null })) });

  it("sets the password for the session the recovery link opened, with no current password", async () => {
    const auth = comSessao();
    expect(await definirNovaSenha(auth, { newPassword: "nova-123", confirmPassword: "nova-123" }, env)).toEqual({ ok: true, code: "password_set" });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "nova-123" });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("checks the two fields before calling auth", async () => {
    const auth = comSessao();
    expect(await definirNovaSenha(auth, { newPassword: "nova-123", confirmPassword: "outra-123" }, env)).toEqual({ ok: false, code: "password_mismatch" });
    expect(await definirNovaSenha(auth, { newPassword: "curta", confirmPassword: "curta" }, env)).toEqual({ ok: false, code: "password_too_short" });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("refuses with no session, as when the page is opened without the link", async () => {
    const auth = createFakeAuth();
    expect(await definirNovaSenha(auth, { newPassword: "nova-123", confirmPassword: "nova-123" }, env)).toEqual({ ok: false, code: "no_session" });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("passes on what Supabase refused", async () => {
    const auth = createFakeAuth({
      getSession: vi.fn(async () => ({ data: { session: { access_token: "t" } }, error: null })),
      updateUser: vi.fn(async () => ({ error: { message: "New password should be different from the old password." } })),
    });
    expect(await definirNovaSenha(auth, { newPassword: "nova-123", confirmPassword: "nova-123" }, env)).toMatchObject({
      ok: false,
      code: "password_set_failed",
    });
  });
});

describe("concluirConfirmacao, for a password recovery link", () => {
  /** The link the recovery email carries (supabase/templates/recovery.html). */
  const linkDeRecuperacao = (extra = "") => new URL(`${ORIGEM}/auth/confirm?token_hash=abc&type=recovery${extra}`);

  it("verifies the recovery token and always goes to the new-password page", async () => {
    const auth = createFakeAuth();
    const { destino, aviso } = await concluirConfirmacao(auth, linkDeRecuperacao(`&next=${encodeURIComponent(`${ORIGEM}/convite/x`)}`));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "recovery" });
    expect(destino).toBe(NOVA_SENHA);
    expect(aviso).toEqual({ variant: "success", title: "Agora é só criar a senha nova." });
  });

  it("Supabase's default email, back through /auth/callback with a PKCE code, also ends there", async () => {
    const auth = createFakeAuth();
    const { destino, aviso } = await concluirConfirmacao(auth, new URL(`${ORIGEM}${RETORNO_DA_RECUPERACAO}&code=xyz`));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("xyz");
    expect(destino).toBe(NOVA_SENHA);
    expect(aviso?.title).toBe("Agora é só criar a senha nova.");
  });

  it("a used or old link goes to sign-in, saying to ask for another", async () => {
    const auth = createFakeAuth({ verifyOtp: vi.fn(async () => ({ error: { message: "Email link is invalid or has expired" } })) });
    const { destino, aviso } = await concluirConfirmacao(auth, linkDeRecuperacao());
    expect(destino).toBe("/auth");
    expect(aviso).toMatchObject({ variant: "error", title: "Esse link não vale mais" });
  });

  it("a sign-up link still confirms and goes to its next", async () => {
    const { destino, aviso } = await concluirConfirmacao(createFakeAuth(), linkDoEmail(`${ORIGEM}/convite/x`));
    expect(destino).toBe("/convite/x");
    expect(aviso?.title).toBe("Email confirmado! Você entrou.");
  });
});

describe("isEmailUnconfirmedError", () => {
  it("matches known phrases", () => {
    expect(isEmailUnconfirmedError("Email not confirmed")).toBe(true);
    expect(isEmailUnconfirmedError("User not confirmed")).toBe(true);
    expect(isEmailUnconfirmedError("Invalid login")).toBe(false);
  });
});
