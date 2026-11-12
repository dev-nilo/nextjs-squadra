import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_CONTA_ID, DEMO_EMAIL, DEMO_GRUPO_ID } from "@/lib/demo";

/**
 * Creates the demo account where it doesn't exist yet (production, the first
 * time). Locally and on staging the seed already has it. No password: see
 * `entrarComoDemo`.
 */
async function garantirConta(admin: SupabaseClient) {
  const { data } = await admin.auth.admin.getUserById(DEMO_CONTA_ID);
  if (data?.user) return;

  const { error } = await admin.auth.admin.createUser({
    id: DEMO_CONTA_ID,
    email: DEMO_EMAIL,
    email_confirm: true,
    app_metadata: { demo: true },
  });
  // Two first visitors at once: the other request created it.
  if (error && !(await admin.auth.admin.getUserById(DEMO_CONTA_ID)).data?.user) throw error;
}

/** Puts the demo Grupo back to its known state (the nightly cron). */
export async function resetarDemo(admin: SupabaseClient) {
  await garantirConta(admin);
  const { error } = await admin.rpc("resetar_demo");
  if (error) throw error;
}

/** Ready to sign into: the account exists and its Grupo was set up at least once. */
export async function garantirDemo(admin: SupabaseClient) {
  await garantirConta(admin);
  const { count, error } = await admin
    .from("grupo_membros")
    .select("user_id", { count: "exact", head: true })
    .eq("grupo_id", DEMO_GRUPO_ID)
    .eq("user_id", DEMO_CONTA_ID);
  if (error) throw error;
  if (!count) await resetarDemo(admin);
}
