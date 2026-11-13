import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/** Users created by supabase/seed.sql. */
export const SEED_PASSWORD = "squadra-dev-123";
export const DEV_USER = "dev@squadra.test";
export const AMIGO_USER = "amigo@squadra.test";

export async function signIn(page: Page, email: string) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toBeVisible();
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bora pro jogo!" })).toHaveCount(0);
}

/**
 * Opens a tab of the fut. Phones get the bottom bar and wider screens the
 * header's tabs; only one of them is visible, so this finds the right one.
 */
export async function abrirAba(page: Page, aba: "Partidas" | "Elenco" | "Você") {
  await page.getByRole("navigation", { name: "Seções do fut" }).getByRole("link", { name: aba, exact: true }).click();
  await expect(page.getByRole("heading", { name: aba === "Partidas" ? /./ : aba, level: 1 }).first()).toBeVisible();
}

/**
 * The Jogador card, by its accessible name ("Carta de <nome>, <posição>, rating <n>").
 * A button when a tap does something (a photo card turns, or "Sortear rápido" ticks it), else an image.
 */
export function card(page: Page, name: string) {
  const nome = new RegExp(`^Carta de ${escapeRegExp(name)},`);
  return page.getByRole("button", { name: nome }).or(page.getByRole("img", { name: nome }));
}

/** Runs one of a card's actions from its ⋯ ("Editar", "Excluir", "Desvincular conta", "Sou eu"). */
export async function acaoDaCarta(page: Page, name: string, acao: string) {
  await page.getByRole("button", { name: `Ações da carta de ${name}` }).click();
  await page.getByRole("button", { name: acao, exact: true }).click();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bypasses RLS, only to arrange and clean up. CI exports both from `supabase status`. */
export function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from `npx supabase status`).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The local Supabase's email catcher (Mailpit, or Inbucket on older CLIs). */
const MAIL = process.env.SUPABASE_MAIL_URL ?? "http://127.0.0.1:54324";

/** The confirmation link from the last email sent to `email`. */
export async function linkDeConfirmacao(email: string): Promise<string> {
  const achar = (html: string) => html.match(/href="([^"]*\/auth\/confirm\?[^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const busca = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`).catch(() => null);
    if (busca?.ok) {
      const { messages } = (await busca.json()) as { messages?: { ID: string }[] };
      if (messages?.length) {
        const mensagem = (await (await fetch(`${MAIL}/api/v1/message/${messages[0].ID}`)).json()) as { HTML: string };
        const link = achar(mensagem.HTML);
        if (link) return link;
      }
    } else {
      const caixa = email.split("@")[0];
      const lista = await fetch(`${MAIL}/api/v1/mailbox/${caixa}`).catch(() => null);
      const mensagens = lista?.ok ? ((await lista.json()) as { id: string }[]) : [];
      if (mensagens.length) {
        const mensagem = (await (await fetch(`${MAIL}/api/v1/mailbox/${caixa}/${mensagens.at(-1)!.id}`)).json()) as {
          body: { html: string };
        };
        const link = achar(mensagem.body.html);
        if (link) return link;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No confirmation email for ${email} at ${MAIL}`);
}
