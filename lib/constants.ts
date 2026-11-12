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

/** Team kit colors by Time index (`--team-1…6` tokens). `crest` fills the team badge, `ring` marks a drop target. */
export const TEAM_COLORS = [
    { crest: "bg-team-1", ring: "ring-team-1" },
    { crest: "bg-team-2", ring: "ring-team-2" },
    { crest: "bg-team-3", ring: "ring-team-3" },
    { crest: "bg-team-4", ring: "ring-team-4" },
    { crest: "bg-team-5", ring: "ring-team-5" },
    { crest: "bg-team-6", ring: "ring-team-6" },
];

export function getTeamPresentation(index: number) {
    return TEAM_COLORS[index % TEAM_COLORS.length];
}