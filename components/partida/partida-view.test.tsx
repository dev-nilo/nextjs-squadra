import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Participacao } from "@/lib/grupo";
import type { JogadorDaLista, PartidaAoVivo } from "@/lib/leitura-da-partida";
import type { Presenca } from "@/lib/partida";
import { ok, recusa } from "@/tests/componentes/acoes";
import { servidor } from "@/tests/componentes/partida-ao-vivo";
import { PartidaView } from "./partida-view";

const m = vi.hoisted(() => ({
  responderPresenca: vi.fn(),
  cancelarPartida: vi.fn(),
  editarPartida: vi.fn(),
  semConexao: { valor: false },
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));
vi.mock("@/hooks/use-partida-ao-vivo", () => import("@/tests/componentes/partida-ao-vivo"));
vi.mock("@/app/actions/partida", () => ({
  responderPresenca: m.responderPresenca,
  cancelarPartida: m.cancelarPartida,
  editarPartida: m.editarPartida,
}));
vi.mock("@/app/actions/sorteio", () => ({
  sortearDaPartida: vi.fn(),
  publicarSorteio: vi.fn(),
  moverNoSorteio: vi.fn(),
}));
vi.mock("@/lib/pwa/conexao", () => ({ useSemConexao: () => m.semConexao.valor }));
vi.mock("@/lib/pwa/instalar", async (original) => ({
  ...(await original<typeof import("@/lib/pwa/instalar")>()),
  deveOferecerInstalacao: () => false,
}));
vi.mock("sonner", () => ({ toast: m.toast }));

const EU = "conta-eu";
const AGORA = new Date("2026-11-20T12:00:00Z").getTime();
const grupo = (papel: Participacao["papel"]): Participacao => ({
  id: "g1",
  slug: "fut-do-dev",
  nome: "Fut do Dev",
  papel,
});
const j = (id: string, name: string, conta_id?: string): JogadorDaLista => ({
  id,
  name,
  position: "ATA",
  rating: 70,
  conta_id,
});
const JOGADORES = [
  j("eu", "Eu Mesmo", EU),
  j("bala", "Bala"),
  j("foguete", "Foguete"),
  j("muralha", "Muralha"),
  j("zeca", "Zeca"),
];
const vai = (jogador_id: string, quando = "2026-11-19T10:00:00Z"): Presenca => ({
  jogador_id,
  situacao: "confirmado",
  pediu_vaga_em: quando,
});
const espera = (jogador_id: string, quando: string): Presenca => ({
  jogador_id,
  situacao: "espera",
  pediu_vaga_em: quando,
});
const naoVai = (jogador_id: string): Presenca => ({ jogador_id, situacao: "nao_vou", pediu_vaga_em: null });

function partida(presencas: Presenca[], extra: Partial<PartidaAoVivo["partida"]> = {}): PartidaAoVivo {
  return {
    partida: {
      id: "p1",
      grupo_id: "g1",
      inicio: "2026-11-21T22:00:00Z",
      local: "Arena Central",
      vagas: 10,
      cancelada_em: null,
      ...extra,
    },
    presencas,
    sorteio: null,
  };
}

/**
 * Renders the Partida. The mocked responderPresenca behaves like the database:
 * it records the answer (in the lista de espera once the vagas are taken) and
 * says where it landed.
 */
function abrir(inicial: PartidaAoVivo, papel: Participacao["papel"] = "membro", jogadores = JOGADORES) {
  servidor.dados = inicial;
  m.responderPresenca.mockImplementation(async (_slug: string, _id: string, jogadorId: string, sim: boolean) => {
    const atual = servidor.dados!;
    const outras = atual.presencas.filter((p) => p.jogador_id !== jogadorId);
    const confirmados = outras.filter((p) => p.situacao === "confirmado").length;
    const situacao = !sim ? "nao_vou" : confirmados < atual.partida.vagas ? "confirmado" : "espera";
    servidor.dados = {
      ...atual,
      presencas: [...outras, { jogador_id: jogadorId, situacao, pediu_vaga_em: sim ? "2026-11-20T12:00:00Z" : null }],
    };
    return ok({ situacao });
  });
  render(<PartidaView grupo={grupo(papel)} userId={EU} inicial={inicial} jogadores={jogadores} agora={AGORA} />);
  return userEvent.setup();
}

const suaPresenca = () => within(screen.getByRole("region", { name: "Sua presença" }));
const nomesEm = (regiao: string) =>
  within(screen.getByRole("region", { name: regiao }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

beforeEach(() => {
  m.semConexao.valor = false;
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});

describe("PartidaView: your presença", () => {
  it('asks "Você vai?" and confirms you', async () => {
    const usuario = abrir(partida([vai("bala")]));
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Arena Central")).toBeInTheDocument();
    expect(suaPresenca().getByText("Você vai?")).toBeInTheDocument();

    await usuario.click(suaPresenca().getByRole("button", { name: "Vou" }));

    expect(m.responderPresenca).toHaveBeenCalledWith("fut-do-dev", "p1", "eu", true);
    expect(await suaPresenca().findByText("Você vai")).toBeInTheDocument();
    expect(nomesEm("Quem vai")).toEqual(["1Bala", "2Eu Mesmovocê"]);
    expect(screen.getByText(/vagas, faltam 8/)).toHaveTextContent("2 de 10 vagas, faltam 8");
  });

  it("changes the answer with Mudar, or keeps it with Deixar como está", async () => {
    const usuario = abrir(partida([vai("eu")]));
    expect(suaPresenca().getByText("Você vai")).toBeInTheDocument();

    await usuario.click(suaPresenca().getByRole("button", { name: "Mudar" }));
    expect(suaPresenca().getByRole("button", { name: "Vou" })).toBeDisabled();
    await usuario.click(suaPresenca().getByRole("button", { name: "Deixar como está" }));
    expect(suaPresenca().getByText("Você vai")).toBeInTheDocument();

    await usuario.click(suaPresenca().getByRole("button", { name: "Mudar" }));
    await usuario.click(suaPresenca().getByRole("button", { name: "Não vou" }));
    expect(await suaPresenca().findByText("Você não vai")).toBeInTheDocument();
    expect(screen.getByText("Ninguém confirmou ainda.")).toBeInTheDocument();
  });

  it("a full Partida puts you on the lista de espera, and says so", async () => {
    const cheia = partida([vai("bala"), vai("foguete")], { vagas: 2 });
    const usuario = abrir(cheia);
    expect(suaPresenca().getByText("Lotou. Quem disser vou entra na lista de espera.")).toBeInTheDocument();
    expect(screen.getByText(/vagas, lotada/)).toBeInTheDocument();

    await usuario.click(suaPresenca().getByRole("button", { name: "Vou" }));

    expect(await suaPresenca().findByText("Você está em 1º na lista de espera")).toBeInTheDocument();
    expect(m.toast.info).toHaveBeenCalledWith("Partida lotada", { description: "Entrou na lista de espera." });
    expect(nomesEm("Lista de espera")).toEqual(["1Eu Mesmovocê"]);
  });

  it("orders the lista de espera by when each asked", () => {
    abrir(
      partida([vai("bala"), espera("zeca", "2026-11-19T12:00:00Z"), espera("muralha", "2026-11-19T11:00:00Z")], {
        vagas: 1,
      }),
    );
    expect(nomesEm("Lista de espera")).toEqual(["1Muralha", "2Zeca"]);
  });

  it("tells the server's refusal, and keeps the question", async () => {
    const usuario = abrir(partida([]));
    m.responderPresenca.mockResolvedValueOnce(recusa("Essa partida já começou."));
    await usuario.click(suaPresenca().getByRole("button", { name: "Vou" }));
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith("Não deu pra responder", { description: "Essa partida já começou." }),
    );
    expect(suaPresenca().getByText("Você vai?")).toBeInTheDocument();
  });

  it("someone with no Jogador is sent to pick one", () => {
    abrir(
      partida([]),
      "membro",
      JOGADORES.filter((x) => x.conta_id !== EU),
    );
    expect(suaPresenca().getByText("Escolha seu jogador para responder.")).toBeInTheDocument();
    expect(suaPresenca().getByRole("link", { name: "Escolher meu jogador" })).toHaveAttribute(
      "href",
      "/g/fut-do-dev/voce",
    );
  });

  it("with no signal nothing can be answered", () => {
    m.semConexao.valor = true;
    abrir(partida([]));
    expect(suaPresenca().getByText("Você ainda não respondeu.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vou" })).not.toBeInTheDocument();
  });
});

describe("PartidaView: who's going", () => {
  it("folds who isn't going and who hasn't answered into one line", async () => {
    const usuario = abrir(partida([vai("bala"), naoVai("foguete")]));
    const resumo = screen.getByText("1 não vai, 3 sem resposta");
    await usuario.click(resumo);
    expect(nomesEm("Não vão")).toEqual(["Foguete"]);
    expect(nomesEm("Sem resposta")).toEqual(["Eu Mesmo", "Muralha", "Zeca"]);
  });
});

describe("PartidaView: states", () => {
  it("a cancelled Partida says so and takes no answers or management", () => {
    abrir(partida([vai("eu")], { cancelada_em: "2026-11-20T09:00:00Z" }), "dono");
    expect(screen.getByText("Partida cancelada.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mudar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mais ações" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compartilhar partida" })).not.toBeInTheDocument();
  });

  it("a Partida that started takes no answers", () => {
    abrir(partida([vai("eu")], { inicio: "2026-11-20T11:00:00Z" }));
    expect(screen.getByText("Essa partida já começou.")).toBeInTheDocument();
    expect(suaPresenca().getByText("Você vai")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mudar" })).not.toBeInTheDocument();
  });

  it("a membro sees no Times before they're published; an organizer sees where to draw them", () => {
    abrir(partida([]), "membro");
    expect(screen.queryByRole("region", { name: "Sorteio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mais ações" })).not.toBeInTheDocument();
  });

  it("on the fut's home it's the next Partida, with a link to all of them", () => {
    servidor.dados = partida([]);
    render(
      <PartidaView
        grupo={grupo("membro")}
        userId={EU}
        inicial={partida([])}
        jogadores={JOGADORES}
        agora={AGORA}
        naInicio
      />,
    );
    expect(screen.getByText("Próxima partida")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todas as partidas" })).toHaveAttribute(
      "href",
      "/g/fut-do-dev/partidas",
    );
    expect(screen.queryByRole("link", { name: "Partidas" })).not.toBeInTheDocument();
  });
});

describe("PartidaView: managing", () => {
  const gerenciar = async (usuario: ReturnType<typeof userEvent.setup>, acao: string) => {
    await usuario.click(screen.getByRole("button", { name: "Mais ações" }));
    await usuario.click(
      within(screen.getByLabelText("Gerenciar partida", { selector: "[popover]" })).getByRole("button", { name: acao }),
    );
  };

  it("an organizer answers for someone, finding them by name", async () => {
    const usuario = abrir(partida([vai("bala")]), "admin");
    expect(screen.getByRole("region", { name: "Sorteio" })).toBeInTheDocument();
    await gerenciar(usuario, "Responder por alguém");

    const modal = within(screen.getByRole("dialog"));
    expect(modal.getByRole("heading", { name: "Responder por alguém" })).toBeInTheDocument();
    const lista = () => modal.getByRole("list", { name: "Jogadores do fut" });
    expect(within(lista()).getAllByRole("listitem")).toHaveLength(5);

    await usuario.type(modal.getByRole("textbox", { name: "Buscar jogador" }), "mur");
    expect(within(lista()).getAllByRole("listitem")).toHaveLength(1);
    expect(within(lista()).getByText("Sem resposta")).toBeInTheDocument();

    await usuario.click(modal.getByRole("button", { name: "Marcar Muralha: vou" }));

    expect(m.responderPresenca).toHaveBeenCalledWith("fut-do-dev", "p1", "muralha", true);
    expect(await within(lista()).findByText("Vai")).toBeInTheDocument();
    expect(modal.queryByRole("button", { name: "Marcar Muralha: vou" })).not.toBeInTheDocument();
    expect(modal.getByRole("button", { name: "Marcar Muralha: não vou" })).toBeInTheDocument();
  });

  it("cancels the Partida after the confirmation", async () => {
    m.cancelarPartida.mockImplementation(async () => {
      servidor.dados = {
        ...servidor.dados!,
        partida: { ...servidor.dados!.partida, cancelada_em: "2026-11-20T12:00:00Z" },
      };
      return ok();
    });
    const usuario = abrir(partida([]), "dono");

    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await gerenciar(usuario, "Cancelar partida");
    expect(m.cancelarPartida).not.toHaveBeenCalled();

    await gerenciar(usuario, "Cancelar partida");
    expect(await screen.findByText("Partida cancelada.")).toBeInTheDocument();
    expect(m.cancelarPartida).toHaveBeenCalledWith("fut-do-dev", "p1");
    expect(m.toast.success).toHaveBeenCalledWith("Partida cancelada");
  });

  it("opens the Partida's form to edit it", async () => {
    const usuario = abrir(partida([]), "dono");
    await gerenciar(usuario, "Editar");
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Editar partida" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Arena Central")).toBeInTheDocument();
  });
});
