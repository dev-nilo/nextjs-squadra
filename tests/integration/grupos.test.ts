import { afterEach, describe, expect, it } from "vitest";
import { addJogador, addMembro, anon, newUser, removeUsers, type TestUser } from "./support";

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

async function criarGrupo(owner: TestUser, nome: string) {
  const { data, error } = await owner.client.rpc("criar_grupo", { nome_do_grupo: nome });
  if (error) throw error;
  return data as { id: string; slug: string; nome: string };
}

describe("criar_grupo", () => {
  it("makes the caller dono and moves their Jogadores without a Grupo into it", async () => {
    const nilo = await user("nilo");
    const antes = await addJogador(nilo, "Jogador Antigo");
    expect(antes.data?.grupo_id).toBeNull();

    const grupo = await criarGrupo(nilo, "Fut do Nilo");

    expect(grupo.nome).toBe("Fut do Nilo");
    expect(grupo.slug).toMatch(/^fut-do-nilo(-\d+)?$/);
    const { data: membros } = await nilo.client.from("grupo_membros").select("user_id, papel").eq("grupo_id", grupo.id);
    expect(membros).toEqual([{ user_id: nilo.id, papel: "dono" }]);
    const { data: jogador } = await nilo.client.from("players").select("grupo_id").eq("id", antes.data!.id).single();
    expect(jogador?.grupo_id).toBe(grupo.id);
  });

  it("does not move Jogadores that already belong to a Grupo", async () => {
    const nilo = await user("nilo");
    const primeiro = await criarGrupo(nilo, "Primeiro");
    const jogador = await addJogador(nilo, "Já no Primeiro");
    expect(jogador.data?.grupo_id).toBe(primeiro.id);

    await criarGrupo(nilo, "Segundo");

    const { data } = await nilo.client.from("players").select("grupo_id").eq("id", jogador.data!.id).single();
    expect(data?.grupo_id).toBe(primeiro.id);
  });

  it("keeps slugs unique when two Grupos share a name", async () => {
    const nilo = await user("nilo");
    const nome = `Pelada ${Date.now()}`;
    const a = await criarGrupo(nilo, nome);
    const b = await criarGrupo(nilo, nome);
    expect(b.slug).toBe(`${a.slug}-2`);
  });

  it("strips accents and symbols from the slug", async () => {
    const nilo = await user("nilo");
    const grupo = await criarGrupo(nilo, `  Fut de Sábado à Noite! ${Date.now()}  `);
    expect(grupo.slug).toMatch(/^fut-de-sabado-a-noite-\d+$/);
    expect(grupo.nome).toMatch(/^Fut de Sábado à Noite! \d+$/);
  });

  it("rejects blank names and names over 60 characters", async () => {
    const nilo = await user("nilo");
    for (const nome of ["   ", "x".repeat(61)]) {
      const { error } = await nilo.client.rpc("criar_grupo", { nome_do_grupo: nome });
      expect(error?.message).toContain("entre 1 e 60");
    }
  });

  it("is not callable without signing in", async () => {
    const { error } = await anon().rpc("criar_grupo", { nome_do_grupo: "Fut Anônimo" });
    expect(error).not.toBeNull();
  });

  it("is the only way in: users cannot insert Grupos or Membros directly", async () => {
    const nilo = await user("nilo");
    const intruso = await user("intruso");
    const grupo = await criarGrupo(nilo, "Fut Fechado");

    const direto = await intruso.client.from("grupos").insert({ slug: `fake-${Date.now()}`, nome: "Fake" });
    expect(direto.error).not.toBeNull();
    const entrar = await intruso.client.from("grupo_membros").insert({ grupo_id: grupo.id, user_id: intruso.id });
    expect(entrar.error).not.toBeNull();
  });
});

describe("who sees a Grupo", () => {
  it("hides a Grupo and its Membros from non-members", async () => {
    const nilo = await user("nilo");
    const intruso = await user("intruso");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");

    const { data: grupos } = await intruso.client.from("grupos").select("id").eq("id", grupo.id);
    expect(grupos).toEqual([]);
    const { data: membros } = await intruso.client.from("grupo_membros").select("user_id").eq("grupo_id", grupo.id);
    expect(membros).toEqual([]);
  });

  it("shows the Grupo and its Membros to a membro", async () => {
    const nilo = await user("nilo");
    const amigo = await user("amigo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, amigo, "membro");

    const { data: grupos } = await amigo.client.from("grupos").select("nome").eq("id", grupo.id);
    expect(grupos).toEqual([{ nome: "Fut do Nilo" }]);
    const { data: membros } = await amigo.client.from("grupo_membros").select("user_id").eq("grupo_id", grupo.id);
    expect(membros?.map((m) => m.user_id).sort()).toEqual([nilo.id, amigo.id].sort());
  });
});

describe("renaming and deleting a Grupo", () => {
  it("lets only the dono rename, and the slug stays put", async () => {
    const nilo = await user("nilo");
    const admin = await user("admin");
    const grupo = await criarGrupo(nilo, "Nome Antigo");
    await addMembro(grupo.id, admin, "admin");

    const porAdmin = await admin.client.from("grupos").update({ nome: "Golpe" }).eq("id", grupo.id).select("id");
    expect(porAdmin.data).toEqual([]);

    const porDono = await nilo.client.from("grupos").update({ nome: "Nome Novo" }).eq("id", grupo.id).select("nome, slug");
    expect(porDono.data).toEqual([{ nome: "Nome Novo", slug: grupo.slug }]);
  });

  it("does not let anyone change the slug", async () => {
    const nilo = await user("nilo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    const { error } = await nilo.client.from("grupos").update({ slug: "roubado" }).eq("id", grupo.id);
    expect(error).not.toBeNull();
  });

  it("lets only the dono delete the Grupo, taking its Elenco with it", async () => {
    const nilo = await user("nilo");
    const admin = await user("admin");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, admin, "admin");
    const jogador = await addJogador(nilo, "Some com o Grupo");

    const porAdmin = await admin.client.from("grupos").delete().eq("id", grupo.id).select("id");
    expect(porAdmin.data).toEqual([]);

    const porDono = await nilo.client.from("grupos").delete().eq("id", grupo.id).select("id");
    expect(porDono.data).toEqual([{ id: grupo.id }]);
    const { data } = await nilo.client.from("players").select("id").eq("id", jogador.data!.id);
    expect(data).toEqual([]);
  });
});

describe("papéis", () => {
  it("lets the dono promote a membro to admin and back", async () => {
    const nilo = await user("nilo");
    const amigo = await user("amigo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, amigo, "membro");

    const promove = await nilo.client
      .from("grupo_membros").update({ papel: "admin" })
      .eq("grupo_id", grupo.id).eq("user_id", amigo.id).select("papel");
    expect(promove.data).toEqual([{ papel: "admin" }]);

    const rebaixa = await nilo.client
      .from("grupo_membros").update({ papel: "membro" })
      .eq("grupo_id", grupo.id).eq("user_id", amigo.id).select("papel");
    expect(rebaixa.data).toEqual([{ papel: "membro" }]);
  });

  it("does not let an admin or a membro promote anyone", async () => {
    const nilo = await user("nilo");
    const admin = await user("admin");
    const amigo = await user("amigo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, admin, "admin");
    await addMembro(grupo.id, amigo, "membro");

    for (const quem of [admin, amigo]) {
      const { data } = await quem.client
        .from("grupo_membros").update({ papel: "admin" })
        .eq("grupo_id", grupo.id).eq("user_id", amigo.id).select("papel");
      expect(data).toEqual([]);
    }
  });

  it("never hands over or touches the dono row", async () => {
    const nilo = await user("nilo");
    const amigo = await user("amigo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, amigo, "membro");

    const virarDono = await nilo.client
      .from("grupo_membros").update({ papel: "dono" })
      .eq("grupo_id", grupo.id).eq("user_id", amigo.id);
    expect(virarDono.error).not.toBeNull();

    const seRebaixar = await nilo.client
      .from("grupo_membros").update({ papel: "membro" })
      .eq("grupo_id", grupo.id).eq("user_id", nilo.id).select("papel");
    expect(seRebaixar.data).toEqual([]);

    const sair = await nilo.client.from("grupo_membros").delete().eq("grupo_id", grupo.id).eq("user_id", nilo.id).select("user_id");
    expect(sair.data).toEqual([]);
  });

  it("lets a membro leave, and the dono remove a membro", async () => {
    const nilo = await user("nilo");
    const amigo = await user("amigo");
    const outro = await user("outro");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, amigo, "membro");
    await addMembro(grupo.id, outro, "membro");

    const sai = await amigo.client.from("grupo_membros").delete().eq("grupo_id", grupo.id).eq("user_id", amigo.id).select("user_id");
    expect(sai.data).toEqual([{ user_id: amigo.id }]);

    const naoRemoveOutro = await outro.client.from("grupo_membros").delete().eq("grupo_id", grupo.id).eq("user_id", nilo.id).select("user_id");
    expect(naoRemoveOutro.data).toEqual([]);

    const remove = await nilo.client.from("grupo_membros").delete().eq("grupo_id", grupo.id).eq("user_id", outro.id).select("user_id");
    expect(remove.data).toEqual([{ user_id: outro.id }]);
  });
});

describe("Jogadores during the transition", () => {
  it("puts a new Jogador in the Grupo its creator owns", async () => {
    const nilo = await user("nilo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    const { data } = await addJogador(nilo, "Novato");
    expect(data?.grupo_id).toBe(grupo.id);
  });

  it("leaves a Jogador without Grupo when its creator has none yet", async () => {
    const nilo = await user("nilo");
    const { data } = await addJogador(nilo, "Sem Grupo");
    expect(data?.grupo_id).toBeNull();
  });

  it("refuses a Jogador aimed at someone else's Grupo", async () => {
    const nilo = await user("nilo");
    const intruso = await user("intruso");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");

    const plantado = await addJogador(intruso, "Plantado", { grupo_id: grupo.id });
    expect(plantado.error).not.toBeNull();

    const { data: proprio } = await addJogador(intruso, "Do Intruso");
    const movido = await intruso.client.from("players").update({ grupo_id: grupo.id }).eq("id", proprio!.id);
    expect(movido.error).not.toBeNull();
  });

  it("refuses a membro planting a Jogador in the Grupo", async () => {
    const nilo = await user("nilo");
    const amigo = await user("amigo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, amigo, "membro");

    const { error } = await addJogador(amigo, "Do Membro", { grupo_id: grupo.id });
    expect(error).not.toBeNull();
  });
});
