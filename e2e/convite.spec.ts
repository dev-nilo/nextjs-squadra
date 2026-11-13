import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { abrirAba, admin, card, DEV_USER, linkDeConfirmacao, SEED_PASSWORD, signIn } from "./support";

const FUT_DO_DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

async function gerarLink(page: Page): Promise<string> {
  await signIn(page, DEV_USER);
  await abrirAba(page, "Elenco");
  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("button", { name: "Convidar" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Gerar link novo" }).click();
  const campo = modal.getByRole("textbox", { name: /Link de convite/ }).first();
  await expect(campo).toHaveValue(/\/convite\/[0-9a-f]{32}$/);
  return (await campo.inputValue()).replace(/^https?:\/\/[^/]+/, "");
}

test.afterEach(async () => {
  await admin().from("convites").delete().eq("grupo_id", FUT_DO_DEV);
});

test("someone new signs up through an invite, confirms the email and joins as membro", async ({ page, browser }) => {
  const service = admin();
  const caminho = await gerarLink(page);
  const email = `convidado-${randomUUID().slice(0, 8)}@squadra.test`;

  const convidado = await (await browser.newContext()).newPage();
  try {
    await convidado.goto(caminho);
    await expect(convidado.getByRole("heading", { name: "Você foi chamado pro Fut do Dev" })).toBeVisible();
    await convidado.getByRole("button", { name: "Criar conta" }).click();
    await convidado.getByLabel("Email").fill(email);
    await convidado.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
    await convidado.getByLabel("Confirmar senha").fill(SEED_PASSWORD);
    await convidado.getByRole("button", { name: "Criar conta", exact: true }).last().click();

    // The email link carries the invite back (next=…/convite/<token>).
    const link = await linkDeConfirmacao(email);
    expect(decodeURIComponent(link)).toContain(caminho);
    await convidado.goto(link.replace(/^https?:\/\/[^/]+/, ""));
    await convidado.getByRole("button", { name: "Confirmar minha conta" }).click();

    await expect(convidado).toHaveURL(new RegExp(`${caminho}$`));
    await convidado.getByRole("button", { name: "Entrar no Fut do Dev" }).click();

    await expect(convidado).toHaveURL(/\/g\/fut-do-dev$/);
    await abrirAba(convidado, "Elenco");
    await expect(card(convidado, "Paredão")).toBeVisible();
    // A membro reads the Elenco but doesn't get the editing actions.
    await expect(convidado.getByRole("button", { name: "Nova carta" })).toHaveCount(0);
    await convidado.getByRole("button", { name: "Mais ações" }).click();
    await expect(convidado.getByRole("button", { name: "Sortear rápido" })).toBeVisible();
    await expect(convidado.getByRole("button", { name: "Convidar" })).toHaveCount(0);
    await convidado.keyboard.press("Escape");

    // Not in the Elenco yet: in Você they add themselves, already linked to their account.
    await abrirAba(convidado, "Você");
    await convidado.getByRole("button", { name: "Escolher meu jogador" }).click();
    const escolher = convidado.getByRole("dialog");
    await escolher.getByLabel("Seu nome", { exact: true }).fill("Convidado Novo");
    await escolher.getByLabel("Posição").selectOption("ATA");
    await escolher.getByRole("button", { name: "Criar meu jogador" }).click();
    await expect(convidado.getByRole("img", { name: /^Carta de Convidado Novo, ATA, rating 60, você$/ })).toBeVisible();
    await expect(convidado.getByRole("button", { name: "Escolher meu jogador" })).toHaveCount(0);

    const { data: conta } = await service.auth.admin.listUsers({ perPage: 1000 });
    const userId = conta.users.find((u) => u.email === email)!.id;
    const { data: membro } = await service.from("grupo_membros").select("papel").eq("grupo_id", FUT_DO_DEV).eq("user_id", userId);
    expect(membro).toEqual([{ papel: "membro" }]);
  } finally {
    await service.from("players").delete().eq("grupo_id", FUT_DO_DEV).eq("name", "Convidado Novo");
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    const conta = data.users.find((u) => u.email === email);
    if (conta) await service.auth.admin.deleteUser(conta.id);
  }
});

test("someone who opened an invite and signs in on / is sent back to it, not to the naming screen", async ({ page, browser }) => {
  const service = admin();
  const caminho = await gerarLink(page);
  const email = `voltou-${randomUUID().slice(0, 8)}@squadra.test`;
  const { data: criado } = await service.auth.admin.createUser({ email, password: SEED_PASSWORD, email_confirm: true });

  const visitante = await (await browser.newContext()).newPage();
  try {
    await visitante.goto(caminho);
    await expect(visitante.getByRole("heading", { name: "Você foi chamado pro Fut do Dev" })).toBeVisible();

    await signIn(visitante, email);
    await expect(visitante).toHaveURL(new RegExp(`${caminho}$`));
    await expect(visitante.getByRole("heading", { name: "Dê um nome pro seu fut" })).toHaveCount(0);

    // Opening the link again after joining doesn't duplicate the Membro.
    for (let vez = 0; vez < 2; vez++) {
      await visitante.goto(caminho);
      await visitante.getByRole("button", { name: "Entrar no Fut do Dev" }).click();
      await expect(visitante).toHaveURL(/\/g\/fut-do-dev$/);
    }
    const { data: membros } = await service.from("grupo_membros").select("papel").eq("grupo_id", FUT_DO_DEV).eq("user_id", criado.user!.id);
    expect(membros).toEqual([{ papel: "membro" }]);

    // "Sou esse aqui": in Você they claim a seeded Jogador nobody had claimed.
    await abrirAba(visitante, "Você");
    await visitante.getByRole("button", { name: "Escolher meu jogador" }).click();
    await visitante.getByRole("dialog").getByRole("button", { name: "Sou Paredão" }).click();
    await expect(visitante.getByRole("img", { name: /^Carta de Paredão,.*, você$/ })).toBeVisible();
    await visitante.reload();
    await expect(visitante.getByRole("img", { name: /^Carta de Paredão,.*, você$/ })).toBeVisible();

    // The dono unlinks it from the opened card: the Jogador stays, without an account.
    await page.reload();
    await card(page, "Paredão").click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Desvincular conta de Paredão" }).click();
    await expect(page.getByRole("button", { name: "Desvincular conta de Paredão" })).toHaveCount(0);
    const { data: paredao } = await service.from("players").select("conta_id").eq("grupo_id", FUT_DO_DEV).eq("name", "Paredão").single();
    expect(paredao?.conta_id).toBeNull();
  } finally {
    await service.from("players").update({ conta_id: null }).eq("grupo_id", FUT_DO_DEV).eq("name", "Paredão");
    await service.auth.admin.deleteUser(criado.user!.id);
  }
});

test("a cancelled, expired or unknown link says so", async ({ page }) => {
  const service = admin();
  // One insert each: a bulk insert with different keys sends null for the missing ones.
  const inserir = async (campos: Record<string, string>) => {
    const { data } = await service.from("convites").insert({ grupo_id: FUT_DO_DEV, ...campos }).select("token").single().throwOnError();
    return data!.token as string;
  };
  const revogado = await inserir({ revogado_em: new Date().toISOString() });
  const expirado = await inserir({ expira_em: new Date(Date.now() - 60_000).toISOString() });

  await page.goto(`/convite/${revogado}`);
  await expect(page.getByRole("heading", { name: "Esse convite foi cancelado" })).toBeVisible();
  await page.goto(`/convite/${expirado}`);
  await expect(page.getByRole("heading", { name: "Esse convite expirou" })).toBeVisible();
  await page.goto(`/convite/${"0".repeat(32)}`);
  await expect(page.getByRole("heading", { name: "Convite não encontrado" })).toBeVisible();
  await page.goto("/convite/qualquer-coisa");
  await expect(page.getByRole("heading", { name: "Convite não encontrado" })).toBeVisible();
});

test("the dono cancels a link and it stops working", async ({ page, browser }) => {
  const caminho = await gerarLink(page);
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar link" }).first().click();
  await expect(page.getByRole("dialog").getByText("Nenhum link ativo")).toBeVisible();

  const visitante = await (await browser.newContext()).newPage();
  await visitante.goto(caminho);
  await expect(visitante.getByRole("heading", { name: "Esse convite foi cancelado" })).toBeVisible();
});
