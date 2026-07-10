import type { Player } from "@/types";

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

export function playerToSupabaseRow(
    player: Player,
    userId: string,
): SupabasePlayerWriteRow {
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
    if (isUuid(player.id)) {
        row.id = player.id;
    }
    return row;
}
