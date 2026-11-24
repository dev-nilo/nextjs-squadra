export type ComoCompartilhou = "compartilhou" | "copiou" | "desistiu" | "falhou";

/**
 * Hands a text to the phone's share sheet (WhatsApp is one tap away there).
 * Where there's no share sheet, as on most desktops, it copies the text
 * instead, to paste into WhatsApp Web. Closing the sheet is "desistiu", not an
 * error. The text carries the link itself: some apps drop `text` when a
 * separate `url` is given.
 */
export async function compartilharTexto(texto: string): Promise<ComoCompartilhou> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text: texto });
      return "compartilhou";
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") return "desistiu";
      // The sheet refused (no target, not allowed here): copying still works.
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    return "copiou";
  } catch {
    return "falhou";
  }
}
