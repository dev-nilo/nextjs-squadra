import { z } from "zod";
import { Attributes, Player, PlayerPosition } from "@/types";
import { PLAYER_IMAGES_BUCKET } from "./player-image";

export const DEFAULT_ATTRIBUTES: Attributes = {
  velocidade: 60,
  resistencia: 60,
  chute: 60,
  posicionamento: 60,
  defesa: 60,
  drible: 60,
  passe: 60,
  fisico: 60,
};

/**
 * The Overall as the screen previews it (the edit modal, a CSV import): the
 * rounded mean of the attributes. The database computes the stored value the
 * same way (trigger players_ovr) and ignores whatever a client sends.
 */
export const calculateOVR = (attrs: Attributes): number => {
  const values = Object.values(attrs);
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
};

/** The players columns every read of a live Jogador selects. */
export const COLUNAS_DO_JOGADOR =
  "id, grupo_id, user_id, conta_id, name, position, nationality, image_url, ovr, versao, velocidade, resistencia, chute, posicionamento, defesa, drible, passe, fisico";

/** A players row, as COLUNAS_DO_JOGADOR reads it. */
export type LinhaDoJogador = Attributes & {
  id: string;
  grupo_id: string;
  user_id: string | null;
  conta_id: string | null;
  name: string;
  position: PlayerPosition;
  nationality: string;
  image_url: string | null;
  ovr: number;
  versao: number;
};

/** A players row as the app's Jogador. The rating is the database's, never recomputed here. */
export function jogadorDaLinha(linha: LinhaDoJogador): Player {
  return {
    id: linha.id,
    name: linha.name,
    position: linha.position,
    nationality: linha.nationality,
    image: linha.image_url,
    attributes: {
      velocidade: linha.velocidade,
      resistencia: linha.resistencia,
      chute: linha.chute,
      posicionamento: linha.posicionamento,
      defesa: linha.defesa,
      drible: linha.drible,
      passe: linha.passe,
      fisico: linha.fisico,
    },
    rating: linha.ovr,
    user_id: linha.user_id ?? undefined,
    grupo_id: linha.grupo_id,
    conta_id: linha.conta_id ?? undefined,
    versao: linha.versao,
  };
}

const atributo = z
  .number({ message: "Atributo inválido." })
  .int("Atributo inválido.")
  .min(0, "Os atributos vão de 0 a 99.")
  .max(99, "Os atributos vão de 0 a 99.");

/**
 * A Jogador as the Elenco's Server Actions accept it. The rating isn't here:
 * the server computes it from the attributes. `id` comes from the browser so
 * a new photo can be uploaded under it before the row exists.
 */
export const jogadorSchema = z.object({
  id: z.string().uuid("Jogador inválido."),
  name: z.string().trim().min(1, "Dê um nome pro jogador.").max(40, "Use até 40 caracteres no nome."),
  position: z.enum(["GOL", "FIX", "ALA", "ATA"], { message: "Escolha uma posição." }),
  nationality: z.string().regex(/^[A-Z]{2}$/, "País inválido."),
  image: z.string().max(2048).nullable(),
  /** The card's version when it was read; a save of an older one is refused. None for a new card. */
  versao: z.number().int().positive().optional(),
  attributes: z.object({
    velocidade: atributo,
    resistencia: atributo,
    chute: atributo,
    posicionamento: atributo,
    defesa: atributo,
    drible: atributo,
    passe: atributo,
    fisico: atributo,
  }),
});

export type DadosDoJogador = z.infer<typeof jogadorSchema>;

/**
 * The `players` columns a save writes. The author and the Grupo are set by the
 * caller; the Overall by the database (trigger players_ovr).
 */
export function jogadorParaLinha(jogador: DadosDoJogador) {
  return {
    name: jogador.name,
    position: jogador.position,
    nationality: jogador.nationality,
    image_url: jogador.image,
    ...jogador.attributes,
  };
}

/**
 * Where a photo the app uploaded for this Grupo lives in the player-images
 * bucket (`<grupo_id>/<file>`): a public URL on this project's Supabase, for a
 * file directly in the Grupo's folder. Null for anything else (another site,
 * another Grupo's folder, a subfolder, an inline image).
 */
export function caminhoDaFoto(url: string | null | undefined, grupoId: string, supabaseUrl: string): string | null {
  if (!url) return null;
  try {
    const foto = new URL(url);
    if (foto.origin !== new URL(supabaseUrl).origin) return null;
    const pasta = `/storage/v1/object/public/${PLAYER_IMAGES_BUCKET}/${grupoId}/`;
    if (!foto.pathname.startsWith(pasta)) return null;
    const arquivo = decodeURIComponent(foto.pathname.slice(pasta.length));
    return arquivo && !arquivo.includes("/") ? `${grupoId}/${arquivo}` : null;
  } catch {
    return null;
  }
}

/** A photo the app uploaded for this Grupo. Anything else isn't saved. */
export function ehFotoDoGrupo(url: string, grupoId: string, supabaseUrl: string): boolean {
  return caminhoDaFoto(url, grupoId, supabaseUrl) !== null;
}

/**
 * The Jogador's own photo file, as the upload names it
 * (`<grupo_id>/<jogador_id>.<ext>`), or null. Only this file is ever deleted
 * along with the Jogador, so a card that points at someone else's photo (only
 * a tampered request makes one) can't take that photo with it.
 */
export function caminhoDaFotoDoJogador(
  url: string | null | undefined,
  grupoId: string,
  jogadorId: string,
  supabaseUrl: string,
): string | null {
  const caminho = caminhoDaFoto(url, grupoId, supabaseUrl);
  return caminho?.startsWith(`${grupoId}/${jogadorId}.`) ? caminho : null;
}
