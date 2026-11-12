import { afterEach, describe, expect, it } from "vitest";
import { addJogador, admin as service, anon, newUser, removeUsers, type TestUser } from "./support";

const FUT_DO_DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SEED_PASSWORD = "squadra-dev-123";

let users: TestUser[] = [];
afterEach(async () => {
  await removeUsers(...users);
  users = [];
});

async function seedUser(email: string) {
  const client = anon();
  const { error } = await client.auth.signInWithPassword({ email, password: SEED_PASSWORD });
  if (error) throw error;
  return client;
}

type Linha = { jogador_id: string; partidas: number; presencas: number; frequencia: number | null };

async function frequenciaPorNome(client: ReturnType<typeof anon>, grupoId: string) {
  const { data: linhas, error } = await client.from("frequencia_jogadores").select("jogador_id, partidas, presencas, frequencia").eq("grupo_id", grupoId);
  if (error) throw error;
  const { data: jogadores } = await service().from("players").select("id, name").eq("grupo_id", grupoId);
  const nome = new Map((jogadores ?? []).map((j) => [j.id, j.name]));
  return new Map((linhas as Linha[]).map((l) => [nome.get(l.jogador_id)!, l]));
}

describe("frequencia_jogadores against the seed", () => {
  it("gives the known percentages over Fut do Dev's last Partidas", async () => {
    const porNome = await frequenciaPorNome(await seedUser("dev@squadra.test"), FUT_DO_DEV);

    // Four past Partidas count: the cancelled one and next week's don't.
    expect([...porNome.values()].every((l) => l.partidas === 4)).toBe(true);
    expect(Object.fromEntries(["Paredão", "Xerife", "Foguete", "Maestro", "Matador", "Bagre", "Corisco"].map((n) => [n, porNome.get(n)?.frequencia]))).toEqual({
      Paredão: 100,
      Xerife: 75,
      Foguete: 50, // waited once: that counts as absent
      Maestro: 25,
      Matador: 25,
      Bagre: 0, // confirmed only in the cancelled Partida
      Corisco: 0,
    });
    expect(porNome.get("Xerife")).toMatchObject({ partidas: 4, presencas: 3 });
  });

  it("respects RLS: someone outside the Grupo sees nothing", async () => {
    const amigo = await seedUser("amigo@squadra.test");
    const { data } = await amigo.from("frequencia_jogadores").select("jogador_id").eq("grupo_id", FUT_DO_DEV);
    expect(data).toEqual([]);
    const { data: semSessao } = await anon().from("frequencia_jogadores").select("jogador_id").eq("grupo_id", FUT_DO_DEV);
    expect(semSessao ?? []).toEqual([]);
  });

  it("is null for a Jogador with no past Partida to count", async () => {
    const porNome = await frequenciaPorNome(await seedUser("amigo@squadra.test"), "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(porNome.get("Ala do Amigo")).toMatchObject({ partidas: 0, presencas: 0, frequencia: null });
  });
});

describe("which Partidas count", () => {
  async function grupoComPartidasPassadas(diasAtras: number[]) {
    const dono = await newUser("dono");
    users.push(dono);
    const { data: grupo, error } = await dono.client.rpc("criar_grupo", { nome_do_grupo: "Fut da Frequência" });
    if (error) throw error;
    const { data: partidas } = await service()
      .from("partidas")
      .insert(diasAtras.map((d) => ({ grupo_id: grupo.id, inicio: new Date(Date.now() - d * 86_400_000).toISOString(), local: "Quadra", vagas: 10 })))
      .select("id, inicio")
      .throwOnError();
    return { dono, grupoId: grupo.id as string, partidas: partidas! };
  }

  it("only Partidas since the Jogador joined the Elenco", async () => {
    const { dono, grupoId, partidas } = await grupoComPartidasPassadas([30, 20, 2]);
    const { data: novato } = await addJogador(dono, grupoId, "Novato");
    await service().from("players").update({ created_at: new Date(Date.now() - 5 * 86_400_000).toISOString() }).eq("id", novato!.id).throwOnError();
    const recente = partidas.find((p) => new Date(p.inicio).getTime() > Date.now() - 3 * 86_400_000)!;
    await service().from("presencas").insert({ partida_id: recente.id, jogador_id: novato!.id, situacao: "confirmado", pediu_vaga_em: new Date().toISOString() }).throwOnError();

    const porNome = await frequenciaPorNome(dono.client, grupoId);
    expect(porNome.get("Novato")).toMatchObject({ partidas: 1, presencas: 1, frequencia: 100 });
  });

  it("only the last 10", async () => {
    const dias = Array.from({ length: 12 }, (_, i) => i + 1);
    const { dono, grupoId, partidas } = await grupoComPartidasPassadas(dias);
    const { data: veterano } = await addJogador(dono, grupoId, "Veterano");
    await service().from("players").update({ created_at: new Date(Date.now() - 60 * 86_400_000).toISOString() }).eq("id", veterano!.id).throwOnError();
    // Present only in the two oldest, which fall outside the window.
    const antigas = [...partidas].sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 2);
    await service()
      .from("presencas")
      .insert(antigas.map((p) => ({ partida_id: p.id, jogador_id: veterano!.id, situacao: "confirmado", pediu_vaga_em: new Date().toISOString() })))
      .throwOnError();

    const porNome = await frequenciaPorNome(dono.client, grupoId);
    expect(porNome.get("Veterano")).toMatchObject({ partidas: 10, presencas: 0, frequencia: 0 });
  });
});
