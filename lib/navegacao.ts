/**
 * The fut's three tabs and where each lives under /g/<slug>. Partidas is the
 * fut's root: `/g/<slug>` is the next Partida, and the history and each
 * Partida live under `/partidas`, so they belong to the same tab. Pessoas
 * (`/pessoas`) hangs off Você.
 */
export type Aba = "partidas" | "elenco" | "voce";

export const ABAS: readonly { id: Aba; rotulo: string; sufixo: string }[] = [
  { id: "partidas", rotulo: "Partidas", sufixo: "" },
  { id: "elenco", rotulo: "Elenco", sufixo: "/elenco" },
  { id: "voce", rotulo: "Você", sufixo: "/voce" },
];

export function caminhoDaAba(slug: string, aba: Aba): string {
  const sufixo = ABAS.find((a) => a.id === aba)!.sufixo;
  return `/g/${encodeURIComponent(slug)}${sufixo}`;
}

/** The tab a pathname under /g/<slug> belongs to. */
export function abaDoCaminho(pathname: string): Aba {
  const resto = pathname.replace(/^\/g\/[^/]+/, "");
  if (resto === "/elenco" || resto.startsWith("/elenco/")) return "elenco";
  if (resto === "/voce" || resto.startsWith("/voce/")) return "voce";
  // Pessoas is reached from Você ("Este fut"), so it lights the same tab.
  if (resto === "/pessoas" || resto.startsWith("/pessoas/")) return "voce";
  return "partidas";
}

/**
 * Where switching to another fut goes: the same tab, at its root. A Partida's
 * id belongs to the fut you're leaving, so from inside one you land on the
 * new fut's next Partida.
 */
export function caminhoNoOutroFut(pathname: string, slug: string): string {
  return caminhoDaAba(slug, abaDoCaminho(pathname));
}

export function caminhoDasPessoas(slug: string): string {
  return `/g/${encodeURIComponent(slug)}/pessoas`;
}
