import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { abrirAba, admin, DEV_USER, SEED_PASSWORD, signIn } from "./support";

const FUT_DO_DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/** A confirmed account nobody else uses, cleaned up by `apagar`. */
async function conta(label: string) {
  const email = `${label}-${randomUUID().slice(0, 8)}@squadra.test`;
  const { data } = await admin().auth.admin.createUser({ email, password: SEED_PASSWORD, email_confirm: true });
  return { id: data.user!.id, email };
}
const apagar = async (...ids: string[]) => {
  for (const id of ids) await admin().auth.admin.deleteUser(id);
};

/** A fut of its own, so handing it over or deleting it touches no other test. */
async function futProprio(dono: string, outros: [string, "admin" | "membro"][] = []) {
  const nome = `Fut E2E ${randomUUID().slice(0, 6)}`;
  const { data: grupo } = await admin()
    .from("grupos")
    .insert({ slug: nome.toLowerCase().replace(/\s+/g, "-"), nome, criado_por: dono })
    .select("id, slug")
    .single()
    .throwOnError();
  await admin()
    .from("grupo_membros")
    .insert([{ grupo_id: grupo!.id, user_id: dono, papel: "dono" }, ...outros.map(([user_id, papel]) => ({ grupo_id: grupo!.id, user_id, papel }))])
    .throwOnError();
  return { id: grupo!.id as string, slug: grupo!.slug as string, nome };
}

async function abrirPessoas(page: Page) {
  await abrirAba(page, "Você");
  await page.getByRole("link", { name: /^Pessoas/ }).click();
  await expect(page.getByRole("heading", { name: /^Pessoas/, level: 1 })).toBeVisible();
}

test("the dono makes someone admin and removes them, from Pessoas", { tag: "@mobile" }, async ({ page }) => {
  const amigo = await conta("amigo");
  await admin().from("grupo_membros").insert({ grupo_id: FUT_DO_DEV, user_id: amigo.id, papel: "membro" }).throwOnError();
  try {
    await signIn(page, DEV_USER);
    await page.goto("/g/fut-do-dev");
    await abrirPessoas(page);

    // With no Jogador, the dono knows them by email.
    await page.getByRole("region", { name: "Membros" }).getByRole("button", { name: `${amigo.email}, membro` }).click();
    const folha = page.getByRole("dialog");
    await folha.getByRole("radio", { name: /^Admin/ }).click();
    await expect(page.getByRole("region", { name: "Quem organiza" }).getByText(amigo.email)).toBeVisible();
    await expect(folha.getByRole("radio", { name: /^Admin/ })).toHaveAttribute("aria-checked", "true");

    page.once("dialog", (d) => d.accept());
    await folha.getByRole("button", { name: "Remover do fut" }).click();
    await expect(page.getByRole("region", { name: "Quem organiza" }).getByText(amigo.email)).toHaveCount(0);
    const { data } = await admin().from("grupo_membros").select("user_id").eq("grupo_id", FUT_DO_DEV).eq("user_id", amigo.id);
    expect(data).toEqual([]);
  } finally {
    await apagar(amigo.id);
  }
});

test("a membro sees who's in, can't manage anyone, and leaves from Você", { tag: "@mobile" }, async ({ page }) => {
  const membro = await conta("membro");
  await admin().from("grupo_membros").insert({ grupo_id: FUT_DO_DEV, user_id: membro.id, papel: "membro" }).throwOnError();
  try {
    await signIn(page, membro.email);
    await page.goto("/g/fut-do-dev/voce");
    await expect(page.getByText("Você é membro do Fut do Dev")).toBeVisible();

    await page.getByRole("link", { name: /^Pessoas/ }).click();
    await expect(page.getByRole("region", { name: "Quem organiza" })).toBeVisible();
    // Read-only: nobody to tap, no Convites, nothing about the fut itself, no emails.
    await expect(page.getByRole("region", { name: "Membros" }).getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Convites" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "O fut" })).toHaveCount(0);
    await expect(page.getByText(DEV_USER)).toHaveCount(0);

    await page.getByRole("link", { name: "Você" }).first().click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Sair do fut" }).click();
    // No other fut: the first-access screen.
    await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toBeVisible();
    const { data } = await admin().from("grupo_membros").select("user_id").eq("grupo_id", FUT_DO_DEV).eq("user_id", membro.id);
    expect(data).toEqual([]);
  } finally {
    await apagar(membro.id);
  }
});

test("the dono hands the fut to an admin and becomes an admin", async ({ page }) => {
  const dono = await conta("dono");
  const outro = await conta("outro");
  const fut = await futProprio(dono.id, [[outro.id, "admin"]]);
  try {
    await signIn(page, dono.email);
    await page.goto(`/g/${fut.slug}/voce`);
    await expect(page.getByText("Pra sair do fut, passe ele pra um admin em Pessoas.")).toBeVisible();
    await page.getByRole("link", { name: /^Pessoas/ }).click();

    await page.getByRole("button", { name: `${outro.email}, admin` }).click();
    await page.getByRole("dialog").getByRole("button", { name: `Passar o fut pra ${outro.email}` }).click();
    // The confirmation opens over the sheet.
    const confirmar = page.getByRole("dialog").last();
    const passar = confirmar.getByRole("button", { name: "Passar o fut" });
    await expect(passar).toBeDisabled();
    await confirmar.getByLabel(`Digite "${fut.nome}" pra confirmar`).fill(fut.nome.toUpperCase());
    await passar.click();

    // Now an admin: no more power over people or the fut.
    await expect(page.getByRole("region", { name: "O fut" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: `${outro.email}, dono` })).toHaveCount(0);
    const { data } = await admin().from("grupo_membros").select("user_id, papel").eq("grupo_id", fut.id).order("papel");
    expect(data).toEqual(
      expect.arrayContaining([
        { user_id: outro.id, papel: "dono" },
        { user_id: dono.id, papel: "admin" },
      ]),
    );
  } finally {
    await admin().from("grupos").delete().eq("id", fut.id);
    await apagar(dono.id, outro.id);
  }
});

test("the dono renames the fut and deletes it, typing its name", async ({ page }) => {
  const dono = await conta("dono");
  const fut = await futProprio(dono.id);
  try {
    await signIn(page, dono.email);
    await page.goto(`/g/${fut.slug}/pessoas`);
    const oFut = page.getByRole("region", { name: "O fut" });

    const novo = `${fut.nome} Renomeado`;
    await oFut.getByLabel("Nome do fut").fill(novo);
    await oFut.getByRole("button", { name: "Salvar" }).click();
    // The header's fut switcher follows, and the address stays.
    await expect(page.getByRole("banner").getByText(novo)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/g/${fut.slug}/pessoas$`));

    await oFut.getByRole("button", { name: "Excluir o fut" }).click();
    const confirmar = page.getByRole("dialog").last();
    await confirmar.getByLabel(`Digite "${novo}" pra confirmar`).fill(novo);
    await confirmar.getByRole("button", { name: "Excluir o fut" }).click();

    await expect(page.getByRole("heading", { name: "Dê um nome pro seu fut" })).toBeVisible();
    const { data } = await admin().from("grupos").select("id").eq("id", fut.id);
    expect(data).toEqual([]);
  } finally {
    await admin().from("grupos").delete().eq("id", fut.id);
    await apagar(dono.id);
  }
});
