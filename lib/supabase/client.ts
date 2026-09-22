import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, readSupabaseEnv } from "@/lib/sessao";

export function createClient() {
  const env = readSupabaseEnv();
  if (!isSupabaseConfigured(env)) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local",
    );
  }

  return createBrowserClient(env.url!, env.key!);
}
