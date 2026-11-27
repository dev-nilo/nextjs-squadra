import type { SupabaseClient } from "@supabase/supabase-js";

export const PLAYER_IMAGES_BUCKET = "player-images";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function isDataUrlImage(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("data:");
}

/**
 * Upload a base64 image to Storage, under the Grupo's folder, and return its
 * public URL and its path in the bucket.
 *
 * Every upload gets a file of its own (`<grupo_id>/<jogador_id>.<token>.<ext>`)
 * and never replaces one (#116). A file in use only goes away in the save that
 * stopped using it, so a save refused because the card changed in another tab
 * can't swap the photo the card shows. The `<jogador_id>.` prefix is what marks
 * the file as that Jogador's own (`caminhoDaFotoDoJogador`). The cache stays
 * at an hour: a file never changes, but a deleted photo should stop loading.
 */
export async function uploadPlayerImage(
  supabase: SupabaseClient,
  grupoId: string,
  playerId: string,
  dataUrl: string,
): Promise<{ url: string; caminho: string }> {
  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type.includes("png") ? "png" : "jpg";
  // getRandomValues, not randomUUID: it also works outside a secure context.
  const token = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
  const caminho = `${grupoId}/${playerId}.${token}.${ext}`;

  const { error } = await supabase.storage.from(PLAYER_IMAGES_BUCKET).upload(caminho, blob, {
    upsert: false,
    contentType: blob.type || "image/jpeg",
    cacheControl: "3600",
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(PLAYER_IMAGES_BUCKET).getPublicUrl(caminho);
  return { url: data.publicUrl, caminho };
}

/**
 * Deletes a photo this screen just uploaded, when the save it was for was
 * certainly refused. Nothing points at it: its path is new and only this
 * upload knows it. Best effort: a leftover file costs storage, not correctness.
 */
export async function apagarFotoEnviada(supabase: SupabaseClient, caminho: string) {
  try {
    const { data, error } = await supabase.storage.from(PLAYER_IMAGES_BUCKET).remove([caminho]);
    if (error) throw error;
    // RLS filters what it can't delete (an expired session, a papel lost meanwhile) without an error.
    if (!data?.length) throw new Error(`nothing removed at ${caminho}`);
  } catch (e) {
    console.error("[elenco] Cleanup of a refused photo failed:", e);
  }
}
