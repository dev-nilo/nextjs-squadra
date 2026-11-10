import { afterEach, describe, expect, it } from "vitest";
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

/** A Grupo with a dono, an admin and a membro, and two Jogadores with no account. */
async function fut() {
  const dono = await user("dono");
  const adminDoFut = await user("admin");
  const membro = await user("membro");
  const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut dos Vínculos" });
  if (error) throw error;
  await addMembro(grupo.id, adminDoFut, "admin");
  await addMembro(grupo.id, membro, "membro");
  const { data: zagueiro } = await addJogador(dono, grupo.id, "Zagueiro");
  const { data: atacante } = await addJogador(dono, grupo.id, "Atacante");
  return { grupoId: grupo.id as string, dono, adminDoFut, membro, zagueiroId: zagueiro!.id as string, atacanteId: atacante!.id as string };
}

const vincular = (quem: TestUser, jogador: string) => quem.client.rpc("vincular_jogador", { jogador });
const contaDe = async (jogador: string) =>
  (await service().from("players").select("conta_id").eq("id", jogador).single()).data?.conta_id ?? null;

describe("sou esse aqui", () => {
  it("a membro links their account to a Jogador with none", async () => {
    const { membro, zagueiroId } = await fut();
    const { error } = await vincular(membro, zagueiroId);
    expect(error).toBeNull();
    expect(await contaDe(zagueiroId)).toBe(membro.id);
  });

  it("linking the same Jogador again is a no-op", async () => {
    const { membro, zagueiroId } = await fut();
    await vincular(membro, zagueiroId);
    expect((await vincular(membro, zagueiroId)).error).toBeNull();
  });

  it("nobody takes a Jogador already linked to someone else", async () => {
    const { membro, adminDoFut, zagueiroId } = await fut();
    await vincular(membro, zagueiroId);
    const { error } = await vincular(adminDoFut, zagueiroId);
    expect(error?.hint).toBe("ja-vinculado");
    expect(await contaDe(zagueiroId)).toBe(membro.id);
  });

  it("one Jogador per account per Grupo", async () => {
    const { membro, zagueiroId, atacanteId } = await fut();
    await vincular(membro, zagueiroId);
    const { error } = await vincular(membro, atacanteId);
    expect(error?.hint).toBe("ja-tem-jogador");
    expect(await contaDe(atacanteId)).toBeNull();
  });

  it("someone outside the Grupo can't link, and learns nothing", async () => {
    const { zagueiroId } = await fut();
    const deFora = await user("fora");
    const { data, error } = await vincular(deFora, zagueiroId);
    expect(error?.hint).toBe("nao-membro");
    expect(data).toBeNull();
  });
});

describe("não estou na lista", () => {
  it("a membro adds themselves with the default attributes, already linked", async () => {
    const { grupoId, membro } = await fut();
    const { data, error } = await membro.client.rpc("criar_meu_jogador", { grupo: grupoId, nome: "  Novato  ", posicao: "ALA" });
    expect(error).toBeNull();
    expect(data).toMatchObject({ name: "Novato", position: "ALA", ovr: 60, velocidade: 60, conta_id: membro.id, user_id: membro.id });
  });

  it("refuses a second Jogador for the same account, a bad position or a blank name", async () => {
    const { grupoId, membro } = await fut();
    await membro.client.rpc("criar_meu_jogador", { grupo: grupoId, nome: "Primeiro", posicao: "ATA" });

    expect((await membro.client.rpc("criar_meu_jogador", { grupo: grupoId, nome: "Segundo", posicao: "ATA" })).error?.hint).toBe("ja-tem-jogador");
    const outro = await user("outro");
    await addMembro(grupoId, outro, "membro");
    expect((await outro.client.rpc("criar_meu_jogador", { grupo: grupoId, nome: "X", posicao: "PIVO" })).error).not.toBeNull();
    expect((await outro.client.rpc("criar_meu_jogador", { grupo: grupoId, nome: "   ", posicao: "ALA" })).error).not.toBeNull();
  });

  it("someone outside the Grupo can't add themselves", async () => {
    const { grupoId } = await fut();
    const deFora = await user("fora");
    const { error } = await deFora.client.rpc("criar_meu_jogador", { grupo: grupoId, nome: "Penetra", posicao: "ALA" });
    expect(error?.hint).toBe("nao-membro");
  });
});

describe("nobody sets conta_id directly", () => {
  it("not on insert, even an admin", async () => {
    const { grupoId, adminDoFut, membro } = await fut();
    const { error } = await addJogador(adminDoFut, grupoId, "Forjado", { conta_id: membro.id });
    expect(error).not.toBeNull();
  });

  it("not on update, even the dono", async () => {
    const { dono, membro, zagueiroId } = await fut();
    const { error } = await dono.client.from("players").update({ conta_id: membro.id }).eq("id", zagueiroId);
    expect(error).not.toBeNull();
    expect(await contaDe(zagueiroId)).toBeNull();
  });
});

describe("unlinking", () => {
  it("an admin unlinks anyone's Jogador, which stays in the Elenco", async () => {
    const { adminDoFut, membro, zagueiroId } = await fut();
    await vincular(membro, zagueiroId);
    const { error } = await adminDoFut.client.rpc("desvincular_jogador", { jogador: zagueiroId });
    expect(error).toBeNull();
    const { data } = await service().from("players").select("name, conta_id").eq("id", zagueiroId).single();
    expect(data).toEqual({ name: "Zagueiro", conta_id: null });
  });

  it("the linked person unlinks themselves; another membro can't", async () => {
    const { grupoId, membro, zagueiroId } = await fut();
    const outro = await user("outro");
    await addMembro(grupoId, outro, "membro");
    await vincular(membro, zagueiroId);

    expect((await outro.client.rpc("desvincular_jogador", { jogador: zagueiroId })).error?.hint).toBe("sem-permissao");
    expect(await contaDe(zagueiroId)).toBe(membro.id);

    expect((await membro.client.rpc("desvincular_jogador", { jogador: zagueiroId })).error).toBeNull();
    expect(await contaDe(zagueiroId)).toBeNull();
  });

  it("someone outside the Grupo gets nothing back, linked or not", async () => {
    const { zagueiroId } = await fut();
    const deFora = await user("fora");
    const { data, error } = await deFora.client.rpc("desvincular_jogador", { jogador: zagueiroId });
    expect(error?.hint).toBe("sem-permissao");
    expect(data).toBeNull();
  });

  it("deleting the account unlinks its Jogador", async () => {
    const { membro, zagueiroId } = await fut();
    await vincular(membro, zagueiroId);
    await service().auth.admin.deleteUser(membro.id);
    users = users.filter((u) => u.id !== membro.id);
    expect(await contaDe(zagueiroId)).toBeNull();
  });
});
