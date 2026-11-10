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

/** A Grupo with a dono, an admin, a membro and someone outside it, plus one Jogador by the dono. */
async function fut() {
  const dono = await user("dono");
  const admin = await user("admin");
  const membro = await user("membro");
  const deFora = await user("fora");
  const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut dos Papéis" });
  if (error) throw error;
  await addMembro(grupo.id, admin, "admin");
  await addMembro(grupo.id, membro, "membro");
  const { data: jogador } = await addJogador(dono, grupo.id, "Craque do Dono");
  return { grupo: grupo as { id: string }, dono, admin, membro, deFora, jogadorId: jogador!.id as string };
}

const elenco = (who: TestUser, grupoId: string) =>
  who.client.from("players").select("name").eq("grupo_id", grupoId).order("name");

describe("who reads a Grupo's Elenco", () => {
  it("every Membro reads every Jogador, whoever created it", async () => {
    const { grupo, dono, admin, membro } = await fut();
    await addJogador(admin, grupo.id, "Craque do Admin");

    for (const quem of [dono, admin, membro]) {
      const { data } = await elenco(quem, grupo.id);
      expect(data).toEqual([{ name: "Craque do Admin" }, { name: "Craque do Dono" }]);
    }
  });

  it("someone outside the Grupo reads nothing", async () => {
    const { grupo, deFora } = await fut();
    const { data } = await elenco(deFora, grupo.id);
    expect(data).toEqual([]);
  });

  it("a Membro who leaves stops reading, even the Jogadores they created", async () => {
    const { grupo, admin } = await fut();
    await addJogador(admin, grupo.id, "Craque do Admin");

    await admin.client.from("grupo_membros").delete().eq("grupo_id", grupo.id).eq("user_id", admin.id);

    const { data } = await elenco(admin, grupo.id);
    expect(data).toEqual([]);
  });
});

describe("who writes a Grupo's Elenco", () => {
  it("an admin creates, edits and deletes Jogadores, including the dono's", async () => {
    const { grupo, admin, jogadorId } = await fut();

    const criado = await addJogador(admin, grupo.id, "Novo do Admin");
    expect(criado.error).toBeNull();

    const editado = await admin.client.from("players").update({ name: "Editado pelo Admin" }).eq("id", jogadorId).select("name, user_id");
    expect(editado.data?.[0]?.name).toBe("Editado pelo Admin");

    const apagado = await admin.client.from("players").delete().eq("id", jogadorId).select("id");
    expect(apagado.data).toEqual([{ id: jogadorId }]);
  });

  it("a membro reads but can't create, edit or delete", async () => {
    const { grupo, membro, jogadorId } = await fut();

    const criado = await addJogador(membro, grupo.id, "Do Membro");
    expect(criado.error).not.toBeNull();

    const editado = await membro.client.from("players").update({ name: "Golpe" }).eq("id", jogadorId).select("id");
    expect(editado.data ?? []).toEqual([]);

    const apagado = await membro.client.from("players").delete().eq("id", jogadorId).select("id");
    expect(apagado.data).toEqual([]);
  });

  it("an admin made membro loses write access to the Jogadores they created", async () => {
    const { grupo, dono, admin } = await fut();
    const { data: dele } = await addJogador(admin, grupo.id, "Do Ex-Admin");
    await dono.client.from("grupo_membros").update({ papel: "membro" }).eq("grupo_id", grupo.id).eq("user_id", admin.id);

    await admin.client.from("players").update({ name: "Ainda Mando" }).eq("id", dele!.id);
    await admin.client.from("players").delete().eq("id", dele!.id);

    const { data } = await service().from("players").select("name").eq("id", dele!.id).single();
    expect(data?.name).toBe("Do Ex-Admin");
  });

  it("nobody rewrites who created a Jogador", async () => {
    const { dono, admin, jogadorId } = await fut();

    const { error } = await admin.client.from("players").update({ user_id: admin.id }).eq("id", jogadorId);
    expect(error).not.toBeNull();

    const { data } = await service().from("players").select("user_id").eq("id", jogadorId).single();
    expect(data?.user_id).toBe(dono.id);
  });

  it("nobody creates a Jogador in someone else's name", async () => {
    const { grupo, dono, admin } = await fut();
    const { error } = await admin.client
      .from("players")
      .insert({ user_id: dono.id, grupo_id: grupo.id, name: "Forjado", position: "ALA", nationality: "BR" });
    expect(error).not.toBeNull();
  });
});

describe("when an author deletes their account", () => {
  it("their Jogadores stay in the Grupo, without an author", async () => {
    const { grupo, admin, dono } = await fut();
    const { data: dele } = await addJogador(admin, grupo.id, "Fica no Fut");

    await service().auth.admin.deleteUser(admin.id);
    users = users.filter((u) => u.id !== admin.id);

    const { data } = await dono.client.from("players").select("name, user_id").eq("id", dele!.id).single();
    expect(data).toEqual({ name: "Fica no Fut", user_id: null });
  });
});
