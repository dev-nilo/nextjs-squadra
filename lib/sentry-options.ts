/**
 * Shared Sentry init options for the browser, Node and edge runtimes.
 *
 * Previews run against the staging Supabase project, so they report as "staging".
 * No DSN (local dev, CI) leaves the SDK inert.
 */
export type SentryEnvironment = "production" | "staging" | "development";

export function sentryEnvironment(vercelEnv: string | undefined): SentryEnvironment {
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "staging";
  return "development";
}

export function sentryOptions(vercelEnv: string | undefined, dsn: string | undefined) {
  const environment = sentryEnvironment(vercelEnv);
  return {
    dsn,
    environment,
    // A tenth of production traffic is enough to spot slow routes on the free quota.
    tracesSampleRate: environment === "production" ? 0.1 : 1,
    // Errors only, no personal data: auth requests carry emails and passwords in
    // their bodies, and cookies/headers carry the Supabase session.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
    },
  };
}
