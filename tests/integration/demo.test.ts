import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin as service, anon } from "./support";

const CONTA_DEMO = "dede0000-0000-4000-8000-000000000001";
const GRUPO_DEMO = "dede0000-0000-4000-8000-000000000002";
const FUT_DO_DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type Cliente = ReturnType<typeof anon>;

/** Signs in the way the app does: a one-time link generated and used on the server. */
async function entrarComoDemo(): Promise<Cliente> {
  const { data, error } = await service().auth.admin.generateLink({ type: "magiclink", email: "demo@example.com" });
  if (error) throw error;
  const client = anon();
  const { error: erroDaSessao } = await client.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  if (erroDaSessao) throw erroDaSessao;
  return client;
}

async function entrarComoDev(): Promise<Cliente> {
  const client = anon();
  const { error } = await client.auth.signInWithPassword({ email: "dev@squadra.test", password: "squadra-dev-123" });
  if (error) throw error;
  return client;
}

const resetar = () => service().rpc("resetar_demo").throwOnError();

async function partidasDaDemo(client: Cliente) {
  const { data } = await client.from("partidas").select("id, inicio").eq("grupo_id", GRUPO_DEMO).is("cancelada_em", null).throwOnError();
  const agora = Date.now();
  return {
    passadas: data!.filter((p) => new Date(p.inicio).getTime() < agora),
    abertas: data!.filter((p) => new Date(p.inicio).getTime() > agora),
  };
}

let demo: Cliente;
beforeAll(async () => {
  await resetar();
  demo = await entrarComoDemo();
});
// Leave the demo the way the seed left it, for the E2E run.
afterAll(resetar);

describe("the demo Grupo after a reset", () => {
  it("has an Elenco, past Partidas with published Times and an open Partida half answered", async () => {
    const { data: grupos } = await demo.from("grupos").select("id, slug, nome");
    expect(grupos).toEqual([{ id: GRUPO_DEMO, slug: "demo", nome: "Pelada da Firma" }]);

    const { data: elenco } = await demo.from("players").select("id").eq("grupo_id", GRUPO_DEMO);
    expect(elenco).toHaveLength(16);

    const { passadas, abertas } = await partidasDaDemo(demo);
    expect(passadas).toHaveLength(4);
    expect(abertas).toHaveLength(1);

    const { data: sorteios } = await demo.from("sorteios").select("partida_id, publicado_em, times").in("partida_id", passadas.map((p) => p.id));
    expect(sorteios).toHaveLength(4);
    for (const s of sorteios!) {
      expect(s.publicado_em).not.toBeNull();
      expect(s.times).toHaveLength(2);
      const { count } = await demo.from("presencas").select("jogador_id", { count: "exact", head: true }).eq("partida_id", s.partida_id).eq("situacao", "confirmado");
      const escalados = (s.times as { jogadores: unknown[] }[]).reduce((n, t) => n + t.jogadores.length, 0);
      expect(escalados).toBe(count);
    }

    const { data: respostas } = await demo.from("presencas").select("situacao").eq("partida_id", abertas[0].id);
    expect(respostas!.filter((r) => r.situacao === "confirmado")).toHaveLength(9);
    expect(respostas!.filter((r) => r.situacao === "nao_vou")).toHaveLength(2);
    expect((await demo.from("sorteios").select("partida_id").eq("partida_id", abertas[0].id)).data).toEqual([]);
  });

  it("gives the Frequência a spread to show", async () => {
    const { data: linhas } = await demo.from("frequencia_jogadores").select("jogador_id, frequencia").eq("grupo_id", GRUPO_DEMO);
    const { data: jogadores } = await demo.from("players").select("id, name").eq("grupo_id", GRUPO_DEMO);
    const nome = new Map(jogadores!.map((j) => [j.id, j.name]));
    const porNome = Object.fromEntries(linhas!.map((l) => [nome.get(l.jogador_id), l.frequencia]));
    expect(porNome).toMatchObject({ Capitão: 100, Xerifão: 75, Ligeirinho: 50, "Pé Torto": 25 });
  });

  it("comes back the same after visitors mess with it", async () => {
    const { data: elenco } = await demo.from("players").select("id").eq("grupo_id", GRUPO_DEMO);
    await demo.from("players").delete().eq("id", elenco![0].id).throwOnError();
    await demo.from("grupos").update({ nome: "Bagunçado" }).eq("id", GRUPO_DEMO).throwOnError();
    const { abertas } = await partidasDaDemo(demo);
    await demo.from("partidas").update({ cancelada_em: new Date().toISOString() }).eq("id", abertas[0].id).throwOnError();

    await resetar();

    expect((await demo.from("players").select("id").eq("grupo_id", GRUPO_DEMO)).data).toHaveLength(16);
    expect((await demo.from("grupos").select("nome").eq("id", GRUPO_DEMO).single()).data?.nome).toBe("Pelada da Firma");
    expect((await partidasDaDemo(demo)).abertas).toHaveLength(1);
  });
});

describe("what the demo can do", () => {
  it("plays like a dono: answers for a Jogador in the open Partida", async () => {
    const { abertas } = await partidasDaDemo(demo);
    const { data: zaga } = await demo.from("players").select("id").eq("grupo_id", GRUPO_DEMO).eq("name", "Zaga Seca").single();
    const { error } = await demo.rpc("responder_presenca", { partida: abertas[0].id, jogador: zaga!.id, vou: true });
    expect(error).toBeNull();
    await resetar();
  });
});

describe("what the demo can't do", () => {
  it("sees nothing of another Grupo and writes nothing into one", async () => {
    expect((await demo.from("grupos").select("id").eq("id", FUT_DO_DEV)).data).toEqual([]);
    expect((await demo.from("players").select("id").eq("grupo_id", FUT_DO_DEV)).data).toEqual([]);
    expect((await demo.from("partidas").select("id").eq("grupo_id", FUT_DO_DEV)).data).toEqual([]);
    expect((await demo.from("frequencia_jogadores").select("jogador_id").eq("grupo_id", FUT_DO_DEV)).data).toEqual([]);
    const intruso = await demo.from("players").insert({ grupo_id: FUT_DO_DEV, name: "Intruso", position: "ALA" });
    expect(intruso.error).not.toBeNull();
  });

  it("can't create a Grupo, join one through an invite, or invite anyone", async () => {
    const criar = await demo.rpc("criar_grupo", { nome_do_grupo: "Fut paralelo" });
    expect(criar.error?.hint).toBe("demo");
    // The whole call rolled back: no orphan Grupo left behind.
    expect((await service().from("grupos").select("id").eq("nome", "Fut paralelo")).data).toEqual([]);

    const dev = await entrarComoDev();
    const { data: convite } = await dev.from("convites").insert({ grupo_id: FUT_DO_DEV }).select("id, token").single().throwOnError();
    try {
      expect((await demo.rpc("aceitar_convite", { token_do_convite: convite!.token })).error?.hint).toBe("demo");
    } finally {
      await service().from("convites").delete().eq("id", convite!.id);
    }

    expect((await demo.from("convites").insert({ grupo_id: GRUPO_DEMO })).error).not.toBeNull();
  });

  it("nobody else joins the demo Grupo, not even arranged with the service role", async () => {
    const { error } = await service().from("grupo_membros").insert({ grupo_id: GRUPO_DEMO, user_id: "11111111-1111-4111-8111-111111111111", papel: "membro" });
    expect(error?.hint).toBe("demo");
  });

  it("can't delete its Grupo", async () => {
    const { data } = await demo.from("grupos").delete().eq("id", GRUPO_DEMO).select("id");
    expect(data ?? []).toEqual([]);
    expect((await service().from("grupos").select("id").eq("id", GRUPO_DEMO)).data).toHaveLength(1);
  });

  it("keeps its email and gets no password", async () => {
    expect((await demo.auth.updateUser({ password: "uma-senha-qualquer-123" })).error).not.toBeNull();
    expect((await demo.auth.updateUser({ email: "outro@example.com" })).error).not.toBeNull();
    const { data } = await service().auth.admin.getUserById(CONTA_DEMO);
    expect(data.user?.email).toBe("demo@example.com");
    expect(data.user?.new_email).toBeFalsy(); // not even a pending change
    expect((await anon().auth.signInWithPassword({ email: "demo@example.com", password: "uma-senha-qualquer-123" })).error).not.toBeNull();
  });

  it("uploads no photos to the public bucket", async () => {
    const png = new Blob([Uint8Array.from([137, 80, 78, 71])], { type: "image/png" });
    const { error } = await demo.storage.from("player-images").upload(`${GRUPO_DEMO}/demo-test.png`, png, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("can't reset itself: only the server can", async () => {
    expect((await demo.rpc("resetar_demo")).error).not.toBeNull();
    expect((await anon().rpc("resetar_demo")).error).not.toBeNull();
  });
});
