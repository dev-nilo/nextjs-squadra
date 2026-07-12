import type { SupabaseClient } from "@supabase/supabase-js";
import type { Player } from "@/types";

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

/** Upload a base64 image to Storage and return a public URL. */
export async function uploadPlayerImage(
    supabase: SupabaseClient,
    userId: string,
    playerId: string,
    dataUrl: string,
): Promise<string> {
    const blob = dataUrlToBlob(dataUrl);
    const ext = blob.type.includes("png") ? "png" : "jpg";
    const path = `${userId}/${playerId}.${ext}`;

    const { error } = await supabase.storage
        .from(PLAYER_IMAGES_BUCKET)
        .upload(path, blob, {
            upsert: true,
            contentType: blob.type || "image/jpeg",
            cacheControl: "3600",
        });

    if (error) {
        throw error;
    }

    const { data } = supabase.storage.from(PLAYER_IMAGES_BUCKET).getPublicUrl(path);
    // Bust CDN/browser cache after replace
    return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * If the player still has an inline base64 image, upload it and return
 * a copy with the public URL. Otherwise returns the same player.
 */
export async function ensurePlayerImageUrl(
    supabase: SupabaseClient,
    userId: string,
    player: Player,
): Promise<Player> {
    if (!isDataUrlImage(player.image)) {
        return player;
    }

    const publicUrl = await uploadPlayerImage(
        supabase,
        userId,
        player.id,
        player.image as string,
    );

    return { ...player, image: publicUrl };
}
