import type { EmailOtpType, SupabaseClient, User } from "@supabase/supabase-js";

export type SupabaseEnv = {
  url?: string | null;
  key?: string | null;
};

export type SessaoAuth = {
  signInWithPassword: (creds: {
    email: string;
    password: string;
  }) => Promise<{ error: { message: string } | null }>;
  signUp: (args: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string };
  }) => Promise<{
    data: { user: { id: string; identities?: unknown[] | null } | null };
    error: { message: string } | null;
  }>;
  resend: (args: {
    type: "signup";
    email: string;
    options?: { emailRedirectTo?: string };
  }) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<{ error: { message: string } | null }>;
  getUser: () => Promise<{
    data: { user: User | null };
    error: { message: string } | null;
  }>;
  getSession: () => Promise<{
    data: { session: { access_token?: string } | null };
    error: { message: string } | null;
  }>;
  exchangeCodeForSession: (
    code: string,
  ) => Promise<{ error: { message: string } | null }>;
  verifyOtp: (args: {
    token_hash: string;
    type: EmailOtpType;
  }) => Promise<{ error: { message: string } | null }>;
  updateUser: (attrs: {
    password: string;
  }) => Promise<{ error: { message: string } | null }>;
  onAuthStateChange: (
    callback: (
      event: string,
      session: { user: User | null } | null,
    ) => void,
  ) => { data: { subscription: { unsubscribe: () => void } } };
};

/** Every outcome a Sessão flow can end in. sessaoToast has a case for each, checked by the compiler. */
export type CodigoOk = "logged_in" | "signed_up" | "confirmed" | "resent" | "logged_out" | "password_changed";
export type CodigoErro =
  | "not_configured"
  | "email_unconfirmed"
  | "login_failed"
  | "login_error"
  | "password_mismatch"
  | "password_too_short"
  | "password_unchanged"
  | "wrong_current_password"
  | "password_change_failed"
  | "password_change_error"
  | "signup_failed"
  | "email_taken"
  | "signup_error"
  | "email_required"
  | "resend_failed"
  | "resend_error"
  | "logout_failed"
  | "logout_error"
  | "expired_link"
  | "confirm_url_error"
  | "pkce_failed"
  | "otp_failed"
  | "no_session"
  | "confirm_error";

export type SessaoOk = {
  ok: true;
  code: CodigoOk;
  via?: "pkce" | "otp" | "implicit";
};

export type SessaoErr = {
  ok: false;
  code: CodigoErro;
  message?: string;
};

export type SessaoResult = SessaoOk | SessaoErr;

export function readSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseConfigured(env: SupabaseEnv = readSupabaseEnv()): boolean {
  return Boolean(env.url && env.key);
}

export function toSessaoAuth(client: SupabaseClient): SessaoAuth {
  return client.auth as unknown as SessaoAuth;
}

export function decodeAuthDescription(description: string | null | undefined): string {
  if (!description) return "Não foi possível confirmar o email.";
  return decodeURIComponent(description.replace(/\+/g, " "));
}

export function isEmailUnconfirmedError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("email not confirmed") || lower.includes("not confirmed");
}

export function classifyAuthUrlError(input: {
  errorCode: string | null;
  errorDescription: string | null;
}): { kind: "expired_link" | "auth_error"; message: string } {
  const message = decodeAuthDescription(input.errorDescription);
  const isExpired =
    input.errorCode === "otp_expired" ||
    message.toLowerCase().includes("expired") ||
    message.toLowerCase().includes("invalid");

  return {
    kind: isExpired ? "expired_link" : "auth_error",
    message,
  };
}

export async function login(
  auth: SessaoAuth,
  email: string,
  password: string,
  env: SupabaseEnv = readSupabaseEnv(),
): Promise<SessaoResult> {
  if (!isSupabaseConfigured(env)) {
    return { ok: false, code: "not_configured" };
  }

  try {
    const { error } = await auth.signInWithPassword({ email, password });
    if (error) {
      if (isEmailUnconfirmedError(error.message)) {
        return { ok: false, code: "email_unconfirmed", message: error.message };
      }
      return { ok: false, code: "login_failed", message: error.message };
    }
    return { ok: true, code: "logged_in" };
  } catch {
    return { ok: false, code: "login_error" };
  }
}

export async function signup(
  auth: SessaoAuth,
  input: { email: string; password: string; confirmPassword: string },
  emailRedirectTo: string,
  env: SupabaseEnv = readSupabaseEnv(),
): Promise<SessaoResult> {
  if (!isSupabaseConfigured(env)) {
    return { ok: false, code: "not_configured" };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, code: "password_mismatch" };
  }
  if (input.password.length < 6) {
    return { ok: false, code: "password_too_short" };
  }

  try {
    const { data, error } = await auth.signUp({
      email: input.email,
      password: input.password,
      options: { emailRedirectTo },
    });
    if (error) {
      return { ok: false, code: "signup_failed", message: error.message };
    }
    if (
      data.user &&
      (!data.user.identities || data.user.identities.length === 0)
    ) {
      return { ok: false, code: "email_taken" };
    }
    return { ok: true, code: "signed_up" };
  } catch {
    return { ok: false, code: "signup_error" };
  }
}

export async function resendConfirmation(
  auth: SessaoAuth,
  email: string,
  emailRedirectTo: string,
  env: SupabaseEnv = readSupabaseEnv(),
): Promise<SessaoResult> {
  if (!isSupabaseConfigured(env)) {
    return { ok: false, code: "not_configured" };
  }
  const target = email.trim();
  if (!target) {
    return { ok: false, code: "email_required" };
  }

  try {
    const { error } = await auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo },
    });
    if (error) {
      return { ok: false, code: "resend_failed", message: error.message };
    }
    return { ok: true, code: "resent" };
  } catch {
    return { ok: false, code: "resend_error" };
  }
}

export async function logout(auth: SessaoAuth): Promise<SessaoResult> {
  try {
    const { error } = await auth.signOut();
    if (error) {
      return { ok: false, code: "logout_failed", message: error.message };
    }
    return { ok: true, code: "logged_out" };
  } catch {
    return { ok: false, code: "logout_error" };
  }
}

/**
 * Change password for the signed-in user.
 * Re-checks the current password, then updates via Supabase Auth (no DB access needed).
 */
export async function changePassword(
  auth: SessaoAuth,
  email: string,
  input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
  env: SupabaseEnv = readSupabaseEnv(),
): Promise<SessaoResult> {
  if (!isSupabaseConfigured(env)) {
    return { ok: false, code: "not_configured" };
  }
  if (!email.trim()) {
    return { ok: false, code: "email_required" };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, code: "password_mismatch" };
  }
  if (input.newPassword.length < 6) {
    return { ok: false, code: "password_too_short" };
  }
  if (input.currentPassword === input.newPassword) {
    return { ok: false, code: "password_unchanged" };
  }

  try {
    const { error: verifyError } = await auth.signInWithPassword({
      email: email.trim(),
      password: input.currentPassword,
    });
    if (verifyError) {
      return {
        ok: false,
        code: "wrong_current_password",
        message: verifyError.message,
      };
    }

    const { error } = await auth.updateUser({ password: input.newPassword });
    if (error) {
      return { ok: false, code: "password_change_failed", message: error.message };
    }
    return { ok: true, code: "password_changed" };
  } catch {
    return { ok: false, code: "password_change_error" };
  }
}

// ---------------------------------------------------------------------------
// Email confirmation. One policy decides where the user lands and what the
// screen says, for both entry points (/auth/confirm, where the user taps
// Confirmar, and /auth/callback, kept for links already in inboxes and for a
// PKCE `code`). The pages only show the notice and navigate.
// ---------------------------------------------------------------------------

/** Where the confirmation email used to send everyone; it now means `/`. */
const CALLBACK_ANTIGO = "/auth/callback";

/**
 * Where to go after confirming the email, from the `next` the email link
 * carries. Only paths on this site: anything else (another origin,
 * `//evil.com`, garbage) goes to `/`, so the link can't become an open redirect.
 */
export function caminhoSeguro(next: string | null | undefined, origem: string): string {
  if (!next) return "/";
  try {
    const url = new URL(next, origem);
    if (url.origin !== origem) return "/";
    if (url.pathname === CALLBACK_ANTIGO) return "/";
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}

/** An auth error Supabase put in the URL (query or hash), e.g. otp_expired after a scanner opened the link. */
export function erroDaUrl(url: URL): SessaoErr | null {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const ler = (nome: string) => url.searchParams.get(nome) || hash.get(nome);
  const errorCode = ler("error_code") || ler("error");
  if (!errorCode) return null;
  const classified = classifyAuthUrlError({ errorCode, errorDescription: ler("error_description") });
  return {
    ok: false,
    code: classified.kind === "expired_link" ? "expired_link" : "confirm_url_error",
    message: classified.message,
  };
}

async function confirmar(auth: SessaoAuth, url: URL): Promise<SessaoResult> {
  const erro = erroDaUrl(url);
  if (erro) return erro;
  try {
    const code = url.searchParams.get("code");
    if (code) {
      const { error } = await auth.exchangeCodeForSession(code);
      if (error) return { ok: false, code: "pkce_failed", message: error.message };
      return { ok: true, code: "confirmed", via: "pkce" };
    }

    const tokenHash = url.searchParams.get("token_hash");
    if (tokenHash) {
      const type = (url.searchParams.get("type") || "signup") as EmailOtpType;
      const { error } = await auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) return { ok: false, code: "otp_failed", message: error.message };
      return { ok: true, code: "confirmed", via: "otp" };
    }

    const { data, error } = await auth.getSession();
    if (!error && data.session) return { ok: true, code: "logged_in", via: "implicit" };
    return { ok: false, code: "no_session" };
  } catch {
    return { ok: false, code: "confirm_error" };
  }
}

export type Aviso = ReturnType<typeof sessaoToast>;

/**
 * Finishes an email confirmation from the link's URL: where to go and what to
 * say. Confirmed → the `next` the email carried (an invite, or `/`), with one
 * notice. Anything else → the sign-in screen, saying what went wrong.
 */
export async function concluirConfirmacao(auth: SessaoAuth, url: URL): Promise<{ destino: string; aviso: Aviso }> {
  const resultado = await confirmar(auth, url);
  if (!resultado.ok) {
    // Nothing to confirm and no session: just the sign-in screen, no notice.
    return { destino: "/auth", aviso: resultado.code === "no_session" ? null : sessaoToast(resultado, "confirm") };
  }
  return { destino: caminhoSeguro(url.searchParams.get("next"), url.origin), aviso: sessaoToast(resultado, "confirm") };
}

/** Toast/copy mapping for adapters — single policy for shared codes. */
export function sessaoToast(
  result: SessaoResult,
  context:
    | "login"
    | "signup"
    | "resend"
    | "confirm"
    | "watcher"
    | "password" = "login",
): {
  variant: "success" | "error";
  title: string;
  description?: string;
  duration?: number;
} | null {
  if (result.ok) {
    switch (result.code) {
      case "logged_in":
        return { variant: "success", title: "Você entrou." };
      case "signed_up":
        return {
          variant: "success",
          title: "Conta criada!",
          description:
            "Abra o email e clique em Confirmar — isso evita que scanners invalidem o link.",
          duration: 8000,
        };
      case "confirmed":
        return { variant: "success", title: "Email confirmado! Você entrou." };
      case "resent":
        return {
          variant: "success",
          title: "Email reenviado",
          description: "Use o link mais recente. Links antigos deixam de valer.",
        };
      case "logged_out":
        return { variant: "success", title: "Desconectado com sucesso!" };
      case "password_changed":
        return {
          variant: "success",
          title: "Senha atualizada",
          description: "Use a nova senha no próximo login.",
        };
      default:
        return semCaso(result);
    }
  }

  switch (result.code) {
    case "not_configured":
      return {
        variant: "error",
        title: "Configuração ausente",
        description:
          "Supabase não está configurado. Adicione as variáveis de ambiente.",
      };
    case "email_unconfirmed":
      return {
        variant: "error",
        title: "Email não confirmado",
        description:
          "Confirme o email pelo link enviado (ou peça um novo reenvio).",
      };
    case "login_failed":
      return {
        variant: "error",
        title: "Erro ao fazer login",
        description: result.message,
      };
    case "login_error":
      return {
        variant: "error",
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
      };
    case "password_mismatch":
      return {
        variant: "error",
        title: "Senhas não conferem",
        description: "Por favor, verifique suas senhas.",
      };
    case "password_too_short":
      return {
        variant: "error",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
      };
    case "password_unchanged":
      return {
        variant: "error",
        title: "Senha igual à atual",
        description: "Escolha uma senha diferente da atual.",
      };
    case "wrong_current_password":
      return {
        variant: "error",
        title: "Senha atual incorreta",
        description: "Confira a senha atual e tente de novo.",
      };
    case "password_change_failed":
      return {
        variant: "error",
        title: "Não foi possível alterar a senha",
        description: result.message,
      };
    case "password_change_error":
      return {
        variant: "error",
        title: "Erro ao alterar senha",
        description: "Algo deu errado. Tente novamente.",
      };
    case "signup_failed":
      return {
        variant: "error",
        title: "Erro ao criar conta",
        description: result.message,
      };
    case "email_taken":
      return {
        variant: "error",
        title: "Email já cadastrado",
        description: "Tente fazer login ou recuperar a senha.",
      };
    case "signup_error":
      return {
        variant: "error",
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
      };
    case "email_required":
      return {
        variant: "error",
        title: "Informe o email para reenviar a confirmação",
      };
    case "resend_failed":
      return {
        variant: "error",
        title: "Não foi possível reenviar",
        description: result.message,
      };
    case "resend_error":
      return { variant: "error", title: "Erro ao reenviar email" };
    case "expired_link":
      if (context === "watcher") {
        return {
          variant: "error",
          title: "Link de confirmação inválido ou expirado",
          description:
            "Scanners de email costumam abrir o link antes de você. Use Reenviar email de confirmação e abra o link mais recente.",
          duration: 9000,
        };
      }
      return {
        variant: "error",
        title: "Link expirado ou inválido",
        description:
          "Peça um novo email de confirmação. Scanners de email costumam invalidar o link antigo.",
        duration: 8000,
      };
    case "confirm_url_error":
      return {
        variant: "error",
        title: context === "watcher" ? "Erro de autenticação" : "Erro na confirmação",
        description: result.message,
        duration: context === "watcher" ? 9000 : undefined,
      };
    case "pkce_failed":
      return {
        variant: "error",
        title: "Erro ao autenticar",
        description: result.message,
      };
    case "otp_failed":
      return {
        variant: "error",
        title:
          context === "confirm" ? "Não foi possível confirmar" : "Erro ao confirmar",
        description: result.message,
      };
    case "confirm_error":
      return {
        variant: "error",
        title:
          context === "confirm"
            ? "Erro ao confirmar email"
            : "Erro ao processar confirmação",
      };
    case "logout_failed":
    case "logout_error":
      return { variant: "error", title: "Não deu pra sair agora", description: result.message };
    case "no_session":
      return { variant: "error", title: "Entre de novo", description: "Sua sessão não foi encontrada." };
    default:
      return semCaso(result);
  }
}

/** A code with no case above is a compile error: every outcome gets its notice. */
function semCaso(resultado: never): never {
  throw new Error(`sessaoToast: no notice for ${JSON.stringify(resultado)}`);
}

type Notificador = {
  success: (title: string, opts?: { description?: string; duration?: number }) => void;
  error: (title: string, opts?: { description?: string; duration?: number }) => void;
};

/** Shows a notice (a sonner `toast` in the app, a fake in tests). */
export function mostrarAviso(aviso: Aviso, notify: Notificador): void {
  if (!aviso) return;
  const opts = { description: aviso.description, duration: aviso.duration };
  if (aviso.variant === "success") notify.success(aviso.title, opts);
  else notify.error(aviso.title, opts);
}

export function applySessaoToast(result: SessaoResult, context: Parameters<typeof sessaoToast>[1], notify: Notificador): void {
  mostrarAviso(sessaoToast(result, context), notify);
}
