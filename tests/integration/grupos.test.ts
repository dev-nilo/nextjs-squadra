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
  it("makes the caller dono", async () => {
    const nilo = await user("nilo");

    const grupo = await criarGrupo(nilo, "Fut do Nilo");

    expect(grupo.nome).toBe("Fut do Nilo");
    expect(grupo.slug).toMatch(/^fut-do-nilo(-\d+)?$/);
    const { data: membros } = await nilo.client.from("grupo_membros").select("user_id, papel").eq("grupo_id", grupo.id);
    expect(membros).toEqual([{ user_id: nilo.id, papel: "dono" }]);
  });

  it("starts a second Grupo with an empty Elenco, leaving the first one's alone", async () => {
    const nilo = await user("nilo");
    const primeiro = await criarGrupo(nilo, "Primeiro");
    const jogador = await addJogador(nilo, primeiro.id, "Já no Primeiro");

    const segundo = await criarGrupo(nilo, "Segundo");

    const { data: doSegundo } = await nilo.client.from("players").select("id").eq("grupo_id", segundo.id);
    expect(doSegundo).toEqual([]);
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

    const porAdmin = await admin.client.rpc("renomear_grupo", { grupo: grupo.id, nome: "Golpe" });
    expect(porAdmin.error?.hint).toBe("sem-permissao");

    const porDono = await nilo.client.rpc("renomear_grupo", { grupo: grupo.id, nome: "Nome Novo" });
    expect(porDono.data).toMatchObject({ nome: "Nome Novo", slug: grupo.slug });
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
    const jogador = await addJogador(nilo, grupo.id, "Some com o Grupo");

    const porAdmin = await admin.client.rpc("excluir_grupo", { grupo: grupo.id, confirmacao: "Fut do Nilo" });
    expect(porAdmin.error?.hint).toBe("sem-permissao");

    const porDono = await nilo.client.rpc("excluir_grupo", { grupo: grupo.id, confirmacao: "Fut do Nilo" });
    expect(porDono.error).toBeNull();
    const { data } = await nilo.client.from("players").select("id").eq("id", jogador.data!.id);
    expect(data).toEqual([]);
  });
});

// Papéis, removing and leaving in depth: tests/integration/pessoas.test.ts.
describe("papéis", () => {
  it("lets the dono promote a membro to admin and back", async () => {
    const nilo = await user("nilo");
    const amigo = await user("amigo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, amigo, "membro");

    const promove = await nilo.client.rpc("mudar_papel", { grupo: grupo.id, pessoa: amigo.id, novo: "admin" });
    expect(promove.data?.papel).toBe("admin");

    const rebaixa = await nilo.client.rpc("mudar_papel", { grupo: grupo.id, pessoa: amigo.id, novo: "membro" });
    expect(rebaixa.data?.papel).toBe("membro");
  });

  it("lets a membro leave, and the dono remove a membro", async () => {
    const nilo = await user("nilo");
    const amigo = await user("amigo");
    const outro = await user("outro");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, amigo, "membro");
    await addMembro(grupo.id, outro, "membro");

    expect((await amigo.client.rpc("sair_do_grupo", { grupo: grupo.id })).error).toBeNull();
    expect((await outro.client.rpc("remover_do_grupo", { grupo: grupo.id, pessoa: nilo.id })).error).not.toBeNull();
    expect((await nilo.client.rpc("remover_do_grupo", { grupo: grupo.id, pessoa: outro.id })).error).toBeNull();

    const { data } = await nilo.client.from("grupo_membros").select("user_id").eq("grupo_id", grupo.id);
    expect(data).toEqual([{ user_id: nilo.id }]);
  });
});

describe("Jogadores and their Grupo", () => {
  it("refuses a Jogador without a Grupo", async () => {
    const nilo = await user("nilo");
    await criarGrupo(nilo, "Fut do Nilo");
    // Even with a Grupo of their own, nothing fills it in any more.
    const { error } = await addJogador(nilo, null, "Sem Grupo");
    expect(error).not.toBeNull();
  });

  it("refuses a Jogador aimed at someone else's Grupo", async () => {
    const nilo = await user("nilo");
    const intruso = await user("intruso");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");

    const plantado = await addJogador(intruso, grupo.id, "Plantado");
    expect(plantado.error).not.toBeNull();

    const doIntruso = await criarGrupo(intruso, "Fut do Intruso");
    const { data: proprio } = await addJogador(intruso, doIntruso.id, "Do Intruso");
    const movido = await intruso.client.from("players").update({ grupo_id: grupo.id }).eq("id", proprio!.id);
    expect(movido.error).not.toBeNull();
  });

  it("refuses a membro planting a Jogador in the Grupo", async () => {
    const nilo = await user("nilo");
    const amigo = await user("amigo");
    const grupo = await criarGrupo(nilo, "Fut do Nilo");
    await addMembro(grupo.id, amigo, "membro");

    const { error } = await addJogador(amigo, grupo.id, "Do Membro");
    expect(error).not.toBeNull();
  });
});
