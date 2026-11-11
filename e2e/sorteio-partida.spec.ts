import { expect, test } from "@playwright/test";
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
const CONFIRMADOS = ["Paredão", "Xerife", "Foguete", "Maestro", "Matador", "Artilheiro"];

test.afterEach(async () => {
  await admin().from("partidas").delete().eq("grupo_id", FUT_DO_DEV).like("local", "E2E %");
});

test("the dono draws and publishes the Times; a membro sees them appear, read-only", async ({ page, browser }) => {
  const service = admin();
  const { data: partida } = await service
    .from("partidas")
    .insert({ grupo_id: FUT_DO_DEV, inicio: new Date(Date.now() + 3 * 86_400_000).toISOString(), local: "E2E Sorteio", vagas: 6 })
    .select("id")
    .single()
    .throwOnError();
  const { data: jogadores } = await service.from("players").select("id, name").eq("grupo_id", FUT_DO_DEV).in("name", [...CONFIRMADOS, "Bagre"]);
  const id = (n: string) => jogadores!.find((j) => j.name === n)!.id;
  await service
    .from("presencas")
    .insert(CONFIRMADOS.map((n, i) => ({ partida_id: partida!.id, jogador_id: id(n), situacao: "confirmado", pediu_vaga_em: new Date(Date.now() - (10 - i) * 1000).toISOString() })))
    .throwOnError();
  // Bagre waits: the Partida is full, and the lista de espera never plays.
  await service.from("presencas").insert({ partida_id: partida!.id, jogador_id: id("Bagre"), situacao: "espera", pediu_vaga_em: new Date().toISOString() }).throwOnError();

  const email = `membro-${randomUUID().slice(0, 8)}@squadra.test`;
  const { data: criado } = await service.auth.admin.createUser({ email, password: SEED_PASSWORD, email_confirm: true });
  await service.from("grupo_membros").insert({ grupo_id: FUT_DO_DEV, user_id: criado.user!.id, papel: "membro" }).throwOnError();

  const caminho = `/g/fut-do-dev/partidas/${partida!.id}`;
  try {
    const membro = await (await browser.newContext()).newPage();
    await signIn(membro, email);
    await membro.goto(caminho);
    await expect(membro.getByText("Ao vivo")).toBeVisible();
    await expect(membro.getByText("Os Times aparecem aqui quando quem organiza publicar o sorteio.")).toBeVisible();

    await signIn(page, DEV_USER);
    await page.goto(caminho);
    const sorteio = page.getByRole("region", { name: "Sorteio" });
    await sorteio.getByRole("button", { name: "Sortear Times" }).click();
    await expect(sorteio.getByText("Rascunho: só quem organiza vê")).toBeVisible();
    await expect(sorteio.getByRole("list", { name: /^Jogadores do Time/ })).toHaveCount(2);
    await expect(sorteio.getByText("Bagre")).toHaveCount(0);

    // The draft stays hidden from the membro.
    await expect(membro.getByRole("list", { name: /^Jogadores do Time/ })).toHaveCount(0);

    // Move Paredão to the other Time.
    const time1 = sorteio.getByRole("list", { name: "Jogadores do Time 1" });
    const destino = (await time1.getByText("Paredão").count()) ? "1" : "0";
    await sorteio.getByLabel("Mover Paredão").selectOption(destino);
    await expect(sorteio.getByRole("list", { name: `Jogadores do Time ${Number(destino) + 1}` }).getByText("Paredão")).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await sorteio.getByRole("button", { name: "Publicar Times" }).click();
    await expect(sorteio.getByText("Publicados")).toBeVisible();
    await expect(sorteio.getByLabel("Mover Paredão")).toHaveCount(0);

    // The membro sees the published Times without reloading, with no controls.
    const doMembro = membro.getByRole("region", { name: "Sorteio" });
    await expect(doMembro.getByRole("list", { name: /^Jogadores do Time/ })).toHaveCount(2);
    await expect(doMembro.getByRole("list", { name: `Jogadores do Time ${Number(destino) + 1}` }).getByText("Paredão")).toBeVisible();
    await expect(doMembro.getByRole("button", { name: /Sortear|Publicar/ })).toHaveCount(0);
  } finally {
    await service.auth.admin.deleteUser(criado.user!.id);
  }
});
