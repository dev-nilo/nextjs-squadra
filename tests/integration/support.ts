import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Integration tests run against the local Supabase (`npm run db:start`).
 * CI exports these from `supabase status`; locally, copy them from its output.
 */
function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Start Supabase with \`npm run db:start\` and export it from \`npx supabase status\`.`);
  }
  return value;
}

const url = () => env("SUPABASE_URL");
const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Bypasses RLS: only for arranging and cleaning up test data. */
export const admin = (): SupabaseClient => createClient(url(), env("SUPABASE_SERVICE_ROLE_KEY"), noSession);

export const anon = (): SupabaseClient => createClient(url(), env("SUPABASE_ANON_KEY"), noSession);

export type TestUser = { id: string; email: string; client: SupabaseClient };

const PASSWORD = "integration-test-123";

/** A fresh confirmed user per test, so tests never depend on each other or on the seed. */
export async function newUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID()}@squadra.test`;
  const { data, error } = await admin().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");

  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;

  return { id: data.user.id, email, client };
}

/** Deletes the users; their Membros and Jogadores go with them (on delete cascade). */
export async function removeUsers(...users: TestUser[]) {
  const service = admin();
  const ids = users.map((u) => u.id);
  await service.from("grupos").delete().in("criado_por", ids);
  for (const id of ids) await service.auth.admin.deleteUser(id);
}

/** A Jogador created by `owner` in `grupoId` (null to check that it's refused). */
export async function addJogador(
  owner: TestUser,
  grupoId: string | null,
  name: string,
  extra: Record<string, unknown> = {},
) {
  return owner.client
    .from("players")
    .insert({ user_id: owner.id, grupo_id: grupoId, name, position: "ALA", nationality: "BR", ...extra })
    .select("id, grupo_id")
    .single();
}

/** Arranges a Membro directly, since invites (#24) don't exist yet. */
export async function addMembro(grupoId: string, user: TestUser, papel: "admin" | "membro") {
  const { error } = await admin().from("grupo_membros").insert({ grupo_id: grupoId, user_id: user.id, papel });
  if (error) throw error;
}
