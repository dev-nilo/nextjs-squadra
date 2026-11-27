import type { EmailOtpType, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos-do-banco";

export type SupabaseEnv = {
  url?: string | null;
  key?: string | null;
};

export type SessaoAuth = {
  signInWithPassword: (creds: { email: string; password: string }) => Promise<{ error: { message: string } | null }>;
  signUp: (args: { email: string; password: string; options?: { emailRedirectTo?: string } }) => Promise<{
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
  exchangeCodeForSession: (code: string) => Promise<{ error: { message: string } | null }>;
  verifyOtp: (args: { token_hash: string; type: EmailOtpType }) => Promise<{ error: { message: string } | null }>;
  updateUser: (attrs: { password: string }) => Promise<{ error: { message: string } | null }>;
  resetPasswordForEmail: (
    email: string,
    options?: { redirectTo?: string },
  ) => Promise<{ error: { message: string } | null }>;
  getClaims: () => Promise<{
    data: { claims: { amr?: unknown } } | null;
    error: { message: string } | null;
  }>;
  onAuthStateChange: (callback: (event: string, session: { user: User | null } | null) => void) => {
    data: { subscription: { unsubscribe: () => void } };
  };
};

/** Every outcome a Sessão flow can end in. sessaoToast has a case for each, checked by the compiler. */
export type CodigoOk =
  | "logged_in"
  | "signed_up"
  | "confirmed"
  | "resent"
  | "logged_out"
  | "password_changed"
  | "recovery_sent"
  | "recovery_verified"
  | "password_set";
export type CodigoErro =
  | "not_configured"
  | "recovery_required"
  | "recovery_failed"
  | "recovery_error"
  | "password_set_failed"
  | "password_set_error"
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

export function toSessaoAuth(client: SupabaseClient<Database>): SessaoAuth {
  return client.auth;
}

export function decodeAuthDescription(description: string | null | undefined): string {
  if (!description) return "Não foi possível confirmar o email.";
  return decodeURIComponent(description.replace(/\+/g, " "));
}

export function isEmailUnconfirmedError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("email not confirmed") || lower.includes("not confirmed");
}

export function classifyAuthUrlError(input: { errorCode: string | null; errorDescription: string | null }): {
  kind: "expired_link" | "auth_error";
  message: string;
} {
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
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
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
// Password recovery. "Esqueci minha senha" sends a link; tapping it on
// /auth/confirm signs the person in (the policy below), and NOVA_SENHA sets
// the new password.
// ---------------------------------------------------------------------------

/** Where a tapped recovery link always ends: the page that sets the new password. */
export const NOVA_SENHA = "/auth/nova-senha";

/**
 * Where Supabase's default recovery email sends people back to, in case a
 * project still has it instead of supabase/templates/recovery.html. It comes
 * back with a PKCE `code`, which only works in the browser that asked.
 */
export const RETORNO_DA_RECUPERACAO = `/auth/callback?next=${NOVA_SENHA}`;

/**
 * Sends a password recovery link to `email`. The notice never says whether
 * the email has an account.
 */
export async function pedirNovaSenha(
  auth: SessaoAuth,
  email: string,
  redirectTo: string,
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
    const { error } = await auth.resetPasswordForEmail(target, { redirectTo });
    if (error) {
      return { ok: false, code: "recovery_failed", message: error.message };
    }
    return { ok: true, code: "recovery_sent" };
  } catch {
    return { ok: false, code: "recovery_error" };
  }
}

/** How long after tapping an email link the new password can still be set without the current one. */
const JANELA_DO_LINK_S = 15 * 60;

/**
 * Whether the session was opened by an email link moments ago: its latest
 * authentication method (the JWT's `amr`) is the recovery or the one-time
 * token, less than JANELA_DO_LINK_S ago. A session that signed in with a
 * password, as on someone's unlocked phone, isn't one: it keeps the Você
 * screen, which asks for the current password.
 */
export function veioDeUmLink(amr: unknown, agoraEmSegundos: number): boolean {
  if (!Array.isArray(amr)) return false;
  const entradas = amr.filter(
    (e): e is { method: string; timestamp: number } =>
      typeof e === "object" && e !== null && typeof e.method === "string" && typeof e.timestamp === "number",
  );
  if (entradas.length === 0) return false;
  const ultima = entradas.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
  return (
    (ultima.method === "recovery" || ultima.method === "otp") && agoraEmSegundos - ultima.timestamp <= JANELA_DO_LINK_S
  );
}

/**
 * Sets a new password without the current one, only for a session the
 * recovery link opened moments ago (veioDeUmLink): tapping it is the proof.
 * Anything else is refused with recovery_required, and changePassword in Você
 * stays the way to change a known password. This guards the screens: the Auth
 * API itself lets a session change its password unless Supabase's "secure
 * password change" is on.
 */
export async function definirNovaSenha(
  auth: SessaoAuth,
  input: { newPassword: string; confirmPassword: string },
  env: SupabaseEnv = readSupabaseEnv(),
  agora: number = Date.now(),
): Promise<SessaoResult> {
  if (!isSupabaseConfigured(env)) {
    return { ok: false, code: "not_configured" };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, code: "password_mismatch" };
  }
  if (input.newPassword.length < 6) {
    return { ok: false, code: "password_too_short" };
  }

  try {
    const { data, error: claimsError } = await auth.getClaims();
    if (claimsError || !data) {
      return { ok: false, code: "no_session" };
    }
    if (!veioDeUmLink(data.claims.amr, Math.floor(agora / 1000))) {
      return { ok: false, code: "recovery_required" };
    }
    const { error } = await auth.updateUser({ password: input.newPassword });
    if (error) {
      return { ok: false, code: "password_set_failed", message: error.message };
    }
    return { ok: true, code: "password_set" };
  } catch {
    return { ok: false, code: "password_set_error" };
  }
}

// ---------------------------------------------------------------------------
// Email confirmation. One policy decides where the user lands and what the
// screen says, for both entry points (/auth/confirm, where the user taps
// Confirmar or Continuar, and /auth/callback, kept for links already in
// inboxes and for a PKCE `code`), and for both kinds of link (signing up and
// recovering a password). The pages only show the notice and navigate.
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
    // "/.//evil.com" parses on this origin but keeps a pathname of
    // "//evil.com", which a router reads as another site.
    if (url.pathname.startsWith("//")) return "/";
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

/**
 * A password recovery link: ours carries type=recovery
 * (supabase/templates/recovery.html); Supabase's default email comes back
 * through RETORNO_DA_RECUPERACAO, with next = NOVA_SENHA.
 */
export function ehRecuperacao(url: URL): boolean {
  return (
    url.searchParams.get("type") === "recovery" ||
    caminhoSeguro(url.searchParams.get("next"), url.origin) === NOVA_SENHA
  );
}

async function confirmar(auth: SessaoAuth, url: URL, recuperacao: boolean): Promise<SessaoResult> {
  const erro = erroDaUrl(url);
  if (erro) return erro;
  const confirmado = recuperacao ? "recovery_verified" : "confirmed";
  try {
    const code = url.searchParams.get("code");
    if (code) {
      const { error } = await auth.exchangeCodeForSession(code);
      if (error) {
        // The browser client exchanges a `code` in the URL on its own when it
        // loads (detectSessionInUrl), so ours can fail on a used verifier
        // even though it worked. A session means it did.
        const { data } = await auth.getSession();
        if (!data.session) return { ok: false, code: "pkce_failed", message: error.message };
      }
      return { ok: true, code: confirmado, via: "pkce" };
    }

    const tokenHash = url.searchParams.get("token_hash");
    if (tokenHash) {
      const type = (url.searchParams.get("type") || "signup") as EmailOtpType;
      const { error } = await auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) return { ok: false, code: "otp_failed", message: error.message };
      return { ok: true, code: confirmado, via: "otp" };
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
 * Finishes an email link from its URL: where to go and what to say.
 * Confirmed → the `next` the email carried (an invite, or `/`), with one
 * notice; a recovery link → NOVA_SENHA, whatever `next` says, so nobody is
 * signed in by it without setting the new password. Anything else → the
 * sign-in screen, saying what went wrong.
 */
export async function concluirConfirmacao(auth: SessaoAuth, url: URL): Promise<{ destino: string; aviso: Aviso }> {
  const recuperacao = ehRecuperacao(url);
  const contexto = recuperacao ? "recovery" : "confirm";
  const resultado = await confirmar(auth, url, recuperacao);
  if (!resultado.ok) {
    // Nothing to confirm and no session: just the sign-in screen, no notice.
    return { destino: "/auth", aviso: resultado.code === "no_session" ? null : sessaoToast(resultado, contexto) };
  }
  const destino = recuperacao ? NOVA_SENHA : caminhoSeguro(url.searchParams.get("next"), url.origin);
  return { destino, aviso: sessaoToast(resultado, contexto) };
}

/** When the request never got an answer: the phone's signal, not the person. */
const SEM_RESPOSTA = "Confira a conexão e tente de novo.";

/**
 * What Supabase's (English) error message means for the person, in their
 * words, saying what to do. Never shows the English: an unknown message gets
 * a plain "try again".
 */
export function explicarErro(mensagem: string | null | undefined): string {
  const m = (mensagem ?? "").toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Email ou senha errados. Confira os dois, ou use Esqueci minha senha.";
  if (m.includes("not confirmed")) return "Falta confirmar o email: abra o link que enviamos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Esse email já tem conta. Entre com ele, ou use Esqueci minha senha.";
  if (m.includes("different from the old")) return "A senha nova precisa ser diferente da atual.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("easy to guess"))
    return "Essa senha é fácil de adivinhar. Escolha outra.";
  if (m.includes("password should be") || m.includes("at least 6"))
    return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("for security purposes") || m.includes("too many")) {
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  }
  if (m.includes("expired") || m.includes("link is invalid") || m.includes("token"))
    return "O link venceu ou já foi usado. Peça outro.";
  if (m.includes("invalid format") || m.includes("validate email") || m.includes("invalid email")) {
    return "Esse email não parece certo. Confira se digitou direito.";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "Contas novas estão fechadas no momento.";
  if (m.includes("session missing") || m.includes("session not found")) return "Sua sessão acabou. Entre de novo.";
  if (m.includes("fetch") || m.includes("network")) return SEM_RESPOSTA;
  return "Tente de novo em instantes.";
}

/** Toast/copy mapping for adapters — single policy for shared codes. */
export function sessaoToast(
  result: SessaoResult,
  context: "login" | "signup" | "resend" | "confirm" | "watcher" | "password" | "recovery" = "login",
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
          title: "Conta criada. Confirme pelo email.",
          description: "Abra o link que enviamos e toque em Confirmar minha conta.",
          duration: 8000,
        };
      case "confirmed":
        return { variant: "success", title: "Email confirmado. Você entrou." };
      case "resent":
        return { variant: "success", title: "Email reenviado.", description: "Só o link mais recente vale." };
      case "logged_out":
        return { variant: "success", title: "Você saiu." };
      case "password_changed":
        return { variant: "success", title: "Senha trocada.", description: "Da próxima vez, entre com a nova." };
      case "recovery_sent":
        return {
          variant: "success",
          title: "Link enviado.",
          description:
            "Se esse email tiver conta no Squadra, chega um link pra criar uma senha nova. Só o mais recente vale.",
          duration: 8000,
        };
      case "recovery_verified":
        return { variant: "success", title: "Agora é só criar a senha nova." };
      case "password_set":
        return { variant: "success", title: "Senha nova salva. Você entrou." };
      default:
        return semCaso(result);
    }
  }

  // A recovery link that no longer works: the way out is a new one.
  const linkDeRecuperacaoVencido = {
    variant: "error" as const,
    title: "Esse link não vale mais.",
    description: "Peça outro em Esqueci minha senha. Só o mais recente funciona.",
    duration: 8000,
  };
  const naoConfirmou = (description: string) => ({
    variant: "error" as const,
    title: "Não deu pra confirmar o email.",
    description,
  });

  switch (result.code) {
    case "recovery_failed":
      return { variant: "error", title: "Não deu pra enviar o link.", description: explicarErro(result.message) };
    case "recovery_error":
      return { variant: "error", title: "Não deu pra enviar o link.", description: SEM_RESPOSTA };
    case "password_set_failed":
      return { variant: "error", title: "Não deu pra salvar a senha.", description: explicarErro(result.message) };
    case "password_set_error":
      return { variant: "error", title: "Não deu pra salvar a senha.", description: SEM_RESPOSTA };
    case "recovery_required":
      return {
        variant: "error",
        title: "Abra o link de recuperação.",
        description: "Sem a senha atual, só pelo link de Esqueci minha senha. Sabendo a atual, troque em Você.",
        duration: 8000,
      };
    case "not_configured":
      // Only a developer without .env.local sees this.
      return {
        variant: "error",
        title: "Configuração ausente",
        description: "Supabase não está configurado. Adicione as variáveis de ambiente.",
      };
    case "email_unconfirmed":
      return {
        variant: "error",
        title: "Falta confirmar o email.",
        description: "Abra o link que enviamos, ou peça outro em Reenviar email de confirmação.",
      };
    case "login_failed":
      if ((result.message ?? "").toLowerCase().includes("invalid login credentials")) {
        return {
          variant: "error",
          title: "Email ou senha errados.",
          description: "Confira os dois, ou use Esqueci minha senha.",
        };
      }
      return { variant: "error", title: "Não deu pra entrar.", description: explicarErro(result.message) };
    case "login_error":
      return { variant: "error", title: "Não deu pra entrar.", description: SEM_RESPOSTA };
    case "password_mismatch":
      return { variant: "error", title: "As senhas não batem.", description: "Digite a mesma senha nos dois campos." };
    case "password_too_short":
      return { variant: "error", title: "Senha curta demais.", description: "Use pelo menos 6 caracteres." };
    case "password_unchanged":
      return { variant: "error", title: "Essa já é a sua senha.", description: "Escolha uma diferente." };
    case "wrong_current_password":
      return { variant: "error", title: "A senha atual não confere.", description: "Confira e tente de novo." };
    case "password_change_failed":
      return { variant: "error", title: "Não deu pra trocar a senha.", description: explicarErro(result.message) };
    case "password_change_error":
      return { variant: "error", title: "Não deu pra trocar a senha.", description: SEM_RESPOSTA };
    case "signup_failed":
      return { variant: "error", title: "Não deu pra criar a conta.", description: explicarErro(result.message) };
    case "email_taken":
      return {
        variant: "error",
        title: "Esse email já tem conta.",
        description: "Entre com ele, ou use Esqueci minha senha.",
      };
    case "signup_error":
      return { variant: "error", title: "Não deu pra criar a conta.", description: SEM_RESPOSTA };
    case "email_required":
      return {
        variant: "error",
        title: context === "recovery" ? "Escreva o seu email." : "Escreva o email pra reenviar a confirmação.",
      };
    case "resend_failed":
      return { variant: "error", title: "Não deu pra reenviar.", description: explicarErro(result.message) };
    case "resend_error":
      return { variant: "error", title: "Não deu pra reenviar.", description: SEM_RESPOSTA };
    case "expired_link":
      if (context === "recovery") return linkDeRecuperacaoVencido;
      // The one place that explains it: a mail scanner opened the link first.
      return {
        variant: "error",
        title: "Esse link não vale mais.",
        description:
          "Programas de email às vezes abrem o link antes de você. Peça outro em Reenviar email de confirmação e abra o mais recente.",
        duration: 9000,
      };
    case "confirm_url_error":
      return { ...naoConfirmou(explicarErro(result.message)), duration: context === "watcher" ? 9000 : undefined };
    case "pkce_failed":
      if (context === "recovery") {
        // Supabase's default email: the code only works in the browser that asked for the link.
        return {
          ...linkDeRecuperacaoVencido,
          description: "Abra o link no mesmo navegador em que pediu, ou peça outro em Esqueci minha senha.",
        };
      }
      return naoConfirmou("Abra o link no mesmo navegador em que criou a conta, ou peça outro.");
    case "otp_failed":
      if (context === "recovery") return linkDeRecuperacaoVencido;
      return naoConfirmou(explicarErro(result.message));
    case "confirm_error":
      return naoConfirmou(SEM_RESPOSTA);
    case "logout_failed":
    case "logout_error":
      return { variant: "error", title: "Não deu pra sair agora.", description: SEM_RESPOSTA };
    case "no_session":
      return { variant: "error", title: "Entre de novo.", description: "Sua sessão não foi encontrada." };
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

export function applySessaoToast(
  result: SessaoResult,
  context: Parameters<typeof sessaoToast>[1],
  notify: Notificador,
): void {
  mostrarAviso(sessaoToast(result, context), notify);
}
