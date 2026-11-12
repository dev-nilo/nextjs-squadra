import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aceitarConvite, criarConvite, revogarConvite } from "@/lib/acoes/convite";
import { FUT_NAO_ENCONTRADO, SEM_PERMISSAO, SESSAO_EXPIRADA, type Resultado } from "@/lib/acoes/executar";
import { criarGrupo } from "@/lib/acoes/grupo";
import { excluirJogador, importarJogadores, salvarJogador } from "@/lib/acoes/jogador";
import { cancelarPartida, criarPartida, editarPartida, responderPresenca } from "@/lib/acoes/partida";
import { moverNoSorteio, publicarSorteio, sortearDaPartida } from "@/lib/acoes/sorteio";
import { criarMeuJogador, desvincularJogador, vincularJogador } from "@/lib/acoes/vinculo";
import { addMembro, admin as service, anon, newUser, removeUsers, type TestUser } from "./support";

// The Server Actions' bodies, called the way the adapters in app/actions call
// them, with a signed-in client against the local Supabase: the error table
// runs against the real RLS and database functions.

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

let users: TestUser[] = [];
const user = async (label: string) => {
  const u = await newUser(label);
  users.push(u);
  return u;
};

beforeEach(() => vi.mocked(Sentry.captureException).mockClear());
afterEach(async () => {
  await removeUsers(...users);
  users = [];
});

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`expected ok, got: ${resultado.message}`);
  return resultado.valor;
}
const mensagem = (resultado: Resultado<unknown>) => (resultado.ok ? "ok" : resultado.message);

const attrs = { velocidade: 70, resistencia: 70, chute: 70, posicionamento: 70, defesa: 70, drible: 70, passe: 70, fisico: 70 };
const carta = (name: string, extra: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  name,
  position: "ALA",
  nationality: "BR",
  image: null,
  attributes: attrs,
  ...extra,
});
const amanha = () => new Date(Date.now() + 86_400_000).toISOString();

async function grupoDe(dono: TestUser, nome = "Fut das Ações") {
  return valor(await criarGrupo(dono.client, nome));
}

describe("resolving the Grupo", () => {
  it("refuses without a Sessão, and for a Grupo the user isn't in", async () => {
    const dono = await user("dono");
    const { slug } = await grupoDe(dono);
    const deFora = await user("de-fora");

    expect(mensagem(await salvarJogador(anon(), slug, carta("Sem sessão")))).toBe(SESSAO_EXPIRADA);
    expect(mensagem(await salvarJogador(deFora.client, slug, carta("Intruso")))).toBe(FUT_NAO_ENCONTRADO);
    expect(mensagem(await criarPartida(deFora.client, slug, { inicio: amanha(), local: "Quadra", vagas: 10 }))).toBe(FUT_NAO_ENCONTRADO);
    expect(mensagem(await salvarJogador(dono.client, "fut-que-nao-existe", carta("Perdido")))).toBe(FUT_NAO_ENCONTRADO);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("only writes in the slug's Grupo, whatever ids the browser sends", async () => {
    const dono = await user("dono");
    const a = await grupoDe(dono, "Fut A");
    const outro = await user("outro");
    const b = await grupoDe(outro, "Fut B");
    await addMembro(b.id, dono, "admin");

    const doB = carta("Do B");
    valor(await salvarJogador(outro.client, b.slug, doB));

    // The same id saved through Grupo A: refused, and B's Jogador is untouched.
    expect(mensagem(await salvarJogador(dono.client, a.slug, { ...doB, name: "Sequestrado" }))).toBe(
      "Esse jogador não é desse fut. Recarregue a página.",
    );
    expect(mensagem(await excluirJogador(dono.client, a.slug, doB.id))).toBe(SEM_PERMISSAO);
    const { data } = await service().from("players").select("name, grupo_id").eq("id", doB.id).single();
    expect(data).toEqual({ name: "Do B", grupo_id: b.id });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("the Elenco", () => {
  it("creates, edits, imports and deletes Jogadores; a membro is told only organizers can", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const membro = await user("membro");
    await addMembro(grupo.id, membro, "membro");

    const nova = carta("Paredão");
    expect(valor(await salvarJogador(dono.client, grupo.slug, nova))).toEqual({ criado: true });
    expect(valor(await salvarJogador(dono.client, grupo.slug, { ...nova, name: "Paredão II" }))).toEqual({ criado: false });
    expect(valor(await importarJogadores(dono.client, grupo.slug, [carta("A"), carta("B")]))).toEqual({ total: 2 });

    expect(mensagem(await salvarJogador(membro.client, grupo.slug, carta("Do membro")))).toBe(SEM_PERMISSAO);
    expect(mensagem(await excluirJogador(membro.client, grupo.slug, nova.id))).toBe(SEM_PERMISSAO);
    expect(mensagem(await salvarJogador(dono.client, grupo.slug, carta("", { attributes: attrs })))).toBe("Dê um nome pro jogador.");

    valor(await excluirJogador(dono.client, grupo.slug, nova.id));
    const { data } = await service().from("players").select("name").eq("grupo_id", grupo.id).order("name");
    expect(data?.map((p) => p.name)).toEqual(["A", "B"]);
  });
});

describe("a Partida and its Sorteio", () => {
  it("runs from creation to published Times through the actions", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const membro = await user("membro");
    await addMembro(grupo.id, membro, "membro");
    const ids = (await Promise.all(["J0", "J1", "J2", "J3"].map(async (n) => {
      const c = carta(n);
      valor(await salvarJogador(dono.client, grupo.slug, c));
      return c.id;
    })));

    expect(mensagem(await criarPartida(membro.client, grupo.slug, { inicio: amanha(), local: "Quadra", vagas: 10 }))).toBe(SEM_PERMISSAO);
    const { id: partida } = valor(await criarPartida(dono.client, grupo.slug, { inicio: amanha(), local: "Quadra", vagas: 10 }));
    valor(await editarPartida(dono.client, grupo.slug, partida, { inicio: amanha(), local: "Ginásio", vagas: 12 }));
    expect(mensagem(await editarPartida(dono.client, grupo.slug, partida, { inicio: amanha(), local: "", vagas: 12 }))).toBe("Diz onde vai ser.");

    for (const id of ids) expect(valor(await responderPresenca(dono.client, grupo.slug, partida, id, true))).toEqual({ situacao: "confirmado" });
    // A membro answering for someone else's Jogador gets the Presença's own reason.
    expect(mensagem(await responderPresenca(membro.client, grupo.slug, partida, ids[0], false))).toBe("Você só responde pelo seu jogador.");

    expect(mensagem(await sortearDaPartida(dono.client, grupo.slug, partida, 3))).toBe("Pra 3 Times precisa de pelo menos 6 confirmados (tem 4).");
    valor(await sortearDaPartida(dono.client, grupo.slug, partida, 2));
    const { data: sorteio } = await service().from("sorteios").select("times, sorteado_em").eq("partida_id", partida).single();
    const daOrigem = (sorteio!.times as { jogadores: { id: string }[] }[])[0].jogadores[0].id;

    valor(await moverNoSorteio(dono.client, grupo.slug, partida, daOrigem, 1, sorteio!.sorteado_em));
    valor(await publicarSorteio(dono.client, grupo.slug, partida));
    expect(mensagem(await moverNoSorteio(dono.client, grupo.slug, partida, daOrigem, 0, sorteio!.sorteado_em))).toBe(
      "Os times já foram publicados.",
    );

    valor(await cancelarPartida(dono.client, grupo.slug, partida));
    expect(mensagem(await responderPresenca(dono.client, grupo.slug, partida, ids[0], false))).toBe("Essa partida foi cancelada.");
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("Convites and vínculos", () => {
  it("invites, joins, links and unlinks", async () => {
    const dono = await user("dono");
    const grupo = await grupoDe(dono);
    const novato = await user("novato");

    const convite = valor(await criarConvite(dono.client, grupo.slug));
    expect(valor(await aceitarConvite(novato.client, convite.token))).toEqual({ slug: grupo.slug, nome: grupo.nome });
    expect(mensagem(await criarConvite(novato.client, grupo.slug))).toBe(SEM_PERMISSAO);
    expect(mensagem(await revogarConvite(novato.client, grupo.slug, convite.id))).toBe(SEM_PERMISSAO);

    valor(await criarMeuJogador(novato.client, grupo.slug, "Novato", "ATA"));
    expect(mensagem(await criarMeuJogador(novato.client, grupo.slug, "De novo", "ATA"))).toBe("Você já tem um jogador nesse fut.");
    const { data: meu } = await service().from("players").select("id").eq("grupo_id", grupo.id).eq("conta_id", novato.id).single();
    valor(await desvincularJogador(novato.client, grupo.slug, meu!.id));
    valor(await vincularJogador(novato.client, grupo.slug, meu!.id));

    valor(await revogarConvite(dono.client, grupo.slug, convite.id));
    const outro = await user("outro");
    expect(mensagem(await aceitarConvite(outro.client, convite.token))).toBe("Esse convite foi cancelado");
    expect(mensagem(await aceitarConvite(outro.client, "nao-e-token"))).toBe("Convite não encontrado");
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("creating a Grupo", () => {
  it("hands back the same Grupo on a second submit", async () => {
    const dono = await user("dono");
    const primeiro = await grupoDe(dono, "Fut Único");
    expect(await grupoDe(dono, "Outro nome")).toEqual(primeiro);
    expect(mensagem(await criarGrupo(anon(), "Sem sessão"))).toBe(SESSAO_EXPIRADA);
  });
});
