import { expect, test } from "@playwright/test";
import { DEV_USER, signIn } from "./support";

test("the Sorteio puts every selected Jogador in exactly one Time", async ({ page }) => {
  await signIn(page, DEV_USER);

  await page.getByRole("button", { name: /^Selecionar( todas)?$/ }).click();
  const drawButton = page.getByRole("button", { name: /^Sortear times \(\d+\)$/ });
  const selected = Number((await drawButton.textContent())?.match(/\((\d+)\)/)?.[1]);
  expect(selected).toBeGreaterThanOrEqual(15);

  await drawButton.click();
  const config = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Configurar times" }) });
  await config.getByRole("button", { name: "Sortear", exact: true }).click();

  const result = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Times sorteados" }) });
  await expect(result).toBeVisible();

  // Defaults: 3 Times.
  const times = result.getByRole("region", { name: /^Time [A-Z]$/ });
  await expect(times).toHaveCount(3);

  const members = await times.getByRole("listitem").evaluateAll((items) =>
    items.map((li) => li.getAttribute("aria-label")?.split(",")[0] ?? ""),
  );
  expect(members).toHaveLength(selected);
  expect(new Set(members).size).toBe(selected);
});
