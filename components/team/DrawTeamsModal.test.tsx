import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { moveMember, teamAverage } from "@/lib/sorteio";
import type { Time } from "@/types";
import { jogador } from "@/tests/componentes/fabrica";
import { DrawTeamsModal } from "./DrawTeamsModal";

const { toPng, toast } = vi.hoisted(() => ({
  toPng: vi.fn(async () => "data:image/png;base64,TIMES"),
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("html-to-image", () => ({ toPng }));
vi.mock("sonner", () => ({ toast }));

const time = (name: string, members: ReturnType<typeof jogador>[]): Time => ({
  name,
  members,
  avg: teamAverage(members),
});
const SORTEIO: Time[] = [
  time("Time 1", [jogador("Foguete", { rating: 80 }), jogador("Bala", { rating: 70 })]),
  time("Time 2", [jogador("Paredão", { rating: 75, position: "GOL" }), jogador("Muralha", { rating: 72 })]),
];

/** The modal as the Elenco uses it: moving changes the Times, "Sortear de novo" asks the parent. */
function ComOsTimes({ onRedraw = vi.fn() }: { onRedraw?: () => void }) {
  const [times, setTimes] = useState(SORTEIO);
  return (
    <DrawTeamsModal
      isOpen
      onClose={() => {}}
      generatedTeams={times}
      onMover={(id, de, para) => setTimes((t) => moveMember(t, id, de, para))}
      onRedraw={onRedraw}
    />
  );
}

const doTime = (nome: string) => within(screen.getByRole("region", { name: nome }));

describe("DrawTeamsModal", () => {
  it("shows each Time with its players, size and average, and the difference between them", () => {
    render(<ComOsTimes />);
    expect(screen.getByRole("heading", { name: "Times sorteados" })).toBeInTheDocument();
    expect(screen.getByText("4 jogadores")).toBeInTheDocument();

    expect(doTime("Time 1").getByRole("listitem", { name: "Foguete, ATA" })).toBeInTheDocument();
    expect(doTime("Time 1").getByText("75")).toBeInTheDocument(); // (80 + 70) / 2
    expect(doTime("Time 2").getByRole("listitem", { name: "Paredão, GOL" })).toBeInTheDocument();
    expect(doTime("Time 2").getByText("2 jogadores")).toBeInTheDocument();
    expect(screen.getByText(/^\d+ pontos?$/)).toBeInTheDocument();
  });

  it("lists each Time's players by name", () => {
    render(<ComOsTimes />);
    const nomes = doTime("Time 1")
      .getAllByRole("listitem")
      .map((li) => li.getAttribute("aria-label"));
    expect(nomes).toEqual(["Bala, ATA", "Foguete, ATA"]);
  });

  it("moves a Jogador to another Time with the select beside the name", async () => {
    const usuario = userEvent.setup();
    render(<ComOsTimes />);
    const mover = screen.getByRole("combobox", { name: "Mover Foguete" });
    expect(within(mover).getByRole("option", { name: "→ Time 2" })).toBeInTheDocument();

    await usuario.selectOptions(mover, "1");

    expect(doTime("Time 2").getByRole("listitem", { name: "Foguete, ATA" })).toBeInTheDocument();
    expect(doTime("Time 1").queryByRole("listitem", { name: "Foguete, ATA" })).not.toBeInTheDocument();
    expect(doTime("Time 1").getByText("1 jogador")).toBeInTheDocument();
  });

  it("moves a Jogador by dragging the row onto another Time", () => {
    render(<ComOsTimes />);
    const linha = doTime("Time 2").getByText("Muralha");
    fireEvent.dragStart(linha);
    fireEvent.dragOver(screen.getByRole("region", { name: "Time 1" }));
    fireEvent.drop(screen.getByRole("region", { name: "Time 1" }));
    expect(doTime("Time 1").getByRole("listitem", { name: "Muralha, ATA" })).toBeInTheDocument();
  });

  it("asks for a new Sorteio", async () => {
    const onRedraw = vi.fn();
    render(<ComOsTimes onRedraw={onRedraw} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sortear de novo" }));
    expect(onRedraw).toHaveBeenCalledOnce();
  });

  it("downloads the Times as a PNG", async () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ComOsTimes />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Baixar PNG" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Imagem dos times baixada."));
    expect(toPng).toHaveBeenCalledOnce();
    const link = clique.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^squadra-times-\d{4}-\d{2}-\d{2}\.png$/);
    expect(link.href).toBe("data:image/png;base64,TIMES");
  });

  it("says so when the image can't be made", async () => {
    toPng.mockRejectedValueOnce(new Error("tainted canvas"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ComOsTimes />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Baixar PNG" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não deu pra gerar a imagem.", expect.anything()));
    expect(screen.getByRole("button", { name: "Baixar PNG" })).toBeEnabled();
  });

  it("shows nothing without a Sorteio", () => {
    const { container } = render(
      <DrawTeamsModal isOpen onClose={() => {}} generatedTeams={null} onMover={() => {}} onRedraw={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
