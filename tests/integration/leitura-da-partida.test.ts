import { afterEach, describe, expect, it } from "vitest";
import { lerHistorico, lerPartida } from "@/lib/leitura-da-partida";
import { addJogador, addMembro, admin as service, newUser, removeUsers, type TestUser } from "./support";

let users: TestUser[] = [];
const user = async (label: string) => {
  const u = await newUser(label);
  users.push(u);
  return u;
};

afterEach(async () => {
  await removeUsers(...users);
  users = [];
});

const horas = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

async function grupoCom(dono: TestUser) {
  const { data, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut da Leitura" });
  if (error) throw error;
  return data.id as string;
}

async function jogador(dono: TestUser, grupoId: string, nome: string) {
  const { data, error } = await addJogador(dono, grupoId, nome);
  if (error) throw error;
  return data!.id as string;
}

async function partida(dono: TestUser, grupoId: string) {
  const { data } = await dono.client
    .from("partidas")
    .insert({ grupo_id: grupoId, inicio: horas(24), local: "Quadra", vagas: 10 })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

const confirmar = async (dono: TestUser, partidaId: string, ...jogadores: string[]) => {
  for (const j of jogadores) await dono.client.rpc("responder_presenca", { partida: partidaId, jogador: j, vou: true }).throwOnError();
};
const sortear = (dono: TestUser, partidaId: string, times: string[][]) =>
  dono.client.rpc("salvar_sorteio", { partida: partidaId, times }).throwOnError();
/** Moves a Partida's start, as if time had passed. */
const comecouHa = (partidaId: string, h: number) =>
  service().from("partidas").update({ inicio: horas(-h) }).eq("id", partidaId).throwOnError();

describe("lerPartida", () => {
  it("gives the dono the draft Sorteio, a membro only a published one, and an outsider nothing", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const membro = await user("membro");
    await addMembro(grupoId, membro, "membro");
    const deFora = await user("de-fora");
    const [ana, bia] = [await jogador(dono, grupoId, "Ana"), await jogador(dono, grupoId, "Bia")];
    const id = await partida(dono, grupoId);
    await confirmar(dono, id, ana, bia);
    await sortear(dono, id, [[ana], [bia]]);

    const doDono = await lerPartida(dono.client, grupoId, id);
    expect(doDono?.partida).toMatchObject({ id, grupo_id: grupoId, local: "Quadra", vagas: 10, cancelada_em: null });
    expect(doDono?.presencas.map((p) => p.situacao)).toEqual(["confirmado", "confirmado"]);
    expect(doDono?.jogadores.map((j) => j.name)).toEqual(["Ana", "Bia"]);
    expect(doDono?.sorteio?.publicado_em).toBeNull();

    expect((await lerPartida(membro.client, grupoId, id))?.sorteio).toBeNull();
    await dono.client.rpc("publicar_sorteio", { partida: id }).throwOnError();
    expect((await lerPartida(membro.client, grupoId, id))?.sorteio?.times).toHaveLength(2);

    expect(await lerPartida(deFora.client, grupoId, id)).toBeNull();
    // The Partida exists, but not in the Grupo asked for.
    const outroGrupo = await grupoCom(deFora);
    expect(await lerPartida(dono.client, outroGrupo, id)).toBeNull();
  });
});

describe("lerHistorico", () => {
  it("lists Partidas newest first with who played, only published Times, and Frequência from highest", async () => {
    const dono = await user("dono");
    const grupoId = await grupoCom(dono);
    const [bia, ana, caio] = [await jogador(dono, grupoId, "Bia"), await jogador(dono, grupoId, "Ana"), await jogador(dono, grupoId, "Caio")];
    // They've been in the Elenco for days, so the Partidas below count for them.
    await service().from("players").update({ created_at: horas(-72) }).in("id", [bia, ana, caio]).throwOnError();

    const p1 = await partida(dono, grupoId);
    await confirmar(dono, p1, bia, ana);
    await sortear(dono, p1, [[bia], [ana]]);
    await dono.client.rpc("publicar_sorteio", { partida: p1 }).throwOnError();
    await comecouHa(p1, 48);

    const p2 = await partida(dono, grupoId);
    await confirmar(dono, p2, ana, caio);
    await sortear(dono, p2, [[ana], [caio]]); // a draft: never in the history
    await comecouHa(p2, 24);

    const cancelada = await partida(dono, grupoId);
    await confirmar(dono, cancelada, caio);
    await dono.client.from("partidas").update({ cancelada_em: horas(0) }).eq("id", cancelada).throwOnError();
    await comecouHa(cancelada, 12);

    const proxima = await partida(dono, grupoId);
    // Joined today: no Partida to count yet, so not in the Frequência.
    await jogador(dono, grupoId, "Zuca");

    const { partidas, frequencia } = await lerHistorico(dono.client, grupoId);

    expect(partidas.map((p) => p.id)).toEqual([proxima, cancelada, p2, p1]);
    const porId = new Map(partidas.map((p) => [p.id, p]));
    expect(porId.get(p1)).toMatchObject({
      confirmados: 2,
      quemFoi: ["Ana", "Bia"],
      times: [
        { nome: "Time 1", jogadores: ["Bia"] },
        { nome: "Time 2", jogadores: ["Ana"] },
      ],
    });
    expect(porId.get(p2)).toMatchObject({ quemFoi: ["Ana", "Caio"], times: null });
    expect(porId.get(proxima)).toMatchObject({ confirmados: 0, quemFoi: [], times: null });

    expect(frequencia).toEqual([
      { nome: "Ana", partidas: 2, presencas: 2, frequencia: 100 },
      { nome: "Bia", partidas: 2, presencas: 1, frequencia: 50 },
      { nome: "Caio", partidas: 2, presencas: 1, frequencia: 50 },
    ]);
  });
});
