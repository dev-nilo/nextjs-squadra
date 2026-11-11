import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Squadra",
    short_name: "Squadra",
    description: "Gerencie seu elenco e sorteie times balanceados",
    start_url: "/",
    display: "standalone",
    background_color: "#F4EDE0",
    theme_color: "#14213D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
