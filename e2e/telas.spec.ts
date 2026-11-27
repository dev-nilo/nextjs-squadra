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

test(
  "fields are at least 16px under a finger, so iOS doesn't zoom in",
  { tag: "@telas" },
  async ({ page, isMobile }) => {
    test.skip(!isMobile, "a mouse gets the 14px fields");
    await signIn(page, DEV_USER);
    await abrirAba(page, "Elenco");
    const busca = page.getByPlaceholder(/Buscar jogador/);
    expect(await busca.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  },
);

test("on a fut's pages the phone's status bar takes the header's color", { tag: "@telas" }, async ({ page }) => {
  await signIn(page, DEV_USER);
  await abrirAba(page, "Elenco");
  const tema = (esquema: string) =>
    page.locator(`meta[name="theme-color"][media="(prefers-color-scheme: ${esquema})"]`);
  await expect(tema("light")).toHaveAttribute("content", "#FFFFFF");
  await expect(tema("dark")).toHaveAttribute("content", "#1B2A4C");
  // The same color the header is painted with (content1 at 95%, over the canvas).
  const fundo = await page
    .locator("header")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fundo).toMatch(/^rgba?\(255, 255, 255/);
});

test("on a phone a modal is a sheet at the bottom, from edge to edge", { tag: "@telas" }, async ({ page }) => {
  const tela = page.viewportSize()!;
  test.skip(tela.width >= 640, "from sm up it's a card in the middle");
  await signIn(page, DEV_USER);
  await page.goto("/g/fut-do-dev/partidas");
  await page.getByRole("button", { name: "Nova partida" }).click();
  const caixa = page.locator("dialog[open] > form");
  await expect(caixa).toBeVisible();
  // Once it has slid up.
  await expect
    .poll(async () => Math.round((await caixa.boundingBox())!.y + (await caixa.boundingBox())!.height))
    .toBe(tela.height);
  const { x, width } = (await caixa.boundingBox())!;
  expect(x).toBe(0);
  expect(width).toBe(tela.width);
});

test.describe("the narrowest phones (280px)", () => {
  test.use({ viewport: { width: 280, height: 653 }, hasTouch: true, isMobile: true });

  test("the album shows each card's face, and a tap turns it to the attributes", async ({ page }) => {
    await signIn(page, DEV_USER);
    await abrirAba(page, "Elenco");
    // At 125px a card's attribute table would print at 7px: the face only, turning on a tap.
    const carta = page.getByRole("button", { name: /^Carta de Foguete, .*Toque para ver as notas$/ });
    await expect(carta).toHaveAttribute("aria-expanded", "false");
    await carta.click();
    await expect(carta).toHaveAttribute("aria-expanded", "true");
    const notas = carta.getByLabel("Atributos do jogador").last();
    await expect(notas).toBeVisible();
    const tamanho = await notas
      .locator("dd")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(tamanho).toBeGreaterThanOrEqual(11);
  });

  test("nothing runs past the screen's edge on any of the fut's pages", async ({ page }) => {
    await signIn(page, DEV_USER);
    for (const caminho of [
      "/g/fut-do-dev",
      "/g/fut-do-dev/partidas",
      "/g/fut-do-dev/elenco",
      "/g/fut-do-dev/voce",
      "/g/fut-do-dev/pessoas",
    ]) {
      await page.goto(caminho);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      // html clips horizontal overflow, so look for any element past the edge instead.
      const fora = await page.evaluate(() => {
        const largura = document.documentElement.clientWidth;
        return [...document.querySelectorAll("main *, header *, nav *")]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && (b.right > largura + 1 || b.left < -1);
          })
          .map((el) => `${el.tagName} "${(el.textContent ?? "").trim().slice(0, 30)}"`);
      });
      expect(fora, caminho).toEqual([]);
    }
  });
});

test.describe("a tablet standing up (820px)", () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });

  test("the Partida puts the Times beside the list", async ({ page }) => {
    await signIn(page, DEV_USER);
    await page.goto("/g/fut-do-dev");
    const lista = page.getByRole("region", { name: "Quem vai" });
    const times = page.getByRole("region", { name: "Sorteio" });
    await expect(times).toBeVisible();
    const a = (await lista.boundingBox())!;
    const b = (await times.boundingBox())!;
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
  });
});

test(
  "on a phone lying down the frame shrinks: a 48px header and a tab bar of icons",
  { tag: "@telas" },
  async ({ page }) => {
    const tela = page.viewportSize()!;
    test.skip(tela.height > 500, "only on a short screen");
    await signIn(page, DEV_USER);
    await abrirAba(page, "Elenco");
    expect((await page.locator("header > div").first().boundingBox())!.height).toBe(48);
    // The tab names stay for screen readers.
    await expect(
      page.getByRole("navigation", { name: "Seções do fut" }).getByRole("link", { name: "Elenco", exact: true }),
    ).toHaveCount(1);
  },
);
