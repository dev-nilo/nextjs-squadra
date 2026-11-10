import { ElencoApp } from "@/components/elenco-app";

/**
 * A Grupo's Elenco. The app reads the slug from the URL itself (switching
 * Grupos only changes the URL, without remounting), so it isn't passed down.
 */
export default function GrupoPage() {
  return <ElencoApp />;
}
