"use client";

import { useSyncExternalStore } from "react";

/** Chrome's install prompt event (not in the DOM types yet). */
type PedidoDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * How this browser can install Squadra:
 * - "pronto": Android / desktop Chrome and Edge, one tap through the native prompt;
 * - "ios": iPhone and iPad, by hand from the Share menu;
 * - "outro-navegador": a link opened inside Instagram, Facebook and the like,
 *   whose browser can't install anything: open it in the phone's browser first;
 * - "instalado": already running as the installed app;
 * - "indisponivel": anything else (or Chrome hasn't offered it yet).
 */
export type ComoInstalar = "pronto" | "ios" | "outro-navegador" | "instalado" | "indisponivel";

let pedido: PedidoDeInstalacao | null = null;
let instalou = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());

// The browser fires this once, early: listen from the first import (the root
// layout's service worker registration imports this module).
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pedido = e as PedidoDeInstalacao;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    pedido = null;
    instalou = true;
    avisar();
  });
}

function rodandoInstalado(): boolean {
  return (
    instalou ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ehIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch gives it away.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** The browser inside a social app (Instagram, Facebook, Messenger, TikTok, LINE, Snapchat). */
export function ehNavegadorDeApp(ua: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|Messenger|musical_ly|BytedanceWebview|TikTok|\bLine\/|Snapchat/i.test(ua);
}

export function comoInstalar(): ComoInstalar {
  if (typeof window === "undefined") return "indisponivel";
  if (rodandoInstalado()) return "instalado";
  if (pedido) return "pronto";
  if (ehNavegadorDeApp(navigator.userAgent)) return "outro-navegador";
  if (ehIOS()) return "ios";
  return "indisponivel";
}

/** Where to open the link when the in-app browser can't install: Safari on iPhone, Chrome on Android. */
export function instrucoesOutroNavegador(): string {
  return typeof navigator !== "undefined" && ehIOS()
    ? 'Abra este link no Safari (no menu ⋯, "Abrir no navegador") pra instalar.'
    : 'Abra este link no Chrome (no menu ⋮, "Abrir no navegador") pra instalar.';
}

export function useComoInstalar(): ComoInstalar {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    comoInstalar,
    () => "indisponivel",
  );
}

/** Opens the native install prompt. True if the person accepted. */
export async function instalar(): Promise<boolean> {
  if (!pedido) return false;
  const atual = pedido;
  pedido = null; // a prompt can be shown only once
  avisar();
  try {
    await atual.prompt();
    return (await atual.userChoice).outcome === "accepted";
  } catch {
    // The browser refused to show it (no tap behind it, or already shown): nothing installed.
    return false;
  }
}

/** Shown on success, wherever the install started. */
export const INSTALOU = "Pronto, o Squadra está na sua tela inicial.";

/**
 * iPhone steps. Safari, Chrome and Firefox on iOS all have "Adicionar à Tela de
 * Início" in the Share menu. The installed app keeps its own sign-in, apart
 * from the browser's: say so, or the sign-in screen looks like a bug.
 */
export const INSTRUCOES_IOS =
  'Toque em Compartilhar e depois em "Adicionar à Tela de Início". No app, você entra com seu email uma vez.';

const JA_OFERECEU = "squadra:ofereceu-instalar";

/**
 * Whether to offer the install once, right after someone's first Vou / Não
 * vou (never on a first visit, never twice). Marks it offered.
 */
export function deveOferecerInstalacao(): boolean {
  const como = comoInstalar();
  // Not inside Instagram & co.: "open it elsewhere" is no reward for answering.
  if (como !== "pronto" && como !== "ios") return false;
  try {
    if (localStorage.getItem(JA_OFERECEU)) return false;
    localStorage.setItem(JA_OFERECEU, "1");
    return true;
  } catch {
    // No storage (private mode): never nag.
    return false;
  }
}
