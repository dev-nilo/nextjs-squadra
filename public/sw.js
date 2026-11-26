/*
 * Squadra's service worker. Read-only offline, nothing more:
 *
 * - Each fut's pages (the next Partida, Partidas, the Elenco, Você, and the
 *   last few Partidas opened) are saved when opened, and served from the save
 *   when the network fails or doesn't answer in a few seconds (signal that's
 *   there but doesn't work, as at the court). Pages always try the network
 *   first, so online nothing is ever stale.
 * - A page served from its save carries a <meta name="squadra-copia-salva">,
 *   so the app knows to show the offline bar and turn writes off even when
 *   the phone says it's online.
 * - Next's hashed build files are kept as they load (they never change), and
 *   every file a saved page needs is fetched with it, so a saved page renders
 *   with no signal.
 * - Anything else with no signal gets /offline.html.
 * - No queued writes: with no signal the app disables them.
 * - Updates are silent: a new worker takes over at once.
 * - A failed save (a full disk) never breaks a response: the page still loads.
 *
 * Keep CACHE_DE_PAGINAS, CABECALHO_SALVO_EM, MARCA_DE_COPIA and guardaOffline
 * in step with lib/pwa/paginas.ts.
 */

const CACHE_DE_PAGINAS = "squadra-paginas-v1";
const CACHE_DE_ARQUIVOS = "squadra-arquivos-v1";
const CACHE_DE_IMAGENS = "squadra-imagens-v1";
// v2: offline.html changed (a way back to the saved pages).
const CACHE_BASICO = "squadra-basico-v3";
const CACHES = [CACHE_DE_PAGINAS, CACHE_DE_ARQUIVOS, CACHE_DE_IMAGENS, CACHE_BASICO];

const CABECALHO_SALVO_EM = "x-squadra-salvo-em";
/** Only page content that rendered for a signed-in member carries this (MarcaOffline). */
const MARCA_DE_PAGINA_DO_FUT = "data-guardar-offline";
/** "Esse fut não existe": the person left or was removed, so their saved pages go. */
const MARCA_DE_FUT_FORA = "data-fut-fora";
/** Put into a page served from its save, so the app can tell (see lib/pwa/conexao.ts). */
const MARCA_DE_COPIA = '<meta name="squadra-copia-salva" content="1">';
/** Where "/" goes with no signal: the last fut home saved. */
const ULTIMO_FUT = "/__squadra/ultimo-fut";
const PAGINA_OFFLINE = "/offline.html";
const BASICO = [PAGINA_OFFLINE, "/icon.svg", "/icon-192.png"];

/** How long a page with a saved copy waits for the network before showing the copy. */
const ESPERA_PELA_REDE = 3500;
/** A page saved this recently isn't fetched again just to save it. */
const RECENTE = 5 * 60_000;
const MAX_ARQUIVOS = 300;
const MAX_IMAGENS = 150;
const MAX_PARTIDAS_SALVAS = 5;

const guardaOffline = (pathname) => /^\/g\/[^/]+(\/(elenco|partidas|voce|partidas\/[^/]+))?\/?$/.test(pathname);
const ehInicioDoFut = (pathname) => /^\/g\/[^/]+\/?$/.test(pathname);
const ehUmaPartida = (pathname) => /^\/g\/[^/]+\/partidas\/[^/]+\/?$/.test(pathname);
const futDe = (pathname) => pathname.match(/^\/g\/[^/]+/)?.[0];

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
    (async () => {
      // The page's request starts while the worker wakes up, instead of after.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n.startsWith("squadra-") && !CACHES.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** cache.put that never throws: with the disk full, the page still loads, it just isn't kept. */
async function guardarNoCache(cache, chave, resposta) {
  try {
    await cache.put(chave, resposta);
    return true;
  } catch {
    return false;
  }
}

/** Drops the oldest entries past `max` (keys come back in insertion order; a put moves a key to the end). */
async function aparar(nome, max, filtro = () => true) {
  try {
    const cache = await caches.open(nome);
    const chaves = (await cache.keys()).filter((k) => filtro(new URL(k.url).pathname));
    await Promise.all(chaves.slice(0, Math.max(0, chaves.length - max)).map((k) => cache.delete(k)));
  } catch {
    // Nothing to trim, or storage blocked.
  }
}

/** Forgets every saved page of one fut ("/g/<slug>"), and "/" stops going there. */
async function esquecerFut(fut) {
  if (!fut) return;
  const paginas = await caches.open(CACHE_DE_PAGINAS);
  for (const chave of await paginas.keys()) {
    const { pathname } = new URL(chave.url);
    if (pathname === fut || pathname.startsWith(`${fut}/`)) await paginas.delete(chave);
  }
  const ultimo = await paginas.match(ULTIMO_FUT);
  if (ultimo && (await ultimo.text()) === fut) await paginas.delete(ULTIMO_FUT);
}

/** Saves a fut page's response, if it really is one, with the files it needs. */
async function guardar(pathname, resposta) {
  if (!resposta || !resposta.ok || resposta.redirected) return;
  const html = await resposta.text();
  if (html.includes(MARCA_DE_FUT_FORA)) return esquecerFut(futDe(pathname));
  // The sign-in screen, an error, "essa partida não existe"…: keep the last good copy.
  if (!html.includes(MARCA_DE_PAGINA_DO_FUT)) return;

  const cabecalhos = new Headers(resposta.headers);
  // The body is now plain text, not what these described.
  cabecalhos.delete("content-length");
  cabecalhos.delete("content-encoding");
  cabecalhos.set(CABECALHO_SALVO_EM, String(Date.now()));
  const paginas = await caches.open(CACHE_DE_PAGINAS);
  if (!(await guardarNoCache(paginas, pathname, new Response(html, { status: 200, headers: cabecalhos })))) return;
  if (ehInicioDoFut(pathname)) await guardarNoCache(paginas, ULTIMO_FUT, new Response(pathname.replace(/\/$/, "")));
  if (ehUmaPartida(pathname)) await aparar(CACHE_DE_PAGINAS, MAX_PARTIDAS_SALVAS, ehUmaPartida);

  // Every build file the page names, so it renders with no signal.
  const arquivos = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) || [])];
  const cache = await caches.open(CACHE_DE_ARQUIVOS);
  await Promise.all(
    arquivos.map(async (a) => {
      if (await cache.match(a)) return;
      try {
        const r = await fetch(a);
        if (r.ok) await guardarNoCache(cache, a, r);
      } catch {
        // Missing one file only costs that file offline.
      }
    }),
  );
  await aparar(CACHE_DE_ARQUIVOS, MAX_ARQUIVOS);
}

/** The saved copy of a page, marked as such, or for "/" a redirect to the last fut. */
async function copiaSalva(pathname) {
  const paginas = await caches.open(CACHE_DE_PAGINAS);
  if (pathname === "/") {
    const ultimo = await paginas.match(ULTIMO_FUT);
    return ultimo ? Response.redirect(await ultimo.text(), 302) : null;
  }
  const salva = await paginas.match(pathname);
  if (!salva) return null;
  const html = (await salva.text()).replace(/<head[^>]*>/, (head) => head + MARCA_DE_COPIA);
  return new Response(html, { status: 200, headers: salva.headers });
}

/** Rejects after `ms`, so a network that hangs can lose the race to a saved copy. */
const prazo = (ms) => new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error("prazo")), ms));

/**
 * When the network last hung. A tab's data that just gave up is followed at
 * once by the same page in full: that one shouldn't wait the whole time again.
 */
let redeTravouEm = 0;
const espera = () => (Date.now() - redeTravouEm < 10_000 ? 500 : ESPERA_PELA_REDE);

async function pagina(event) {
  const { pathname } = new URL(event.request.url);
  const rede = (async () => (await event.preloadResponse) || fetch(event.request))();
  rede.catch(() => {}); // a failure is handled below; this only keeps it from being reported as unhandled
  if (guardaOffline(pathname)) {
    // Saved even when it arrives after the copy was shown: the next visit gets it.
    event.waitUntil(rede.then((r) => guardar(pathname, r.clone())).catch(() => {}));
  }

  const temCopia = guardaOffline(pathname) || pathname === "/";
  try {
    return await (temCopia ? Promise.race([rede, prazo(espera())]) : rede);
  } catch {
    redeTravouEm = Date.now();
    const copia = await copiaSalva(pathname);
    if (copia) return copia;
    // Slow but alive, and nothing saved: keep waiting for the network.
    try {
      return await rede;
    } catch {
      return (await caches.match(PAGINA_OFFLINE, { cacheName: CACHE_BASICO })) || Response.error();
    }
  }
}

/**
 * A tab tapped inside the app (Next fetches the page's data, not the page).
 * When that page has a saved copy and the network hangs, give up after a few
 * seconds: Next then loads the page in full, and `pagina` serves the copy.
 */
async function dadosDaPagina(request, pathname) {
  const salva = await (await caches.open(CACHE_DE_PAGINAS)).match(pathname);
  if (!salva) return fetch(request);
  try {
    return await Promise.race([fetch(request), prazo(espera())]);
  } catch {
    redeTravouEm = Date.now();
    return Response.error();
  }
}

async function arquivoDoBuild(event) {
  const cache = await caches.open(CACHE_DE_ARQUIVOS);
  const salvo = await cache.match(event.request);
  if (salvo) return salvo;
  const resposta = await fetch(event.request);
  if (resposta.ok) {
    const copia = resposta.clone();
    event.waitUntil(guardarNoCache(cache, event.request, copia).then(() => aparar(CACHE_DE_ARQUIVOS, MAX_ARQUIVOS)));
  }
  return resposta;
}

/**
 * Photos and flags: the network when there is one, the last copy when not.
 * They load with crossorigin="anonymous", so they're kept as real responses;
 * an opaque one would count as megabytes against the phone's quota.
 */
async function imagem(event) {
  const cache = await caches.open(CACHE_DE_IMAGENS);
  let resposta;
  try {
    resposta = await fetch(event.request);
  } catch {
    return (await cache.match(event.request)) || Response.error();
  }
  if (resposta.ok) {
    const copia = resposta.clone();
    event.waitUntil(guardarNoCache(cache, event.request, copia).then(() => aparar(CACHE_DE_IMAGENS, MAX_IMAGENS)));
  }
  return resposta;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const mesmaOrigem = url.origin === self.location.origin;

  if (request.mode === "navigate" && mesmaOrigem) {
    event.respondWith(pagina(event));
  } else if (mesmaOrigem && request.headers.get("RSC") === "1" && guardaOffline(url.pathname)) {
    event.respondWith(dadosDaPagina(request, url.pathname));
  } else if (mesmaOrigem && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(arquivoDoBuild(event));
  } else if (request.destination === "image" && !url.pathname.startsWith("/_next/")) {
    event.respondWith(imagem(event));
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
      await guardar(url.pathname, resposta);
    })().catch(() => {}),
  );
});
