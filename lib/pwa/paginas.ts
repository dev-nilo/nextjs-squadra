/**
 * The pages the app keeps for use with no signal: every tab of each fut (the
 * next Partida, Partidas, the Elenco, Você) and the last few Partidas opened.
 * The service worker (`public/sw.js`) saves them when they're opened and
 * serves them read-only when the network fails or hangs. Keep the names and
 * the path rule here in step with `public/sw.js`.
 */

/** The Cache Storage bucket with the saved pages. */
export const CACHE_DE_PAGINAS = "squadra-paginas-v1";

/** Where the service worker sends "/" with no signal (the last fut home it saved). */
const ULTIMO_FUT = "/__squadra/ultimo-fut";

/** The header the service worker stamps on a saved page: when it was saved (ms). */
export const CABECALHO_SALVO_EM = "x-squadra-salvo-em";

/** The <meta> name the service worker puts into a page it serves from its saved copy. */
export const MARCA_DE_COPIA = "squadra-copia-salva";

/** A fut's tabs and its Partidas: the pages worth having with no signal. */
export function guardaOffline(pathname: string): boolean {
  return /^\/g\/[^/]+(\/(elenco|partidas|voce|partidas\/[^/]+))?\/?$/.test(pathname);
}

/** Whether `pathname` is one of the fut `slug`'s pages. */
export function ehDoFut(pathname: string, slug: string): boolean {
  const fut = `/g/${encodeURIComponent(slug)}`;
  return pathname === fut || pathname.startsWith(`${fut}/`);
}

const FUSO = "America/Sao_Paulo";
const dia = (ms: number) => new Date(ms).toLocaleDateString("pt-BR", { timeZone: FUSO });

/**
 * When a saved page was saved, as the offline bar says it: "20h15", or
 * "13/11, 20h15" from another day.
 */
export function quandoFoiSalvo(salvoEm: number, agora: number): string {
  const partes = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(
    new Date(salvoEm),
  );
  const hora = partes.find((p) => p.type === "hour")?.value ?? "00";
  const minuto = partes.find((p) => p.type === "minute")?.value ?? "00";
  const horario = `${hora}h${minuto}`;
  if (dia(salvoEm) === dia(agora)) return horario;
  const [d, m] = dia(salvoEm).split("/");
  return `${d}/${m}, ${horario}`;
}

/** When this browser saved `url` for offline use, or null if it hasn't. */
export async function salvoEm(url: string): Promise<number | null> {
  if (typeof caches === "undefined") return null;
  try {
    const salva = await (await caches.open(CACHE_DE_PAGINAS)).match(url);
    const valor = Number(salva?.headers.get(CABECALHO_SALVO_EM));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

/**
 * Asks the service worker to save (or refresh) the page at `url`. For client
 * navigations, which never reach the service worker as a page load, and for
 * the very first visit, which loads before the service worker takes over (so
 * this waits for it).
 */
export function guardarPagina(url: string): void {
  const sw = typeof navigator === "undefined" ? undefined : navigator.serviceWorker;
  if (!sw) return;
  const pedir = () => sw.controller?.postMessage({ tipo: "guardar", url });
  if (sw.controller) pedir();
  else sw.addEventListener("controllerchange", pedir, { once: true });
}

/**
 * Forgets one fut's saved pages, when the person leaves it: with no signal
 * the app mustn't open a fut they're no longer in. "/" stops going there too.
 */
export async function esquecerFut(slug: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const paginas = await caches.open(CACHE_DE_PAGINAS);
    for (const chave of await paginas.keys()) {
      if (ehDoFut(new URL(chave.url).pathname, slug)) await paginas.delete(chave);
    }
    const ultimo = await paginas.match(ULTIMO_FUT);
    if (ultimo && ehDoFut(await ultimo.text(), slug)) await paginas.delete(ULTIMO_FUT);
  } catch {
    // Nothing saved, or storage blocked: nothing to forget.
  }
}

/** Forgets every saved page on sign out, so the next person on this phone can't open your lists. Cached photos stay until the browser evicts them. */
export async function esquecerPaginas(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    await caches.delete(CACHE_DE_PAGINAS);
  } catch {
    // Nothing saved, or storage blocked: nothing to forget.
  }
}
