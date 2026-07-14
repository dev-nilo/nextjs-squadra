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
  onAuthStateChange: (
    callback: (
      event: string,
      session: { user: User | null } | null,
    ) => void,
  ) => { data: { subscription: { unsubscribe: () => void } } };
};

export type SessaoOk = {
  ok: true;
  code: string;
  via?: string;
};

export type SessaoErr = {
  ok: false;
  code: string;
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

export async function completeEmailConfirmation(
  auth: SessaoAuth,
  params: {
    errorCode: string | null;
    errorDescription: string | null;
    code: string | null;
    tokenHash: string | null;
    type: EmailOtpType | string;
  },
): Promise<SessaoResult> {
  if (params.errorCode) {
    const classified = classifyAuthUrlError({
      errorCode: params.errorCode,
      errorDescription: params.errorDescription,
    });
    return {
      ok: false,
      code: classified.kind === "expired_link" ? "expired_link" : "confirm_url_error",
      message: classified.message,
    };
  }

  try {
    if (params.code) {
      const { error } = await auth.exchangeCodeForSession(params.code);
      if (error) {
        return { ok: false, code: "pkce_failed", message: error.message };
      }
      return { ok: true, code: "confirmed", via: "pkce" };
    }

    if (params.tokenHash) {
      const { error } = await auth.verifyOtp({
        token_hash: params.tokenHash,
        type: (params.type || "signup") as EmailOtpType,
      });
      if (error) {
        return { ok: false, code: "otp_failed", message: error.message };
      }
      return { ok: true, code: "confirmed", via: "otp" };
    }

    const { data, error } = await auth.getSession();
    if (!error && data.session) {
      return { ok: true, code: "logged_in", via: "implicit" };
    }

    return { ok: false, code: "no_session" };
  } catch {
    return { ok: false, code: "confirm_error" };
  }
}

export async function confirmEmailWithToken(
  auth: SessaoAuth,
  tokenHash: string,
  type: EmailOtpType | string = "signup",
): Promise<SessaoResult> {
  if (!tokenHash) {
    return { ok: false, code: "invalid_link" };
  }
  try {
    const { error } = await auth.verifyOtp({
      token_hash: tokenHash,
      type: (type || "signup") as EmailOtpType,
    });
    if (error) {
      return { ok: false, code: "otp_failed", message: error.message };
    }
    return { ok: true, code: "confirmed" };
  } catch {
    return { ok: false, code: "confirm_error" };
  }
}

/** Toast/copy mapping for adapters — single policy for shared codes. */
export function sessaoToast(
  result: SessaoResult,
  context: "login" | "signup" | "resend" | "callback" | "confirm" | "watcher" = "login",
): {
  variant: "success" | "error";
  title: string;
  description?: string;
  duration?: number;
} | null {
  if (result.ok) {
    switch (result.code) {
      case "logged_in":
        if (result.via === "implicit") {
          return { variant: "success", title: "Login realizado!" };
        }
        return {
          variant: "success",
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta!",
        };
      case "signed_up":
        return {
          variant: "success",
          title: "Conta criada!",
          description:
            "Abra o email e clique em Confirmar — isso evita que scanners invalidem o link.",
          duration: 8000,
        };
      case "confirmed":
        if (context === "confirm") {
          return { variant: "success", title: "Email confirmado!" };
        }
        return { variant: "success", title: "Email confirmado com sucesso!" };
      case "resent":
        return {
          variant: "success",
          title: "Email reenviado",
          description: "Use o link mais recente. Links antigos deixam de valer.",
        };
      case "logged_out":
        return { variant: "success", title: "Desconectado com sucesso!" };
      default:
        return null;
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
    case "invalid_link":
      return {
        variant: "error",
        title: "Link inválido",
        description: "Peça um novo email de confirmação e tente novamente.",
      };
    case "confirm_error":
      return {
        variant: "error",
        title:
          context === "confirm"
            ? "Erro ao confirmar email"
            : "Erro ao processar confirmação",
      };
    default:
      return {
        variant: "error",
        title: "Erro",
        description: result.message,
      };
  }
}

export function applySessaoToast(
  result: SessaoResult,
  context: Parameters<typeof sessaoToast>[1],
  notify: {
    success: (
      title: string,
      opts?: { description?: string; duration?: number },
    ) => void;
    error: (
      title: string,
      opts?: { description?: string; duration?: number },
    ) => void;
  },
): void {
  const payload = sessaoToast(result, context);
  if (!payload) return;
  const opts = {
    description: payload.description,
    duration: payload.duration,
  };
  if (payload.variant === "success") {
    notify.success(payload.title, opts);
  } else {
    notify.error(payload.title, opts);
  }
}
