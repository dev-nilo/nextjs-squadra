import { expect, test } from "@playwright/test";
import { DEV_USER, signIn } from "./support";

test("the Partidas page shows past Partidas with their Times, and each Jogador's Frequência", async ({ page }) => {
  await signIn(page, DEV_USER);
  await page.getByRole("link", { name: "Partidas" }).click();

  // Seeded: last week's Partida has published Times.
  const anteriores = page.getByRole("region", { name: "Anteriores" });
  const times = anteriores.getByRole("list", { name: "Times publicados" }).first();
  await expect(times.getByText("Time 1:")).toBeVisible();
  await expect(times).toContainText("Paredão");

  // Seeded pattern (see supabase/seed.sql): Paredão 4/4, Xerife 3/4, Foguete 2/4.
  const frequencia = page.getByRole("region", { name: "Frequência" });
  await expect(frequencia.getByRole("listitem", { name: "Paredão: 100%" })).toContainText("4/4");
  await expect(frequencia.getByRole("listitem", { name: "Xerife: 75%" })).toContainText("3/4");
  await expect(frequencia.getByRole("listitem", { name: "Foguete: 50%" })).toContainText("2/4");
});
