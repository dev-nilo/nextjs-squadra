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
    /** Who created the Jogador. Ownership is the Grupo's (`grupo_id`). */
    user_id?: string;
    grupo_id?: string;
    /** The account of the person this Jogador is ("sou esse aqui"), if any. */
    conta_id?: string;
}

/** Domain Time from a Sorteio — presentation tokens live in the UI. */
export interface Time {
    name: string;
    members: Player[];
    avg: number;
}
