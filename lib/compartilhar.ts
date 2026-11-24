export type ComoCompartilhou = "compartilhou" | "copiou" | "desistiu" | "falhou";

/**
 * On a phone, hands the text to the share sheet (WhatsApp is one tap away
 * there). Without a touch screen it copies the text, to paste into WhatsApp
 * Web: desktop Chrome, Edge and Safari have a share sheet too, but it seldom
 * lists WhatsApp. Closing the sheet, or tapping again while it's open, is
 * "desistiu", not an error. The text carries the link itself: some apps drop
 * `text` when a separate `url` is given.
 *
 * If the sheet refuses for another reason the text is copied instead; in Safari
 * that copy can fail too (the tap was used up by the sheet), and it says so.
 */
export async function compartilharTexto(texto: string): Promise<ComoCompartilhou> {
  const toque = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (toque && typeof navigator.share === "function") {
    try {
      await navigator.share({ text: texto });
      return "compartilhou";
    } catch (erro) {
      if (erro instanceof DOMException && (erro.name === "AbortError" || erro.name === "InvalidStateError")) return "desistiu";
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    return "copiou";
  } catch {
    return "falhou";
  }
}
