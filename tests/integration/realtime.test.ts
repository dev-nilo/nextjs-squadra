import type { RealtimeChannel } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import { addJogador, addMembro, newUser, removeUsers, type TestUser } from "./support";

/*
 * Supabase Realtime, subscribed the way the Partida page subscribes
 * (hooks/use-partida-ao-vivo.ts). The publication sends inserts and updates
 * only (20261124020000_realtime_sem_deletes.sql), because Realtime can't check
 * a delete against the subscriber's RLS.
 */

let users: TestUser[] = [];
let canais: RealtimeChannel[] = [];
const user = async (label: string) => {
  const u = await newUser(label);
  users.push(u);
  return u;
};

afterEach(async () => {
  await Promise.all(canais.map((c) => c.unsubscribe()));
  canais = [];
  await removeUsers(...users);
  users = [];
});

type Evento = { table: string; eventType: string };

/** Subscribes `quem` with their own token and resolves once the channel is live. */
async function ouvir(quem: TestUser, nome: string, assinaturas: { table: string; event: "*" | "UPDATE"; filter?: string }[]) {
  const { data } = await quem.client.auth.getSession();
  quem.client.realtime.setAuth(data.session!.access_token);
  const eventos: Evento[] = [];
  let canal = quem.client.channel(`${nome}:${Math.random()}`);
  for (const a of assinaturas) {
    canal = canal.on("postgres_changes", { schema: "public", ...a }, (p) => eventos.push({ table: p.table, eventType: p.eventType }));
  }
  canais.push(canal);
  await new Promise<void>((pronto, falha) => {
    canal.subscribe((status, erro) => {
      if (status === "SUBSCRIBED") pronto();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") falha(erro ?? new Error(status));
    });
  });
  return eventos;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits until `eventos` has something, or fails after `ms`. */
async function chega(eventos: Evento[], ms = 10_000) {
  const ate = Date.now() + ms;
  while (eventos.length === 0) {
    if (Date.now() > ate) throw new Error(`no Realtime event within ${ms} ms`);
    await espera(100);
  }
  return eventos;
}

/**
 * Makes sure a subscription is really live before a test counts on hearing
 * nothing. Realtime reports SUBSCRIBED a moment before it delivers, and right
 * after a database reset (as in CI) it can take several seconds more. So
 * `provoca` changes something the subscriber is allowed to see, again every
 * second, until it arrives; then the events so far are dropped.
 */
async function jaOuve(eventos: Evento[], provoca: (vez: number) => PromiseLike<unknown>, ms = 30_000) {
  const ate = Date.now() + ms;
  for (let vez = 0; eventos.length === 0; vez++) {
    if (Date.now() > ate) throw new Error(`subscription not live after ${ms} ms`);
    await provoca(vez);
    for (let t = 0; t < 10 && eventos.length === 0; t++) await espera(100);
  }
  await espera(500);
  eventos.length = 0;
}

/** A Grupo with a membro whose Jogador said "vou" to a Partida tomorrow. */
async function futComPresenca(label: string) {
  const dono = await user(`${label}-dono`);
  const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: `Fut ${label}` });
  if (error) throw error;
  const { data: partida } = await dono.client
    .from("partidas")
    .insert({ grupo_id: grupo.id, inicio: new Date(Date.now() + 86_400_000).toISOString(), local: "Quadra", vagas: 10 })
    .select("id")
    .single()
    .throwOnError();
  const { data: jogador } = await addJogador(dono, grupo.id, `Vai ${label}`);
  await dono.client.rpc("responder_presenca", { partida: partida!.id, jogador: jogador!.id, vou: true }).throwOnError();
  return { dono, grupo: grupo.id as string, partida: partida!.id as string, jogador: jogador!.id as string };
}

/** The Partida page's three subscriptions. */
const daPagina = (partida: string) => [
  { table: "presencas", event: "*" as const, filter: `partida_id=eq.${partida}` },
  { table: "sorteios", event: "*" as const, filter: `partida_id=eq.${partida}` },
  { table: "partidas", event: "UPDATE" as const, filter: `id=eq.${partida}` },
];

describe("Realtime", { timeout: 60_000 }, () => {
  it("someone in another Grupo hears nothing when a Jogador with presences is deleted (#83)", async () => {
    const aqui = await futComPresenca("aqui");
    const outro = await futComPresenca("outro");
    // Everything they could ask for, unfiltered.
    const ouvidos = await ouvir(outro.dono, "tudo", [
      { table: "presencas", event: "*" },
      { table: "sorteios", event: "*" },
      { table: "partidas", event: "*" },
    ]);
    await jaOuve(ouvidos, (vez) => outro.dono.client.from("partidas").update({ local: `Quadra ${vez}` }).eq("id", outro.partida).throwOnError());

    await aqui.dono.client.rpc("excluir_jogador", { grupo: aqui.grupo, jogador: aqui.jogador }).throwOnError();

    // Before #83 a DELETE with the presence's key arrived here within a second.
    await espera(3_000);
    expect(ouvidos).toEqual([]);
  });

  it("the Partida's page still hears that a Jogador on its list was deleted", async () => {
    const aqui = await futComPresenca("pagina");
    const membro = await user("pagina-membro");
    await addMembro(aqui.grupo, membro, "membro");
    const ouvidos = await ouvir(membro, "pagina", daPagina(aqui.partida));
    await jaOuve(ouvidos, (vez) => aqui.dono.client.from("partidas").update({ local: `Quadra ${vez}` }).eq("id", aqui.partida).throwOnError());

    await aqui.dono.client.rpc("excluir_jogador", { grupo: aqui.grupo, jogador: aqui.jogador }).throwOnError();

    expect(await chega(ouvidos)).toContainEqual({ table: "partidas", eventType: "UPDATE" });
  });

  it("an answer still reaches the Partida's page, and nobody outside", async () => {
    const aqui = await futComPresenca("resposta");
    const outro = await futComPresenca("de-fora");
    const membro = await user("resposta-membro");
    await addMembro(aqui.grupo, membro, "membro");
    const { data: dele } = await addJogador(aqui.dono, aqui.grupo, "Responde");
    const naPagina = await ouvir(membro, "pagina", daPagina(aqui.partida));
    const deFora = await ouvir(outro.dono, "tudo", [{ table: "presencas", event: "*" }]);
    // Answering alternates, so each call changes the row.
    await jaOuve(deFora, (vez) =>
      outro.dono.client.rpc("responder_presenca", { partida: outro.partida, jogador: outro.jogador, vou: vez % 2 === 1 }).throwOnError(),
    );

    await aqui.dono.client.rpc("responder_presenca", { partida: aqui.partida, jogador: dele!.id, vou: true }).throwOnError();

    expect(await chega(naPagina)).toContainEqual({ table: "presencas", eventType: "INSERT" });
    await espera(1_000);
    expect(deFora).toEqual([]);
  });
});
