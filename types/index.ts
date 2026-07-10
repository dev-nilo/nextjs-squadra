export type PlayerPosition = "GOL" | "FIX" | "ALA" | "ATA";

export interface Attributes {
    velocidade: number;
    resistencia: number;
    chute: number;
    posicionamento: number;
    defesa: number;
    drible: number;
    passe: number;
    fisico: number;
}

export interface Player {
    id: string;
    name: string;
    position: PlayerPosition;
    nationality: string;
    image: string | null;
    attributes: Attributes;
    rating: number;
    user_id?: string;
}

export interface TeamData {
    name: string;
    members: Player[];
    avg: number;
    color: string;
    borderColor: string;
    headerColor: string;
}
