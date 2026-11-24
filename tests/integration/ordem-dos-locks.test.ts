import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  abrirComo,
  addJogador,
  addMembro,
  admin as service,
  chamarComo,
  conexaoDireta,
  esperarTravados,
  newUser,
  pidDe,
  removeUsers,
  type TestUser,
} from "./support";

/*
 * Lock order (20261124000000_ordem_dos_locks.sql). A direct connection holds a
 * row lock in an open transaction, so a test can line calls up behind it and
 * see who waits for what.
 */

let dono: TestUser;
let admin: TestUser;
let membro: TestUser;
let deFora: TestUser;
let db: pg.Client;
let segura: number;

beforeAll(async () => {
  [dono, admin, membro, deFora] = await Promise.all(["dono", "admin", "membro", "fora"].map((l) => newUser(`locks-${l}`)));
  db = await conexaoDireta();
  segura = await pidDe(db);
});

afterEach(async () => {
  // A failed test must not leave a lock behind for the next one.
  await db.query("rollback");
});

afterAll(async () => {
  await db.end();
  await removeUsers(dono, admin, membro, deFora);
});

/** A Grupo with an admin and a membro, the membro's Jogador, and a Partida tomorrow. */
async function fut() {
  const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut dos Locks" });
  if (error) throw error;
  await addMembro(grupo.id, admin, "admin");
  await addMembro(grupo.id, membro, "membro");
  const { data: jogador } = await addJogador(dono, grupo.id, "Travado");
  await service().from("players").update({ conta_id: membro.id }).eq("id", jogador!.id).throwOnError();
  const { data: partida } = await dono.client
    .from("partidas")
    .insert({ grupo_id: grupo.id, inicio: new Date(Date.now() + 86_400_000).toISOString(), local: "Quadra", vagas: 10 })
    .select("id")
    .single()
    .throwOnError();
  return { grupo: grupo.id as string, jogador: jogador!.id as string, partida: partida!.id as string };
}

/** Sends the call now: a supabase-js query only goes out once something awaits it. */
const agora = <T>(chamada: PromiseLike<T>): Promise<T> => Promise.resolve(chamada);

/** The call's result, or a failure if it's still waiting after `ms`. */
async function semEsperar<T>(chamada: PromiseLike<T>, ms = 3_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeita) => {
    timer = setTimeout(() => rejeita(new Error(`still waiting after ${ms} ms: it queued for the lock`)), ms);
  });
  try {
    return await Promise.race([Promise.resolve(chamada), limite]);
  } finally {
    clearTimeout(timer);
  }
}

describe("someone outside the fut never queues for its locks (#86)", () => {
  it("is refused at once while a Partida is locked", async () => {
    const { partida, jogador } = await fut();
    await db.query("begin");
    await db.query("select 1 from public.partidas where id = $1 for update", [partida]);

    const chamadas = {
      responder_presenca: deFora.client.rpc("responder_presenca", { partida, jogador, vou: true }),
      salvar_sorteio: deFora.client.rpc("salvar_sorteio", { partida, times: [[jogador], []] }),
      mover_no_sorteio: deFora.client.rpc("mover_no_sorteio", { partida, jogador, para_time: 1, sorteado_em: new Date().toISOString() }),
      publicar_sorteio: deFora.client.rpc("publicar_sorteio", { partida }),
    };
    for (const [nome, chamada] of Object.entries(chamadas)) {
      const { error } = await semEsperar(chamada);
      expect(error?.hint, nome).toBe("nao-encontrada");
    }
  });

  it("is refused at once while a Jogador is locked", async () => {
    const { jogador } = await fut();
    await db.query("begin");
    await db.query("select 1 from public.players where id = $1 for update", [jogador]);

    expect((await semEsperar(deFora.client.rpc("vincular_jogador", { jogador }))).error?.hint).toBe("nao-membro");
    expect((await semEsperar(deFora.client.rpc("desvincular_jogador", { jogador }))).error?.hint).toBe("sem-permissao");
  });

  it("a member still waits their turn and gets in", async () => {
    const { partida, jogador } = await fut();
    await db.query("begin");
    await db.query("select 1 from public.partidas where id = $1 for update", [partida]);

    const resposta = agora(membro.client.rpc("responder_presenca", { partida, jogador, vou: true }));
    await esperarTravados(db, [segura]);
    await db.query("commit");
    expect((await resposta).error).toBeNull();
  });
});

describe("every people function takes the Grupo's lock first (#91)", () => {
  it("removing someone while they leave doesn't deadlock: one wins, the other is told why", async () => {
    const { grupo, jogador } = await fut();
    // Hold the person's Jogador, so both calls get as far as they can and wait.
    await db.query("begin");
    await db.query("select 1 from public.players where id = $1 for update", [jogador]);

    const [comoMembro, comoDono] = await Promise.all([conexaoDireta(), conexaoDireta()]);
    // Before the calls: a connection busy waiting can't answer anything else.
    const quemSai = await pidDe(comoMembro);
    try {
      // Leaving locks the Grupo, then waits for the Jogador.
      const sai = chamarComo(comoMembro, membro, "select public.sair_do_grupo($1)", [grupo]);
      await esperarTravados(db, [segura]);
      // Removing waits for the Grupo, which leaving holds. Before #91 it locked the
      // person's membership row and waited for the Jogador instead, and when the lock
      // below was released the two waited for each other until Postgres aborted one (40P01).
      const remove = chamarComo(comoDono, dono, "select public.remover_do_grupo($1, $2)", [grupo, membro.id]);
      await esperarTravados(db, [quemSai, segura], 2);
      await db.query("commit");

      const [saiu, removido] = await Promise.all([sai, remove]);
      expect(saiu.error?.code).not.toBe("40P01");
      expect(removido.error?.code).not.toBe("40P01");
      expect(saiu.error).toBeNull();
      expect(removido.error?.hint).toBe("pessoa-fora");
    } finally {
      await Promise.all([comoMembro.end(), comoDono.end()]);
    }

    const { data } = await service().from("players").select("conta_id").eq("id", jogador).single();
    expect(data).toEqual({ conta_id: null });
  });

  it("changing someone's papel waits for the Grupo too", async () => {
    const { grupo } = await fut();
    await db.query("begin");
    await db.query("select 1 from public.grupos where id = $1 for update", [grupo]);

    const muda = agora(dono.client.rpc("mudar_papel", { grupo, pessoa: membro.id, novo: "admin" }));
    await esperarTravados(db, [segura]);
    await db.query("commit");
    expect((await muda).error).toBeNull();
  });

  it("a dono who handed the fut over while their call waited is refused once it gets the lock", async () => {
    const chamadas = {
      remover_do_grupo: (grupo: string) => dono.client.rpc("remover_do_grupo", { grupo, pessoa: membro.id }),
      mudar_papel: (grupo: string) => dono.client.rpc("mudar_papel", { grupo, pessoa: membro.id, novo: "admin" }),
      renomear_grupo: (grupo: string) => dono.client.rpc("renomear_grupo", { grupo, nome: "Outro nome" }),
      // Before this PR, excluir_grupo deleted a Grupo its caller no longer owned.
      excluir_grupo: (grupo: string) => dono.client.rpc("excluir_grupo", { grupo, confirmacao: "Fut dos Locks" }),
    };
    for (const [nome, chama] of Object.entries(chamadas)) {
      const { grupo } = await fut();
      // The handover, not yet committed: it holds the Grupo's lock.
      await abrirComo(db, dono);
      await db.query("select public.passar_posse($1, $2)", [grupo, admin.id]);

      // Still the dono as far as this call can see, so it gets to the lock and waits.
      const chamada = agora(chama(grupo));
      await esperarTravados(db, [segura]);
      await db.query("commit");

      expect((await chamada).error?.hint, nome).toBe("sem-permissao");
    }
  });
});

describe("a deleted Jogador's Partidas are touched without waiting for their locks (#83)", () => {
  it("deleting a Jogador who said não vou doesn't queue behind a locked Partida", async () => {
    const { partida, jogador } = await fut();
    await membro.client.rpc("responder_presenca", { partida, jogador, vou: false }).throwOnError();
    // Whoever holds the Partida (responder_presenca, a Sorteio function) writes to it and
    // sends its own event. Waiting for it could deadlock, as in #108.
    await db.query("begin");
    await db.query("select 1 from public.partidas where id = $1 for update", [partida]);

    const { error } = await semEsperar(dono.client.from("players").delete().eq("id", jogador));
    expect(error).toBeNull();
  });
});
