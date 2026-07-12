import type { Player } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensurePlayerImageUrl, isDataUrlImage } from "@/lib/player-image";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
    return UUID_RE.test(value);
}

export type SupabasePlayerWriteRow = {
    id?: string;
    user_id: string;
    name: string;
    image_url: string | null;
    position: string;
    nationality?: string;
    ovr: number;
    velocidade: number;
    resistencia: number;
    chute: number;
    posicionamento: number;
    defesa: number;
    drible: number;
    passe: number;
    fisico: number;
};

function isMissingNationalityColumn(error: { message?: string; code?: string } | null): boolean {
    if (!error) return false;
    const msg = (error.message || "").toLowerCase();
    return (
        error.code === "42703" ||
        (msg.includes("nationality") && (msg.includes("does not exist") || msg.includes("schema cache")))
    );
}

export function playerToSupabaseRow(
    player: Player,
    userId: string,
    options?: { includeNationality?: boolean },
): SupabasePlayerWriteRow {
    const includeNationality = options?.includeNationality !== false;
    const row: SupabasePlayerWriteRow = {
        user_id: userId,
        name: player.name,
        image_url: player.image,
        position: player.position,
        ovr: player.rating,
        velocidade: player.attributes.velocidade,
        resistencia: player.attributes.resistencia,
        chute: player.attributes.chute,
        posicionamento: player.attributes.posicionamento,
        defesa: player.attributes.defesa,
        drible: player.attributes.drible,
        passe: player.attributes.passe,
        fisico: player.attributes.fisico,
    };
    if (includeNationality) {
        row.nationality = player.nationality;
    }
    if (isUuid(player.id)) {
        row.id = player.id;
    }
    return row;
}

/** Upload image to Storage when possible; otherwise keep data URL / existing URL. */
export async function preparePlayerForCloud(
    supabase: SupabaseClient,
    userId: string,
    player: Player,
): Promise<Player> {
    if (!isDataUrlImage(player.image)) {
        return player;
    }
    try {
        return await ensurePlayerImageUrl(supabase, userId, player);
    } catch (err) {
        console.warn("[app] Storage upload unavailable, keeping inline image in image_url:", err);
        return player;
    }
}

type WriteResult = { error: { message?: string; code?: string } | null; data?: { id?: string } | null };

async function writeRow(
    supabase: SupabaseClient,
    row: SupabasePlayerWriteRow,
    mode: "insert" | "update" | "upsert",
    playerId: string,
): Promise<WriteResult> {
    if (mode === "insert") {
        const { data, error } = await supabase.from("players").insert(row).select("id").single();
        return { data, error };
    }
    if (mode === "update") {
        const { error } = await supabase.from("players").update(row).eq("id", playerId);
        return { error };
    }
    const { data, error } = await supabase
        .from("players")
        .upsert(row, { onConflict: "id" })
        .select("id")
        .single();
    return { data, error };
}

/**
 * Sync player row. Retries without nationality if that column is missing in the DB.
 */
export async function syncPlayerRow(
    supabase: SupabaseClient,
    player: Player,
    userId: string,
    mode: "insert" | "update" | "upsert",
): Promise<{ id?: string; usedNationality: boolean }> {
    const prepared = await preparePlayerForCloud(supabase, userId, player);
    const fullRow = playerToSupabaseRow(prepared, userId, { includeNationality: true });

    let result = await writeRow(supabase, fullRow, mode, prepared.id);
    let usedNationality = true;

    if (result.error && isMissingNationalityColumn(result.error)) {
        console.warn("[app] players.nationality missing — syncing without it");
        const fallbackRow = playerToSupabaseRow(prepared, userId, { includeNationality: false });
        result = await writeRow(supabase, fallbackRow, mode, prepared.id);
        usedNationality = false;
    }

    if (result.error) {
        throw result.error;
    }

    return { id: result.data?.id ?? prepared.id, usedNationality };
}
