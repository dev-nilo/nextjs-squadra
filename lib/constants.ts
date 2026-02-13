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

export const TEAM_COLORS = [
    {
        color: "from-primary/30 to-card",
        borderColor: "border-primary/40",
        headerColor: "text-primary-foreground",
    },
    {
        color: "from-destructive/20 to-card",
        borderColor: "border-destructive/40",
        headerColor: "text-destructive-foreground",
    },
    {
        color: "from-chart-1/20 to-card",
        borderColor: "border-chart-1/40",
        headerColor: "text-chart-1",
    },
    {
        color: "from-chart-2/20 to-card",
        borderColor: "border-chart-2/40",
        headerColor: "text-chart-2",
    },
    {
        color: "from-chart-3/20 to-card",
        borderColor: "border-chart-3/40",
        headerColor: "text-chart-3",
    },
    {
        color: "from-chart-4/20 to-card",
        borderColor: "border-chart-4/40",
        headerColor: "text-chart-4",
    },
    {
        color: "from-chart-5/20 to-card",
        borderColor: "border-chart-5/40",
        headerColor: "text-chart-5",
    },
    {
        color: "from-accent/20 to-card",
        borderColor: "border-accent/40",
        headerColor: "text-accent-foreground",
    },
];
