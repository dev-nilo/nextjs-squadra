import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Squadra",
    short_name: "Squadra",
    description: "A lista do fut: quem vai, o elenco e os times sorteados.",
    lang: "pt-BR",
    // "/" opens the person's fut on its next Partida.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The app's background (--background, light), so the splash matches the first screen.
    background_color: "#F2F4F7",
    theme_color: "#14213D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
