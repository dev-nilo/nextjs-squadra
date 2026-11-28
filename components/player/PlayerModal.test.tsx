import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ATTRIBUTES } from "@/lib/jogador";
import type { Player } from "@/types";
import { PlayerModal } from "./PlayerModal";

// Resizing a photo needs a canvas; here the photo becomes a fixed data URL.
vi.mock("@/lib/player-image-processing", () => ({
  processImage: vi.fn(async () => "data:image/webp;base64,FOTO"),
}));
const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("sonner", () => ({ toast }));

const foguete: Player = {
  id: "j1",
  name: "Foguete",
  position: "ATA",
  nationality: "BR",
  image: null,
  rating: 80,
  attributes: { ...DEFAULT_ATTRIBUTES, velocidade: 90 },
  versao: 3,
};

function abrir(props: Partial<React.ComponentProps<typeof PlayerModal>> = {}) {
  const onSave = vi.fn(async () => true);
  const onClose = vi.fn();
  render(<PlayerModal isOpen onClose={onClose} onSave={onSave} {...props} />);
  return { onSave, onClose, usuario: userEvent.setup() };
}

describe("PlayerModal", () => {
  it("won't create a carta without a name, and says so next to the field", async () => {
    const { onSave, usuario } = abrir();
    expect(screen.getByRole("heading", { name: "Nova carta" })).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Criar carta" }));

    expect(onSave).not.toHaveBeenCalled();
    const nome = screen.getByRole("textbox", { name: /Nome do jogador/ });
    expect(nome).toHaveAttribute("aria-invalid", "true");
    expect(nome).toHaveAccessibleDescription("Escreva o nome do jogador.");

    await usuario.type(nome, "Z");
    expect(screen.queryByText("Escreva o nome do jogador.")).not.toBeInTheDocument();
  });

  it("creates a carta with the name, position, country and attributes chosen", async () => {
    const { onSave, onClose, usuario } = abrir();
    await usuario.type(screen.getByRole("textbox", { name: /Nome do jogador/ }), "  Paredão  ");
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Posição" }), "GOL");
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Nacionalidade" }), "AR");
    fireEvent.change(screen.getByRole("slider", { name: "Defesa" }), { target: { value: "95" } });

    expect(screen.getByRole("heading", { name: /^Atributos \(OVR: \d+\)$/ })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Criar carta" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Paredão",
        position: "GOL",
        nationality: "AR",
        image: null,
        attributes: { ...DEFAULT_ATTRIBUTES, defesa: 95 },
        versao: undefined,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("the OVR follows the attributes", () => {
    abrir();
    const antes = screen.getByRole("heading", { name: /^Atributos/ }).textContent;
    for (const nome of ["Velocidade", "Chute", "Drible", "Passe"]) {
      fireEvent.change(screen.getByRole("slider", { name: nome }), { target: { value: "99" } });
    }
    expect(screen.getByRole("heading", { name: /^Atributos/ }).textContent).not.toBe(antes);
    expect(screen.getByRole("slider", { name: "Velocidade" })).toHaveValue("99");
  });

  it("edits a carta keeping its id and versão, so a stale save is refused", async () => {
    const { onSave, usuario } = abrir({ initialData: foguete });
    expect(screen.getByRole("heading", { name: "Editar carta" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Nome do jogador/ })).toHaveValue("Foguete");
    expect(screen.getByRole("slider", { name: "Velocidade" })).toHaveValue("90");

    await usuario.click(screen.getByRole("button", { name: "Atualizar carta" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "j1", versao: 3, name: "Foguete" }));
  });

  it("stays open when the save fails, so nothing typed is lost", async () => {
    const { onClose, usuario } = abrir({ initialData: foguete, onSave: vi.fn(async () => false) });
    await usuario.click(screen.getByRole("button", { name: "Atualizar carta" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: /Nome do jogador/ })).toHaveValue("Foguete");
  });

  it("adds a photo, shows it, and removes it", async () => {
    const { onSave, usuario } = abrir({ initialData: foguete });
    expect(screen.getByRole("button", { name: "Adicionar foto" })).toBeInTheDocument();

    await usuario.upload(screen.getByLabelText("Foto do jogador"), new File(["x"], "foto.png", { type: "image/png" }));

    expect(await screen.findByRole("img", { name: "Prévia" })).toHaveAttribute("src", "data:image/webp;base64,FOTO");
    expect(screen.getByRole("button", { name: "Alterar foto" })).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.queryByRole("img", { name: "Prévia" })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Atualizar carta" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ image: null }));
  });

  it("says so when a photo can't be used", async () => {
    const { processImage } = await import("@/lib/player-image-processing");
    vi.mocked(processImage).mockRejectedValueOnce(new Error("not an image"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { usuario } = abrir();

    await usuario.upload(screen.getByLabelText("Foto do jogador"), new File(["x"], "doc.png", { type: "image/png" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não deu pra usar essa foto.", expect.anything()));
    expect(screen.queryByRole("img", { name: "Prévia" })).not.toBeInTheDocument();
  });
});
