import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capacidades, type Capacidades } from "@/lib/capacidades";
import type { Papel } from "@/lib/grupo";
import { admin as service, newUser, removeUsers, type TestUser } from "./support";

/*
 * People and the fut: every change goes through one database function with
 * its rules inside (20261114000000_pessoas.sql). The matrix below proves, for
 * each papel and each action, that the database accepts exactly what
 * `capacidades()` tells the screens to show.
 */

type Elenco = { dono: TestUser; admin: TestUser; membro: TestUser; outroMembro: TestUser; outroAdmin: TestUser; deFora: TestUser };
let gente: Elenco;

beforeAll(async () => {
  const [dono, admin, membro, outroMembro, outroAdmin, deFora] = await Promise.all(
    ["dono", "admin", "membro", "outro-membro", "outro-admin", "fora"].map((l) => newUser(`pessoas-${l}`)),
  );
  gente = { dono, admin, membro, outroMembro, outroAdmin, deFora };
});

afterAll(async () => {
  await removeUsers(...Object.values(gente));
});

const NOME = "Fut das Pessoas";

/** A fresh Grupo with everyone in place (arranged with the service role, so it's fast). */
async function fut() {
  const svc = service();
  const { data: grupo } = await svc
    .from("grupos")
    .insert({ slug: `pessoas-${randomUUID().slice(0, 8)}`, nome: NOME, criado_por: gente.dono.id })
    .select("id")
    .single()
    .throwOnError();
  const papeis: [TestUser, Papel][] = [
    [gente.dono, "dono"],
    [gente.admin, "admin"],
    [gente.membro, "membro"],
    [gente.outroMembro, "membro"],
    [gente.outroAdmin, "admin"],
  ];
  await svc
    .from("grupo_membros")
    .insert(papeis.map(([u, papel]) => ({ grupo_id: grupo!.id, user_id: u.id, papel })))
    .throwOnError();
  return grupo!.id as string;
}

const papelDe = async (grupo: string, quem: TestUser) => {
  const { data } = await service().from("grupo_membros").select("papel").eq("grupo_id", grupo).eq("user_id", quem.id).maybeSingle();
  return (data?.papel ?? null) as Papel | null;
};

const QUEM: Record<Papel, () => TestUser> = { dono: () => gente.dono, admin: () => gente.admin, membro: () => gente.membro };

/** Each action, the capability that should allow it, and a call aimed at someone it's allowed on. */
const ACOES: { nome: string; capacidade: keyof Capacidades; tenta: (quem: TestUser, grupo: string) => PromiseLike<{ error: unknown }> }[] = [
  { nome: "make a membro admin", capacidade: "gerePessoas", tenta: (q, g) => q.client.rpc("mudar_papel", { grupo: g, pessoa: gente.outroMembro.id, novo: "admin" }) },
  { nome: "make an admin membro", capacidade: "gerePessoas", tenta: (q, g) => q.client.rpc("mudar_papel", { grupo: g, pessoa: gente.outroAdmin.id, novo: "membro" }) },
  { nome: "remove someone", capacidade: "gerePessoas", tenta: (q, g) => q.client.rpc("remover_do_grupo", { grupo: g, pessoa: gente.outroMembro.id }) },
  { nome: "hand the fut to an admin", capacidade: "gereFut", tenta: (q, g) => q.client.rpc("passar_posse", { grupo: g, pessoa: gente.outroAdmin.id }) },
  { nome: "rename the fut", capacidade: "gereFut", tenta: (q, g) => q.client.rpc("renomear_grupo", { grupo: g, nome: "Novo nome" }) },
  { nome: "delete the fut", capacidade: "gereFut", tenta: (q, g) => q.client.rpc("excluir_grupo", { grupo: g, confirmacao: NOME }) },
  { nome: "leave the fut", capacidade: "saiDoFut", tenta: (q, g) => q.client.rpc("sair_do_grupo", { grupo: g }) },
];

describe("the database accepts exactly what capacidades() shows", () => {
  for (const papel of ["dono", "admin", "membro"] as const) {
    for (const acao of ACOES) {
      const pode = capacidades(papel, "qualquer")[acao.capacidade] as boolean;
      it(`${papel} ${pode ? "can" : "can't"} ${acao.nome}`, async () => {
        const grupo = await fut();
        const { error } = await acao.tenta(QUEM[papel](), grupo);
        expect(error === null).toBe(pode);
      });
    }

    const veEmails = capacidades(papel, "qualquer").veEmails;
    it(`${papel} ${veEmails ? "sees" : "doesn't see"} the others' emails`, async () => {
      const grupo = await fut();
      const { data, error } = await QUEM[papel]().client.rpc("pessoas_do_grupo", { grupo });
      expect(error).toBeNull();
      const doMembro = (data as { user_id: string; email: string | null }[]).find((p) => p.user_id === gente.outroMembro.id);
      expect(doMembro?.email ?? null).toBe(veEmails ? gente.outroMembro.email : null);
    });
  }
});

describe("pessoas_do_grupo", () => {
  it("lists everyone, dono first then admins, with their Jogador's name", async () => {
    const grupo = await fut();
    await service().from("players").insert({ user_id: gente.dono.id, grupo_id: grupo, conta_id: gente.membro.id, name: "Canhoto", position: "ALA", nationality: "BR" }).throwOnError();

    const { data } = await gente.membro.client.rpc("pessoas_do_grupo", { grupo });
    const pessoas = data as { user_id: string; papel: Papel; jogador_nome: string | null }[];
    expect(pessoas).toHaveLength(5);
    expect(pessoas.map((p) => p.papel)).toEqual(["dono", "admin", "admin", "membro", "membro"]);
    expect(pessoas.find((p) => p.user_id === gente.membro.id)?.jogador_nome).toBe("Canhoto");
  });

  it("tells nothing to someone outside the fut", async () => {
    const grupo = await fut();
    const { data, error } = await gente.deFora.client.rpc("pessoas_do_grupo", { grupo });
    expect(data).toBeNull();
    expect(error?.hint).toBe("nao-membro");
  });
});

describe("the dono's rules", () => {
  it("can't change, remove or hand the fut to themselves", async () => {
    const grupo = await fut();
    const eu = gente.dono;
    for (const tentativa of [
      eu.client.rpc("mudar_papel", { grupo, pessoa: eu.id, novo: "membro" }),
      eu.client.rpc("remover_do_grupo", { grupo, pessoa: eu.id }),
      eu.client.rpc("passar_posse", { grupo, pessoa: eu.id }),
    ]) {
      expect((await tentativa).error?.hint).toBe("e-voce");
    }
    expect(await papelDe(grupo, eu)).toBe("dono");
  });

  it("never makes anyone dono by a papel change", async () => {
    const grupo = await fut();
    const { error } = await gente.dono.client.rpc("mudar_papel", { grupo, pessoa: gente.admin.id, novo: "dono" });
    expect(error).not.toBeNull();
    expect(await papelDe(grupo, gente.admin)).toBe("admin");
  });

  it("hands the fut only to an admin, and steps down to admin: always exactly one dono", async () => {
    const grupo = await fut();
    const paraMembro = await gente.dono.client.rpc("passar_posse", { grupo, pessoa: gente.membro.id });
    expect(paraMembro.error?.hint).toBe("so-para-admin");

    const { error } = await gente.dono.client.rpc("passar_posse", { grupo, pessoa: gente.admin.id });
    expect(error).toBeNull();
    expect(await papelDe(grupo, gente.admin)).toBe("dono");
    expect(await papelDe(grupo, gente.dono)).toBe("admin");
    const { count } = await service().from("grupo_membros").select("*", { count: "exact", head: true }).eq("grupo_id", grupo).eq("papel", "dono");
    expect(count).toBe(1);

    // The old dono is an admin now: no more power over people.
    const depois = await gente.dono.client.rpc("remover_do_grupo", { grupo, pessoa: gente.membro.id });
    expect(depois.error?.hint).toBe("sem-permissao");
  });

  it("must hand the fut over before leaving", async () => {
    const grupo = await fut();
    const { error } = await gente.dono.client.rpc("sair_do_grupo", { grupo });
    expect(error?.hint).toBe("dono-nao-sai");
    expect(await papelDe(grupo, gente.dono)).toBe("dono");
  });

  it("deletes the fut only with its name typed (any case, extra spaces), taking everything with it", async () => {
    const grupo = await fut();
    const svc = service();
    const { data: jogador } = await svc.from("players").insert({ user_id: gente.dono.id, grupo_id: grupo, name: "Some Junto", position: "ALA", nationality: "BR" }).select("id").single().throwOnError();
    const { data: partida } = await svc
      .from("partidas")
      .insert({ grupo_id: grupo, inicio: new Date(Date.now() + 86_400_000).toISOString(), local: "Quadra", vagas: 10 })
      .select("id")
      .single()
      .throwOnError();
    await svc.from("presencas").insert({ partida_id: partida!.id, jogador_id: jogador!.id, situacao: "confirmado", pediu_vaga_em: new Date().toISOString() }).throwOnError();

    const errado = await gente.dono.client.rpc("excluir_grupo", { grupo, confirmacao: "Outro fut" });
    expect(errado.error?.hint).toBe("nome-nao-confere");
    expect((await svc.from("grupos").select("id").eq("id", grupo)).data).toHaveLength(1);

    const { error } = await gente.dono.client.rpc("excluir_grupo", { grupo, confirmacao: `  ${NOME.toUpperCase()} ` });
    expect(error).toBeNull();
    expect((await svc.from("grupos").select("id").eq("id", grupo)).data).toEqual([]);
    expect((await svc.from("players").select("id").eq("id", jogador!.id)).data).toEqual([]);
    expect((await svc.from("partidas").select("id").eq("id", partida!.id)).data).toEqual([]);
  });

  it("renames the fut without touching its slug", async () => {
    const grupo = await fut();
    const { data: antes } = await service().from("grupos").select("slug").eq("id", grupo).single();
    const { error } = await gente.dono.client.rpc("renomear_grupo", { grupo, nome: "  Fut de Quinta  " });
    expect(error).toBeNull();
    const { data: depois } = await service().from("grupos").select("nome, slug").eq("id", grupo).single();
    expect(depois).toEqual({ nome: "Fut de Quinta", slug: antes!.slug });

    const vazio = await gente.dono.client.rpc("renomear_grupo", { grupo, nome: "   " });
    expect(vazio.error?.code).toBe("22023");
  });
});

describe("leaving and being removed", () => {
  it("unlinks the person's Jogador, which stays in the Elenco with its presences", async () => {
    for (const [como, sai] of [
      ["leaving", (g: string) => gente.membro.client.rpc("sair_do_grupo", { grupo: g })],
      ["removed", (g: string) => gente.dono.client.rpc("remover_do_grupo", { grupo: g, pessoa: gente.membro.id })],
    ] as const) {
      const grupo = await fut();
      const svc = service();
      const { data: jogador } = await svc
        .from("players")
        .insert({ user_id: gente.dono.id, grupo_id: grupo, conta_id: gente.membro.id, name: `Fica ${como}`, position: "ALA", nationality: "BR" })
        .select("id")
        .single()
        .throwOnError();

      const { error } = await sai(grupo);
      expect(error, como).toBeNull();
      expect(await papelDe(grupo, gente.membro), como).toBeNull();
      const { data: ficou } = await svc.from("players").select("conta_id").eq("id", jogador!.id).single();
      expect(ficou, como).toEqual({ conta_id: null });
    }
  });

  it("nobody removes the dono, and someone outside can't remove anyone", async () => {
    const grupo = await fut();
    const doAdmin = await gente.admin.client.rpc("remover_do_grupo", { grupo, pessoa: gente.dono.id });
    expect(doAdmin.error?.hint).toBe("sem-permissao");
    const deFora = await gente.deFora.client.rpc("remover_do_grupo", { grupo, pessoa: gente.membro.id });
    expect(deFora.error?.hint).toBe("nao-membro");
    const naoEsta = await gente.dono.client.rpc("remover_do_grupo", { grupo, pessoa: gente.deFora.id });
    expect(naoEsta.error?.hint).toBe("pessoa-fora");
  });
});

describe("no direct writes any more", () => {
  it("the dono can't update papéis, remove people or rename and delete the fut by hand", async () => {
    const grupo = await fut();
    const c = gente.dono.client;

    const papel = await c.from("grupo_membros").update({ papel: "admin" }).eq("grupo_id", grupo).eq("user_id", gente.membro.id).select("papel");
    expect(papel.data ?? []).toEqual([]);
    const remove = await c.from("grupo_membros").delete().eq("grupo_id", grupo).eq("user_id", gente.membro.id).select("user_id");
    expect(remove.data ?? []).toEqual([]);
    const renomeia = await c.from("grupos").update({ nome: "Na mão" }).eq("id", grupo).select("nome");
    expect(renomeia.data ?? []).toEqual([]);
    const apaga = await c.from("grupos").delete().eq("id", grupo).select("id");
    expect(apaga.data ?? []).toEqual([]);

    expect(await papelDe(grupo, gente.membro)).toBe("membro");
    const { data } = await service().from("grupos").select("nome").eq("id", grupo).single();
    expect(data?.nome).toBe(NOME);
  });

  it("nobody calls the internal helpers", async () => {
    const grupo = await fut();
    const { error } = await gente.dono.client.rpc("desligar_do_grupo", { grupo, pessoa: gente.membro.id });
    expect(error).not.toBeNull();
    expect(await papelDe(grupo, gente.membro)).toBe("membro");
  });
});
