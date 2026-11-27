import { randomUUID } from "node:crypto";
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
  [dono, admin, membro, deFora] = await Promise.all([
    newUser("locks-dono"),
    newUser("locks-admin"),
    newUser("locks-membro"),
    newUser("locks-fora"),
  ]);
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

/**
 * A Grupo with an admin and a membro, the membro's Jogador, and a Partida
 * tomorrow. Arranged with the service role: one dono creates a Grupo per test,
 * more than the 5 criar_grupo allows an account.
 */
async function fut() {
  const { data: grupo } = await service()
    .from("grupos")
    .insert({ slug: `locks-${randomUUID().slice(0, 8)}`, nome: "Fut dos Locks", criado_por: dono.id })
    .select("id")
    .single()
    .throwOnError();
  await service().from("grupo_membros").insert({ grupo_id: grupo!.id, user_id: dono.id, papel: "dono" }).throwOnError();
  await addMembro(grupo!.id, admin, "admin");
  await addMembro(grupo!.id, membro, "membro");
  const { data: jogador } = await addJogador(dono, grupo!.id, "Travado");
  await service().from("players").update({ conta_id: membro.id }).eq("id", jogador!.id).throwOnError();
  const { data: partida } = await dono.client
    .from("partidas")
    .insert({
      grupo_id: grupo!.id,
      inicio: new Date(Date.now() + 86_400_000).toISOString(),
      local: "Quadra",
      vagas: 10,
    })
    .select("id")
    .single()
    .throwOnError();
  return { grupo: grupo!.id as string, jogador: jogador!.id as string, partida: partida!.id as string };
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
      mover_no_sorteio: deFora.client.rpc("mover_no_sorteio", {
        partida,
        jogador,
        para_time: 1,
        sorteado_em: new Date().toISOString(),
      }),
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
    // sends its own event. excluir_jogador takes the Partida first (#108), but a delete
    // outside it, such as the service role's, must not queue for it here.
    await db.query("begin");
    await db.query("select 1 from public.partidas where id = $1 for update", [partida]);

    const { error } = await semEsperar(service().from("players").delete().eq("id", jogador));
    expect(error).toBeNull();
  });
});

/*
 * 20261125000000_ordem_ao_excluir_e_vincular.sql. Two calls race here, so
 * each runs on a direct connection of its own: they must reach Postgres at
 * the same time, not queue behind each other in PostgREST.
 */
describe("a link can't land while its person is being removed (#109)", () => {
  it("linking a Jogador waits for the removal and is then refused", async () => {
    const { grupo } = await fut();
    const { data: solto } = await addJogador(dono, grupo, "Solto");
    // The removal, not yet committed: it holds the Grupo's lock.
    await abrirComo(db, dono);
    await db.query("select public.remover_do_grupo($1, $2)", [grupo, admin.id]);

    const vinculo = agora(admin.client.rpc("vincular_jogador", { jogador: solto!.id }));
    await esperarTravados(db, [segura]);
    await db.query("commit");

    expect((await vinculo).error?.hint).toBe("nao-membro");
    const { data } = await service().from("players").select("conta_id").eq("id", solto!.id).single();
    expect(data?.conta_id).toBeNull();
  });

  it("adding one's own Jogador waits for the removal and is then refused", async () => {
    const { grupo } = await fut();
    await abrirComo(db, dono);
    await db.query("select public.remover_do_grupo($1, $2)", [grupo, admin.id]);

    const criado = agora(admin.client.rpc("criar_meu_jogador", { grupo, nome: "Eu Mesmo", posicao: "ALA" }));
    await esperarTravados(db, [segura]);
    await db.query("commit");

    expect((await criado).error?.hint).toBe("nao-membro");
    const { data } = await service().from("players").select("id").eq("grupo_id", grupo).eq("conta_id", admin.id);
    expect(data).toEqual([]);
  });

  it("a link made first is undone by the removal that waited for it", async () => {
    const { grupo } = await fut();
    const { data: solto } = await addJogador(dono, grupo, "Solto");
    await abrirComo(db, admin);
    await db.query("select public.vincular_jogador($1)", [solto!.id]);

    const remocao = agora(dono.client.rpc("remover_do_grupo", { grupo, pessoa: admin.id }));
    await esperarTravados(db, [segura]);
    await db.query("commit");

    expect((await remocao).error).toBeNull();
    const { data } = await service().from("players").select("conta_id").eq("id", solto!.id).single();
    expect(data?.conta_id).toBeNull();
  });

  it("someone outside the fut doesn't queue behind a locked Grupo", async () => {
    const { grupo, jogador } = await fut();
    await db.query("begin");
    await db.query("select 1 from public.grupos where id = $1 for update", [grupo]);

    expect((await semEsperar(deFora.client.rpc("vincular_jogador", { jogador }))).error?.hint).toBe("nao-membro");
    const criado = await semEsperar(deFora.client.rpc("criar_meu_jogador", { grupo, nome: "Intruso", posicao: "ALA" }));
    expect(criado.error?.hint).toBe("nao-membro");
  });
});

describe("deleting a Jogador takes their Partidas before the Jogador (#108)", () => {
  let um: pg.Client;
  let outro: pg.Client;
  let pidDoUm: number;

  beforeAll(async () => {
    [um, outro] = await Promise.all([conexaoDireta(), conexaoDireta()]);
    pidDoUm = await pidDe(um);
  });

  afterAll(async () => {
    await Promise.all([um.end(), outro.end()]);
  });

  /** The Partida locked by the test's own connection, so the calls line up behind it. */
  async function travar(partida: string) {
    await db.query("begin");
    await db.query("select 1 from public.partidas where id = $1 for update", [partida]);
  }

  it("an answer that got there first finishes, then the delete", async () => {
    const { grupo, partida, jogador } = await fut();
    await membro.client.rpc("responder_presenca", { partida, jogador, vou: true }).throwOnError();
    await travar(partida);

    // Waits for the Partida. Before #108 it then waited for the Jogador's
    // presence, which the delete held while it waited for the Partida.
    const resposta = chamarComo(um, membro, "select public.responder_presenca($1, $2, false)", [partida, jogador]);
    await esperarTravados(db, [segura]);
    const exclusao = chamarComo(outro, dono, "select public.excluir_jogador($1, $2)", [grupo, jogador]);
    await esperarTravados(db, [segura, pidDoUm], 2);
    await db.query("commit");

    expect((await resposta).error).toBeNull();
    expect((await exclusao).error).toBeNull();
    const { data } = await service().from("presencas").select("jogador_id").eq("partida_id", partida);
    expect(data).toEqual([]);
  });

  it("a delete that got there first finishes, then the answer is told the Jogador is gone", async () => {
    const { grupo, partida, jogador } = await fut();
    await membro.client.rpc("responder_presenca", { partida, jogador, vou: true }).throwOnError();
    await travar(partida);

    const exclusao = chamarComo(um, dono, "select public.excluir_jogador($1, $2)", [grupo, jogador]);
    await esperarTravados(db, [segura]);
    const resposta = chamarComo(outro, membro, "select public.responder_presenca($1, $2, false)", [partida, jogador]);
    await esperarTravados(db, [segura, pidDoUm], 2);
    await db.query("commit");

    expect((await exclusao).error).toBeNull();
    expect((await resposta).error?.hint).toBe("jogador-de-fora");
  });

  it("the delete still frees the vaga for the first in line", async () => {
    const { grupo, partida, jogador } = await fut();
    await service().from("partidas").update({ vagas: 2 }).eq("id", partida).throwOnError();
    const { data: confirmado } = await addJogador(dono, grupo, "Confirmado");
    const { data: esperando } = await addJogador(dono, grupo, "Na Espera");
    for (const quem of [jogador, confirmado!.id, esperando!.id]) {
      await dono.client.rpc("responder_presenca", { partida, jogador: quem, vou: true }).throwOnError();
    }

    await dono.client.rpc("excluir_jogador", { grupo, jogador }).throwOnError();

    const { data } = await service().from("presencas").select("situacao").eq("jogador_id", esperando!.id).single();
    expect(data?.situacao).toBe("confirmado");
  });

  it("deleting the fut while someone answers doesn't deadlock either", async () => {
    const { grupo, partida, jogador } = await fut();
    await travar(partida);

    const resposta = chamarComo(um, membro, "select public.responder_presenca($1, $2, true)", [partida, jogador]);
    await esperarTravados(db, [segura]);
    const exclusao = chamarComo(outro, dono, "select public.excluir_grupo($1, $2)", [grupo, "Fut dos Locks"]);
    await esperarTravados(db, [segura, pidDoUm], 2);
    await db.query("commit");

    expect((await resposta).error).toBeNull();
    expect((await exclusao).error).toBeNull();
    const { data } = await service().from("grupos").select("id").eq("id", grupo);
    expect(data).toEqual([]);
  });

  it("only the dono and admins delete, and only their own fut's Jogadores", async () => {
    const { grupo, jogador } = await fut();
    const outroFut = await fut();

    expect((await membro.client.rpc("excluir_jogador", { grupo, jogador })).error?.hint).toBe("sem-permissao");
    expect((await deFora.client.rpc("excluir_jogador", { grupo, jogador })).error?.hint).toBe("sem-permissao");
    // The dono's own fut, a Jogador of another one.
    const { error } = await dono.client.rpc("excluir_jogador", { grupo, jogador: outroFut.jogador });
    expect(error?.hint).toBe("sem-permissao");

    const { data: excluido } = await admin.client.rpc("excluir_jogador", { grupo, jogador }).throwOnError();
    expect(excluido?.id).toBe(jogador);
  });
});
