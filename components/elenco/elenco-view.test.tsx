import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Participacao } from "@/lib/grupo";
import { falha, ok, recusa } from "@/tests/componentes/acoes";
import { jogador } from "@/tests/componentes/fabrica";
import { ElencoView } from "./elenco-view";

const acoes = vi.hoisted(() => ({
  salvarJogador: vi.fn(),
  excluirJogador: vi.fn(),
  importarJogadores: vi.fn(),
  vincularJogador: vi.fn(),
  desvincularJogador: vi.fn(),
  uploadPlayerImage: vi.fn(),
  apagarFotoEnviada: vi.fn(),
  semConexao: { valor: false },
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/app/actions/jogador", () => ({
  salvarJogador: acoes.salvarJogador,
  excluirJogador: acoes.excluirJogador,
  importarJogadores: acoes.importarJogadores,
}));
vi.mock("@/app/actions/vinculo", () => ({
  vincularJogador: acoes.vincularJogador,
  desvincularJogador: acoes.desvincularJogador,
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/player-image", async (original) => ({
  ...(await original<typeof import("@/lib/player-image")>()),
  uploadPlayerImage: acoes.uploadPlayerImage,
  apagarFotoEnviada: acoes.apagarFotoEnviada,
}));
vi.mock("@/lib/player-image-processing", () => ({ processImage: async () => "data:image/webp;base64,FOTO" }));
vi.mock("@/lib/pwa/conexao", () => ({ useSemConexao: () => acoes.semConexao.valor }));
vi.mock("sonner", () => ({ toast: acoes.toast }));

const EU = "conta-eu";
const grupo = (papel: Participacao["papel"]): Participacao => ({
  id: "g1",
  slug: "fut-do-dev",
  nome: "Fut do Dev",
  papel,
});
const ELENCO = [
  jogador("Foguete", { rating: 80, position: "ATA" }),
  jogador("Bala", { rating: 70, position: "ALA" }),
  jogador("Paredão", { rating: 75, position: "GOL" }),
  jogador("Amigo", { rating: 60, position: "FIX", conta_id: "conta-amigo" }),
];

function abrir(papel: Participacao["papel"] = "dono", jogadores = ELENCO) {
  render(<ElencoView grupo={grupo(papel)} jogadores={jogadores} userId={EU} />);
  return userEvent.setup();
}

/** The cartas in the order shown, by name (a carta with nothing to tap is an image). */
const cartas = () =>
  screen.queryAllByRole("img", { name: /^Carta de / }).concat(screen.queryAllByRole("button", { name: /^Carta de / }));
const nomesDasCartas = () =>
  cartas().map(
    (c) =>
      c
        .getAttribute("aria-label")!
        .replace(/^Carta de /, "")
        .split(",")[0],
  );

async function acaoDaCarta(usuario: ReturnType<typeof userEvent.setup>, nome: string, acao: string) {
  await usuario.click(screen.getByRole("button", { name: `Ações da carta de ${nome}` }));
  await usuario.click(
    within(screen.getByLabelText(`Ações da carta de ${nome}`, { selector: "[popover]" })).getByRole("button", {
      name: acao,
    }),
  );
}

beforeEach(() => {
  acoes.semConexao.valor = false;
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});

describe("ElencoView", () => {
  it("shows the album, highest OVR first, with the count in the title", () => {
    abrir();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Elenco 4");
    expect(nomesDasCartas()).toEqual(["Foguete", "Paredão", "Bala", "Amigo"]);
  });

  it("sorts by name and by position", async () => {
    const usuario = abrir();
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "Nome");
    expect(nomesDasCartas()).toEqual(["Amigo", "Bala", "Foguete", "Paredão"]);
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "Posição");
    expect(nomesDasCartas()).toEqual(["Bala", "Foguete", "Amigo", "Paredão"]); // ALA, ATA, FIX, GOL
  });

  it("filters by name, and offers to clear a search that finds no one", async () => {
    const usuario = abrir();
    await usuario.type(screen.getByRole("textbox", { name: "Buscar jogador" }), "par");
    expect(nomesDasCartas()).toEqual(["Paredão"]);

    await usuario.type(screen.getByRole("textbox", { name: "Buscar jogador" }), "xyz");
    expect(screen.getByText("Nenhum jogador com “parxyz”.")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(nomesDasCartas()).toHaveLength(4);
  });

  it("creates a carta through the Server Action", async () => {
    acoes.salvarJogador.mockResolvedValue(ok({ criado: true }));
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Nova carta" }));
    await usuario.type(screen.getByRole("textbox", { name: /Nome do jogador/ }), "Novato");
    await usuario.click(screen.getByRole("button", { name: "Criar carta" }));

    await waitFor(() => expect(acoes.toast.success).toHaveBeenCalledWith("Carta criada"));
    expect(acoes.salvarJogador).toHaveBeenCalledWith(
      "fut-do-dev",
      expect.objectContaining({ name: "Novato", image: null }),
    );
    expect(acoes.uploadPlayerImage).not.toHaveBeenCalled();
  });

  it("sends a new photo to Storage first, and saves its URL", async () => {
    acoes.uploadPlayerImage.mockResolvedValue({ url: "https://cdn/foto.webp", caminho: "g1/foto.webp" });
    acoes.salvarJogador.mockResolvedValue(ok({ criado: true }));
    const usuario = abrir();
    await usuario.click(screen.getByRole("button", { name: "Nova carta" }));
    await usuario.type(screen.getByRole("textbox", { name: /Nome do jogador/ }), "Com Foto");
    await usuario.upload(screen.getByLabelText("Foto do jogador"), new File(["x"], "f.png", { type: "image/png" }));
    await screen.findByRole("img", { name: "Prévia" });
    await usuario.click(screen.getByRole("button", { name: "Criar carta" }));

    await waitFor(() => expect(acoes.salvarJogador).toHaveBeenCalled());
    expect(acoes.uploadPlayerImage).toHaveBeenCalledWith({}, "g1", expect.any(String), "data:image/webp;base64,FOTO");
    expect(acoes.salvarJogador).toHaveBeenCalledWith(
      "fut-do-dev",
      expect.objectContaining({ image: "https://cdn/foto.webp" }),
    );
  });

  it("deletes the uploaded photo when the server refuses the carta, but not after an unexpected failure", async () => {
    acoes.uploadPlayerImage.mockResolvedValue({ url: "https://cdn/foto.webp", caminho: "g1/foto.webp" });
    const usuario = abrir();
    const salvarComFoto = async () => {
      await usuario.click(screen.getByRole("button", { name: "Nova carta" }));
      await usuario.type(screen.getByRole("textbox", { name: /Nome do jogador/ }), "X");
      await usuario.upload(screen.getByLabelText("Foto do jogador"), new File(["x"], "f.png", { type: "image/png" }));
      await screen.findByRole("img", { name: "Prévia" });
      await usuario.click(screen.getByRole("button", { name: "Criar carta" }));
      await waitFor(() => expect(acoes.toast.error).toHaveBeenCalled());
    };

    acoes.salvarJogador.mockResolvedValueOnce(recusa("Essa carta mudou. Abra de novo."));
    await salvarComFoto();
    expect(acoes.apagarFotoEnviada).toHaveBeenCalledWith({}, "g1/foto.webp");
    expect(acoes.toast.error).toHaveBeenCalledWith("Não deu pra salvar a carta", {
      description: "Essa carta mudou. Abra de novo.",
    });
    // The modal stays open with what was typed.
    expect(screen.getByRole("textbox", { name: /Nome do jogador/ })).toHaveValue("X");

    acoes.apagarFotoEnviada.mockClear();
    acoes.toast.error.mockClear();
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    acoes.salvarJogador.mockResolvedValueOnce(falha());
    await salvarComFoto();
    expect(acoes.apagarFotoEnviada).not.toHaveBeenCalled();
  });

  it("edits a carta from its ⋯ menu", async () => {
    acoes.salvarJogador.mockResolvedValue(ok({ criado: false }));
    const usuario = abrir();
    await acaoDaCarta(usuario, "Bala", "Editar");
    expect(screen.getByRole("heading", { name: "Editar carta" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Nome do jogador/ })).toHaveValue("Bala");

    await usuario.click(screen.getByRole("button", { name: "Atualizar carta" }));
    await waitFor(() => expect(acoes.toast.success).toHaveBeenCalledWith("Carta atualizada"));
    expect(acoes.salvarJogador).toHaveBeenCalledWith("fut-do-dev", expect.objectContaining({ id: "bala", versao: 1 }));
  });

  it("deletes a carta only after the confirmation", async () => {
    acoes.excluirJogador.mockResolvedValue(ok());
    const usuario = abrir();

    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await acaoDaCarta(usuario, "Bala", "Excluir");
    expect(acoes.excluirJogador).not.toHaveBeenCalled();

    await acaoDaCarta(usuario, "Bala", "Excluir");
    expect(window.confirm).toHaveBeenLastCalledWith("Excluir a carta de Bala? Não dá pra desfazer.");
    await waitFor(() => expect(acoes.toast.success).toHaveBeenCalledWith("Carta excluída"));
    expect(acoes.excluirJogador).toHaveBeenCalledWith("fut-do-dev", "bala");
  });

  it('lets someone with no carta of their own say "Sou eu" on a carta with no account', async () => {
    acoes.vincularJogador.mockResolvedValue(ok());
    const usuario = abrir("membro");
    await acaoDaCarta(usuario, "Foguete", "Sou eu");
    await waitFor(() => expect(acoes.toast.success).toHaveBeenCalledWith("Pronto, você é o Foguete"));
    expect(acoes.vincularJogador).toHaveBeenCalledWith("fut-do-dev", "foguete");
    // A carta that already has an account has nothing for a membro to do.
    expect(screen.queryByRole("button", { name: "Ações da carta de Amigo" })).not.toBeInTheDocument();
  });

  it('offers no "Sou eu" once this person has a carta', () => {
    abrir("membro", [...ELENCO, jogador("Eu Mesmo", { conta_id: EU })]);
    expect(screen.getByRole("img", { name: /^Carta de Eu Mesmo, .*, você$/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ações da carta de Foguete" })).not.toBeInTheDocument();
  });

  it("a membro can't create, edit or import", () => {
    abrir("membro");
    expect(screen.queryByRole("button", { name: "Nova carta" })).not.toBeInTheDocument();
    const menu = screen.getByLabelText("Mais ações do elenco", { selector: "[popover]" });
    expect(within(menu).getByRole("button", { name: "Sortear rápido" })).toBeInTheDocument();
    expect(within(menu).queryByRole("button", { name: "Importar CSV" })).not.toBeInTheDocument();
  });

  it("with no signal the album is read-only", () => {
    acoes.semConexao.valor = true;
    abrir("dono");
    expect(screen.queryByRole("button", { name: "Nova carta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ações da carta de / })).not.toBeInTheDocument();
  });

  it("an empty Elenco tells the organizer how to start", () => {
    abrir("dono", []);
    expect(screen.getByText("Nenhuma carta criada ainda")).toBeInTheDocument();
    expect(screen.getByText("Toque em Nova carta para começar.")).toBeInTheDocument();
  });

  it("draws quick Times from the ticked cartas", async () => {
    const usuario = abrir();
    await usuario.click(
      within(screen.getByLabelText("Mais ações do elenco", { selector: "[popover]" })).getByRole("button", {
        name: "Sortear rápido",
      }),
    );
    expect(screen.getByText("Toque nas cartas de quem vai jogar.")).toBeInTheDocument();

    const barra = within(screen.getByRole("region", { name: "Sortear rápido" }));
    expect(barra.getByRole("button", { name: "Sortear times (0)" })).toBeDisabled();
    for (const nome of ["Foguete", "Bala", "Paredão", "Amigo"]) {
      await usuario.click(screen.getByRole("button", { name: new RegExp(`^Carta de ${nome},`) }));
    }
    expect(screen.getByRole("button", { name: /^Carta de Foguete,/ })).toHaveAttribute("aria-pressed", "true");
    await usuario.click(barra.getByRole("button", { name: "Sortear times (4)" }));

    expect(screen.getByRole("heading", { name: "Quantos times?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sortear" })).toBeDisabled(); // 3 Times of 5 by default
    fireEvent.change(screen.getByRole("slider", { name: "Número de times" }), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("slider", { name: "Mínimo por time" }), { target: { value: "2" } });
    await usuario.click(screen.getByRole("button", { name: "Sortear" }));

    expect(screen.getByRole("heading", { name: "Times sorteados" })).toBeInTheDocument();
    expect(screen.getAllByRole("region", { name: /^Time \d$/ })).toHaveLength(2);
    expect(screen.getAllByRole("listitem", { name: /, (ATA|ALA|GOL|FIX)$/ })).toHaveLength(4);
  });

  it("leaves the quick draw with Cancelar", async () => {
    const usuario = abrir();
    await usuario.click(
      within(screen.getByLabelText("Mais ações do elenco", { selector: "[popover]" })).getByRole("button", {
        name: "Sortear rápido",
      }),
    );
    await usuario.click(
      within(screen.getByRole("region", { name: "Sortear rápido" })).getByRole("button", { name: "Cancelar" }),
    );
    expect(screen.queryByRole("region", { name: "Sortear rápido" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Buscar jogador" })).toBeInTheDocument();
  });
});
