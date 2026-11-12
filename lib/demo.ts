/**
 * The demo (ADR 0005): one shared account, dono of its own Grupo, put back
 * every night. The ids match supabase/migrations/20261113000000_demo.sql.
 * Safe to import anywhere; the server-only parts live in lib/demo-server.ts.
 */
export const DEMO_CONTA_ID = "dede0000-0000-4000-8000-000000000001";
export const DEMO_GRUPO_ID = "dede0000-0000-4000-8000-000000000002";
export const DEMO_GRUPO_SLUG = "demo";
export const DEMO_EMAIL = "demo@example.com";

export function ehContaDemo(user: { id: string } | null | undefined): boolean {
  return user?.id === DEMO_CONTA_ID;
}

/** What the database says (HINT "demo") when the demo tries to leave its Grupo or let someone in. */
export const RECUSA_DA_DEMO = "Na conta demo dá pra mexer em tudo no fut da demo, mas não criar outro fut, convidar ou entrar em outro.";
