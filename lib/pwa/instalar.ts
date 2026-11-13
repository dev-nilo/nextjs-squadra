"use client";

import { useSyncExternalStore } from "react";

/** Chrome's install prompt event (not in the DOM types yet). */
type PedidoDeInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * How this browser can install Squadra:
 * - "pronto": Android / desktop Chrome and Edge, one tap through the native prompt;
 * - "ios": Safari on iPhone and iPad, by hand from the Share menu;
 * - "instalado": already running as the installed app;
 * - "indisponivel": anything else (or Chrome hasn't offered it yet).
 */
export type ComoInstalar = "pronto" | "ios" | "instalado" | "indisponivel";

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

export function comoInstalar(): ComoInstalar {
  if (typeof window === "undefined") return "indisponivel";
  if (rodandoInstalado()) return "instalado";
  if (pedido) return "pronto";
  if (ehIOS()) return "ios";
  return "indisponivel";
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
  await atual.prompt();
  return (await atual.userChoice).outcome === "accepted";
}

export const INSTRUCOES_IOS = "No Safari, toque em Compartilhar e depois em \"Adicionar à Tela de Início\".";

const JA_OFERECEU = "squadra:ofereceu-instalar";

/**
 * Whether to offer the install once, right after someone's first Vou / Não
 * vou (never on a first visit, never twice). Marks it offered.
 */
export function deveOferecerInstalacao(): boolean {
  const como = comoInstalar();
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
