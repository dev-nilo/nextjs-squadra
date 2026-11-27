#!/usr/bin/env node
// Takes the screenshots the manifest shows in Chrome's install dialog
// (public/screenshots/), from a running app on the seeded local database:
//
//   npm run build && npm run start -- -p 3200   (with the local Supabase variables)
//   node scripts/capturas-do-manifest.mjs http://localhost:3200
//
// Light theme, the seed's "Fut do Dev". The sizes here must match app/manifest.ts.
// The dev account picks a Jogador first (once), so the Partida shows "Você vai?"
// as it does for a member. Run it on a seeded database you can reset.
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const SAIDA = new URL("../public/screenshots/", import.meta.url).pathname;

const CAPTURAS = [
  // Phones: the next Partida (what people open the app for), then the Elenco.
  {
    arquivo: "partida-celular.png",
    caminho: "/g/fut-do-dev",
    viewport: { width: 390, height: 844 },
    escala: 2,
    titulo: /./,
  },
  {
    arquivo: "elenco-celular.png",
    caminho: "/g/fut-do-dev/elenco",
    viewport: { width: 390, height: 844 },
    escala: 2,
    titulo: "Elenco",
  },
  // Desktop: the Elenco as an album.
  {
    arquivo: "elenco-tela-larga.png",
    caminho: "/g/fut-do-dev/elenco",
    viewport: { width: 1280, height: 800 },
    escala: 1,
    titulo: "Elenco",
  },
];

const browser = await chromium.launch();
for (const c of CAPTURAS) {
  const context = await browser.newContext({
    viewport: c.viewport,
    deviceScaleFactor: c.escala,
    colorScheme: "light",
    locale: "pt-BR",
  });
  const page = await context.newPage();
  await page.goto(base + "/");
  await page.getByPlaceholder("Email").fill("dev@squadra.test");
  await page.getByPlaceholder("Senha").fill("squadra-dev-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/g\//);
  if (c.caminho === "/g/fut-do-dev") {
    await page.getByText("Próxima partida").waitFor();
    // The card's link goes to Você, where the picker is.
    const escolher = page.getByRole("link", { name: "Escolher meu jogador" });
    if (await escolher.isVisible()) {
      await escolher.click();
      await page.getByRole("button", { name: "Escolher meu jogador" }).click();
      // Someone who hasn't answered yet, so the card asks "Você vai?".
      await page.getByRole("button", { name: "Sou Pivô" }).click();
      await page.getByRole("button", { name: "Escolher meu jogador" }).waitFor({ state: "detached" });
    }
  }
  await page.goto(base + c.caminho);
  await page.getByRole("heading", { name: c.titulo, level: 1 }).first().waitFor();
  await page.waitForLoadState("networkidle");
  // No toasts or focus rings in the picture.
  await page.mouse.click(1, 1);
  await page.screenshot({ path: SAIDA + c.arquivo });
  console.log(`${c.arquivo}: ${c.viewport.width * c.escala}x${c.viewport.height * c.escala}`);
  await context.close();
}
await browser.close();
