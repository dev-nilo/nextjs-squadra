import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses RLS. Only for the demo (creating its account,
 * signing it in, the nightly reset). Never reaches the browser: the key has no
 * NEXT_PUBLIC_ prefix and this module is server-only.
 *
 * Null when the key isn't configured, so the rest of the app keeps working.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
