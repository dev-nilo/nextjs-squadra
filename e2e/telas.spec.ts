import { expect, test, type Page } from "@playwright/test";
import { abrirAba, DEV_USER, signIn } from "./support";

// The frame on every screen: run by the desktop, phone, phone-on-its-side and tablet projects.

async function caixa(page: Page, seletor: ReturnType<Page["locator"]>) {
  const box = await seletor.boundingBox();
  if (!box) throw new Error("not on screen");
  const tela = page.viewportSize()!;
  return { ...box, tela };
}

test("the header stays at the top while the Elenco scrolls", { tag: "@telas" }, async ({ page }) => {
  await signIn(page, DEV_USER);
  await abrirAba(page, "Elenco");
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

  const cabecalho = page.locator("header").first();
  await expect.poll(async () => (await cabecalho.boundingBox())?.y).toBe(0);
});

test("a card's ⋯ menu opens whole on the screen, next to its card", { tag: "@telas" }, async ({ page }) => {
  await signIn(page, DEV_USER);
  await abrirAba(page, "Elenco");

  // The first card is in the album's left column, where the menu used to open past the edge.
  const botao = page.getByRole("button", { name: /^Ações da carta de / }).first();
  await botao.click();
  const menu = page.locator("[popover]:popover-open");
  await expect(menu.getByRole("button", { name: "Editar" })).toBeVisible();

  const { x, y, width, height, tela } = await caixa(page, menu);
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(x + width).toBeLessThanOrEqual(tela.width);
  expect(y + height).toBeLessThanOrEqual(tela.height);

  const b = (await botao.boundingBox())!;
  expect(Math.abs(x + width - (b.x + b.width))).toBeLessThan(Math.max(width, 24));
});

test("a form in a modal keeps its buttons reachable on a short screen", { tag: "@telas" }, async ({ page }) => {
  await signIn(page, DEV_USER);
  // The tab opens the next Partida; "Nova partida" is on the list of them all.
  await page.goto("/g/fut-do-dev/partidas");
  await page.getByRole("button", { name: "Nova partida" }).click();

  const modal = page.getByRole("dialog");
  const criar = modal.getByRole("button", { name: "Criar partida" });
  await expect(criar).toBeInViewport({ ratio: 1 });
  await expect(modal.getByRole("button", { name: "Voltar" })).toBeInViewport({ ratio: 1 });

  // The body scrolls inside the modal, under a header and footer that stay put.
  await modal.getByLabel("Vagas").scrollIntoViewIfNeeded();
  await expect(modal.getByLabel("Vagas")).toBeInViewport();
  await expect(criar).toBeInViewport({ ratio: 1 });
});

test("fields are at least 16px under a finger, so iOS doesn't zoom in", { tag: "@telas" }, async ({ page, isMobile }) => {
  test.skip(!isMobile, "a mouse gets the 14px fields");
  await signIn(page, DEV_USER);
  await abrirAba(page, "Elenco");
  const busca = page.getByPlaceholder(/Buscar jogador/);
  expect(await busca.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
});
