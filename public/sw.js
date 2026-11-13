/*
 * Squadra's service worker. Read-only offline, nothing more:
 *
 * - Each fut's home (the next Partida) and Elenco are saved when opened, and
 *   served from the save when the network fails. Pages always try the network
 *   first, so online nothing is ever stale.
 * - Next's hashed build files are kept as they load (they never change), and
 *   every file a saved page needs is fetched with it, so a saved page renders
 *   with no signal.
 * - Anything else with no signal gets /offline.html.
 * - No queued writes: with no signal the app disables them.
 * - Updates are silent: a new worker takes over at once.
 *
 * Keep CACHE_DE_PAGINAS, CABECALHO_SALVO_EM and guardaOffline in step with
 * lib/pwa/paginas.ts.
 */

const CACHE_DE_PAGINAS = "squadra-paginas-v1";
const CACHE_DE_ARQUIVOS = "squadra-arquivos-v1";
const CACHE_DE_IMAGENS = "squadra-imagens-v1";
const CACHE_BASICO = "squadra-basico-v1";
const CACHES = [CACHE_DE_PAGINAS, CACHE_DE_ARQUIVOS, CACHE_DE_IMAGENS, CACHE_BASICO];

const CABECALHO_SALVO_EM = "x-squadra-salvo-em";
/** Only a page that rendered a fut for a signed-in person carries this (FutShell). */
const MARCA_DE_PAGINA_DO_FUT = "data-guardar-offline";
/** Where "/" goes with no signal: the last fut home saved. */
const ULTIMO_FUT = "/__squadra/ultimo-fut";
const PAGINA_OFFLINE = "/offline.html";
const BASICO = [PAGINA_OFFLINE, "/icon.svg", "/icon-192.png"];

const MAX_ARQUIVOS = 300;
const RECENTE = 30_000;
const MAX_IMAGENS = 150;

const guardaOffline = (pathname) => /^\/g\/[^/]+(\/elenco)?\/?$/.test(pathname);
const ehInicioDoFut = (pathname) => /^\/g\/[^/]+\/?$/.test(pathname);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_BASICO)
      .then((cache) => cache.addAll(BASICO))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith("squadra-") && !CACHES.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Drops the oldest entries past `max` (keys come back in insertion order). */
async function aparar(nome, max) {
  const cache = await caches.open(nome);
  const chaves = await cache.keys();
  await Promise.all(chaves.slice(0, Math.max(0, chaves.length - max)).map((k) => cache.delete(k)));
}

/** Saves a fut page's response, if it really is one, with the files it needs. */
async function guardar(url, resposta) {
  if (!resposta || !resposta.ok || resposta.redirected) return;
  const html = await resposta.clone().text();
  if (!html.includes(MARCA_DE_PAGINA_DO_FUT)) return; // the sign-in screen, "fut não encontrado"…

  const cabecalhos = new Headers(resposta.headers);
  cabecalhos.set(CABECALHO_SALVO_EM, String(Date.now()));
  const paginas = await caches.open(CACHE_DE_PAGINAS);
  const { pathname } = new URL(url);
  await paginas.put(pathname, new Response(html, { status: 200, headers: cabecalhos }));
  if (ehInicioDoFut(pathname)) await paginas.put(ULTIMO_FUT, new Response(pathname));

  // Every build file the page names, so it renders with no signal.
  const arquivos = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) || [])];
  const cache = await caches.open(CACHE_DE_ARQUIVOS);
  await Promise.all(
    arquivos.map(async (a) => {
      if (await cache.match(a)) return;
      try {
        const r = await fetch(a);
        if (r.ok) await cache.put(a, r);
      } catch {
        // Missing one file only costs that file offline.
      }
    }),
  );
  await aparar(CACHE_DE_ARQUIVOS, MAX_ARQUIVOS);
}

async function pagina(event) {
  const url = new URL(event.request.url);
  try {
    const resposta = await fetch(event.request);
    if (guardaOffline(url.pathname)) event.waitUntil(guardar(url.href, resposta.clone()));
    return resposta;
  } catch {
    const paginas = await caches.open(CACHE_DE_PAGINAS);
    if (url.pathname === "/") {
      const ultimo = await paginas.match(ULTIMO_FUT);
      if (ultimo) return Response.redirect(await ultimo.text(), 302);
    }
    const salva = await paginas.match(url.pathname);
    if (salva) return salva;
    return (await caches.match(PAGINA_OFFLINE, { cacheName: CACHE_BASICO })) || Response.error();
  }
}

async function arquivoDoBuild(request) {
  const cache = await caches.open(CACHE_DE_ARQUIVOS);
  const salvo = await cache.match(request);
  if (salvo) return salvo;
  const resposta = await fetch(request);
  if (resposta.ok) {
    await cache.put(request, resposta.clone());
    void aparar(CACHE_DE_ARQUIVOS, MAX_ARQUIVOS);
  }
  return resposta;
}

/** Photos and flags: the network when there is one, the last copy when not. */
async function imagem(request) {
  const cache = await caches.open(CACHE_DE_IMAGENS);
  try {
    const resposta = await fetch(request);
    if (resposta.ok || resposta.type === "opaque") {
      await cache.put(request, resposta.clone());
      void aparar(CACHE_DE_IMAGENS, MAX_IMAGENS);
    }
    return resposta;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const mesmaOrigem = url.origin === self.location.origin;

  if (request.mode === "navigate" && mesmaOrigem) {
    event.respondWith(pagina(event));
  } else if (mesmaOrigem && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(arquivoDoBuild(request));
  } else if (request.destination === "image" && !url.pathname.startsWith("/_next/")) {
    event.respondWith(imagem(request));
  }
});

// The app asks to save a page it reached by a client navigation, which never
// comes through here as a page load.
self.addEventListener("message", (event) => {
  const dados = event.data;
  if (!dados || dados.tipo !== "guardar" || typeof dados.url !== "string") return;
  const url = new URL(dados.url, self.location.origin);
  if (url.origin !== self.location.origin || !guardaOffline(url.pathname)) return;
  event.waitUntil(
    (async () => {
      // Just saved by a page load (or a tab tapped twice): no second fetch.
      const salva = await (await caches.open(CACHE_DE_PAGINAS)).match(url.pathname);
      if (Date.now() - Number(salva?.headers.get(CABECALHO_SALVO_EM) || 0) < RECENTE) return;
      const resposta = await fetch(url.pathname, { credentials: "same-origin", headers: { Accept: "text/html" } });
      await guardar(url.href, resposta);
    })().catch(() => {}),
  );
});
