import type { MetadataRoute } from "next";

/** Navy (Noite): the brand, the dark canvas, and a splash the cream icon stands out on. */
const NOITE = "#14213D";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Squadra",
    short_name: "Squadra",
    description: "A lista do fut: quem vai, o elenco e os times sorteados.",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["sports"],
    // "/" opens the person's fut on its next Partida.
    start_url: "/",
    scope: "/",
    display: "standalone",
    // No orientation lock: iOS ignores it anyway, so every screen works on its side,
    // and a lock only kept Android tablets from turning.
    // The splash and the status bar while it shows. Once the page loads, its own
    // theme-color takes over (the header's color, light or dark).
    background_color: NOITE,
    theme_color: NOITE,
    // A link opened from the group chat lands in the open app, not a second window.
    launch_handler: { client_mode: "navigate-existing" },
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Chrome's richer install dialog. Taken by scripts/capturas-do-manifest.mjs.
    screenshots: [
      {
        src: "/screenshots/partida-celular.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "A próxima partida: você responde se vai e vê quem já confirmou",
      },
      {
        src: "/screenshots/elenco-celular.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "O elenco do fut, uma figurinha por jogador",
      },
      {
        src: "/screenshots/elenco-tela-larga.png",
        sizes: "1280x800",
        type: "image/png",
        form_factor: "wide",
        label: "O elenco no computador",
      },
    ],
  };
}
