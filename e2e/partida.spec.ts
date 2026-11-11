import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { DEV_USER, SEED_PASSWORD, signIn } from "./support";

/** Bypasses RLS, only to arrange and clean up. CI exports both from `supabase status`. */
function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from `npx supabase status`).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const FUT_DO_DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secao = (page: Page, nome: string | RegExp) => page.getByRole("region", { name: nome });

/** A datetime-local value a few days ahead. */
function emDias(dias: number) {
  const d = new Date(Date.now() + dias * 86_400_000);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T20:00`;
}

test.afterEach(async () => {
  await admin().from("partidas").delete().eq("grupo_id", FUT_DO_DEV).like("local", "E2E %");
});

test("the dono creates a Partida, and a second browser sees presence change live", async ({ page, browser }) => {
  const local = `E2E Quadra ${Date.now()}`;
  await signIn(page, DEV_USER);
  await page.getByRole("link", { name: "Partidas" }).click();
  await expect(page.getByRole("heading", { name: "Partidas" })).toBeVisible();

  await page.getByRole("button", { name: "Nova Partida" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Dia e hora").fill(emDias(3));
  await form.getByLabel("Local").fill(local);
  await form.getByLabel("Vagas").fill("2");
  await form.getByRole("button", { name: "Criar Partida" }).click();
  await expect(page).toHaveURL(/\/g\/fut-do-dev\/partidas\/[0-9a-f-]{36}$/);
  await expect(page.getByText(local)).toBeVisible();

  // A second browser watching the same Partida.
  const outro = await (await browser.newContext()).newPage();
  await signIn(outro, DEV_USER);
  await outro.goto(page.url());
  await expect(outro.getByText("Ao vivo")).toBeVisible();
  await expect(secao(outro, /^Confirmados/).getByText("Ninguém confirmou ainda.")).toBeVisible();

  // The dono confirms two Jogadores: the other browser sees them, no reload.
  await page.getByRole("button", { name: "Marcar Paredão: vou" }).click();
  await expect(secao(outro, /^Confirmados/).getByText("Paredão")).toBeVisible();
  await page.getByRole("button", { name: "Marcar Xerife: vou" }).click();
  await expect(secao(outro, "Confirmados (2/2)").getByText("Xerife")).toBeVisible();

  // Full: the third goes to the lista de espera.
  await page.getByRole("button", { name: "Marcar Foguete: vou" }).click();
  await expect(secao(outro, "Lista de espera").getByText("Foguete")).toBeVisible();

  // Someone drops out: the first in line takes the vaga, live.
  await page.getByRole("button", { name: "Marcar Paredão: não vou" }).click();
  await expect(secao(outro, "Confirmados (2/2)").getByText("Foguete")).toBeVisible();
  await expect(secao(outro, "Não vão").getByText("Paredão")).toBeVisible();
  await expect(secao(outro, "Lista de espera")).toHaveCount(0);
});

test("a membro answers for their own Jogador only", async ({ page }) => {
  const service = admin();
  const email = `membro-${randomUUID().slice(0, 8)}@squadra.test`;
  const { data: criado } = await service.auth.admin.createUser({ email, password: SEED_PASSWORD, email_confirm: true });
  const userId = criado.user!.id;
  await service.from("grupo_membros").insert({ grupo_id: FUT_DO_DEV, user_id: userId, papel: "membro" }).throwOnError();
  await service.from("players").update({ conta_id: userId }).eq("grupo_id", FUT_DO_DEV).eq("name", "Canhota").throwOnError();
  const { data: partida } = await service
    .from("partidas")
    .insert({ grupo_id: FUT_DO_DEV, inicio: new Date(Date.now() + 3 * 86_400_000).toISOString(), local: "E2E Membro", vagas: 10 })
    .select("id")
    .single()
    .throwOnError();

  try {
    await signIn(page, email);
    await page.goto(`/g/fut-do-dev/partidas/${partida!.id}`);
    const minha = secao(page, "Sua presença");
    await expect(minha.getByText("você ainda não respondeu.")).toBeVisible();

    await minha.getByRole("button", { name: "Vou", exact: true }).click();
    await expect(minha.getByText("você vai.")).toBeVisible();
    await expect(secao(page, /^Confirmados/).getByText("Canhota")).toBeVisible();

    // No managing for a membro: no answering for others, no editing.
    await expect(page.getByRole("button", { name: /^Marcar / })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);

    await minha.getByRole("button", { name: "Não vou" }).click();
    await expect(minha.getByText("você não vai.")).toBeVisible();
  } finally {
    await service.from("players").update({ conta_id: null }).eq("grupo_id", FUT_DO_DEV).eq("name", "Canhota");
    await service.auth.admin.deleteUser(userId);
  }
});
