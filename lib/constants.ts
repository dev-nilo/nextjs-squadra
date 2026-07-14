import { PlayerPosition } from "@/types";

export const OUTFIELD_LABELS = {
    velocidade: "VEL",
    resistencia: "RES",
    chute: "CHU",
    posicionamento: "POS",
    defesa: "DEF",
    drible: "DRI",
    passe: "PAS",
    fisico: "FIS",
};

export const GK_LABELS = {
    velocidade: "VEL",
    resistencia: "RES",
    chute: "CHU",
    posicionamento: "POS",
    defesa: "DEF",
    drible: "DRI",
    passe: "PAS",
    fisico: "FIS",
};

export const POSITIONS: PlayerPosition[] = ["GOL", "FIX", "ALA", "ATA"];

export const LOCAL_STORAGE_KEY = "fut-cards-players-v2";
export const LOCAL_STORAGE_KEY_LEGACY = "fut-cards-players-v2";

/** Per-user cache key — never share player data across accounts on the same browser. */
export function getLocalStorageKey(userId?: string | null): string {
    return userId ? `${LOCAL_STORAGE_KEY}:user:${userId}` : `${LOCAL_STORAGE_KEY}:guest`;
}

export const TEAM_COLORS = [
    { color: "bg-primary/10", borderColor: "border-primary/20", headerColor: "text-primary" },
    { color: "bg-danger/10", borderColor: "border-danger/20", headerColor: "text-danger" },
    { color: "bg-success/10", borderColor: "border-success/20", headerColor: "text-success" },
    { color: "bg-warning/10", borderColor: "border-warning/20", headerColor: "text-warning" },
    { color: "bg-secondary/10", borderColor: "border-secondary/20", headerColor: "text-secondary" },
    { color: "bg-default/10", borderColor: "border-default/20", headerColor: "text-default-foreground" },
    { color: "bg-primary/10", borderColor: "border-primary/20", headerColor: "text-primary" },
    { color: "bg-danger/10", borderColor: "border-danger/20", headerColor: "text-danger" },
];

export function getTeamPresentation(index: number) {
    return TEAM_COLORS[index % TEAM_COLORS.length];
}