import { expect, test, type Locator, type Page } from "@playwright/test";
import { abrirAba, DEV_USER, signIn } from "./support";

/** Selects the whole Elenco in "Sortear rápido" and draws, with the default 3 Times. */
async function sortearRapido(page: Page) {
  await signIn(page, DEV_USER);
  await abrirAba(page, "Elenco");

  // "Sortear rápido" turns taps into selection, with a counter bar.
  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("button", { name: "Sortear rápido" }).click();
  await page.getByRole("button", { name: "Selecionar todos" }).click();
  const drawButton = page.getByRole("button", { name: /^Sortear times \(\d+\)$/ });
  const selected = Number((await drawButton.textContent())?.match(/\((\d+)\)/)?.[1]);

  await drawButton.click();
  const config = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Quantos times?" }) });
  await config.getByRole("button", { name: "Sortear", exact: true }).click();

  const result = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Times sorteados" }) });
  await expect(result).toBeVisible();
  return { result, selected };
}

/** The names listed in one or more Times, from each row's accessible name ("<nome>, <posição>"). */
const nomes = (times: Locator) =>
  times.getByRole("listitem").evaluateAll((items) => items.map((li) => li.getAttribute("aria-label")?.split(",")[0] ?? ""));

test("the quick Sorteio puts every selected Jogador in exactly one Time", { tag: "@mobile" }, async ({ page }) => {
  const { result, selected } = await sortearRapido(page);
  expect(selected).toBeGreaterThanOrEqual(15);

  // Defaults: 3 Times.
  const times = result.getByRole("region", { name: /^Time \d$/ });
  await expect(times).toHaveCount(3);

  const members = await nomes(times);
  expect(members).toHaveLength(selected);
  expect(new Set(members).size).toBe(selected);
});

test("a Jogador moves to another Time with the select beside their name, no dragging", { tag: "@mobile" }, async ({ page }) => {
  const { result } = await sortearRapido(page);
  const time1 = result.getByRole("region", { name: "Time 1", exact: true });
  const time2 = result.getByRole("region", { name: "Time 2", exact: true });
  const antes1 = await nomes(time1);
  const antes2 = await nomes(time2);
  const quem = antes1[0];

  // As someone using it would: on the select (selectOption alone doesn't focus it).
  const mover = time1.getByRole("combobox", { name: `Mover ${quem}`, exact: true });
  await mover.focus();
  await mover.selectOption({ label: "→ Time 2" });

  // Now listed in Time 2, with that Time selected.
  await expect(time2.getByRole("combobox", { name: `Mover ${quem}`, exact: true })).toHaveValue("1");
  // The keyboard focus follows them to their new row (#88).
  await expect(time2.getByRole("combobox", { name: `Mover ${quem}`, exact: true })).toBeFocused();
  expect(await nomes(time1)).toHaveLength(antes1.length - 1);
  expect((await nomes(time2)).sort()).toEqual([...antes2, quem].sort());

  // Focus somewhere else is left alone: only lost focus comes back.
  const outro = (await nomes(time1))[0];
  const baixar = result.getByRole("button", { name: "Baixar PNG" });
  await baixar.focus();
  await time1.getByRole("combobox", { name: `Mover ${outro}`, exact: true }).selectOption({ label: "→ Time 2" });
  await expect(time2.getByRole("combobox", { name: `Mover ${outro}`, exact: true })).toHaveValue("1");
  await expect(baixar).toBeFocused();
});
