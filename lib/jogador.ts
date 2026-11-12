import { z } from "zod";
import { Attributes, Player, PlayerPosition } from "@/types";
import { getCountryCode } from "./countries";
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

const STAT_KEYS: (keyof Attributes)[] = [
  "velocidade",
  "resistencia",
  "chute",
  "posicionamento",
  "defesa",
  "drible",
  "passe",
  "fisico",
];

export const coerceStat = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const n = Number(trimmed);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return undefined;
};

export const calculateOVR = (attrs: Attributes): number => {
  const values = Object.values(attrs);
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
};

const parseNestedAttributes = (
  raw: unknown,
): Partial<Record<keyof Attributes, unknown>> | null => {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Partial<Record<keyof Attributes, unknown>>;
  }
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Partial<Record<keyof Attributes, unknown>>;
      }
    } catch {
      return null;
    }
  }
  return null;
};

export const mergePlayerAttributesFromRow = (
  source: Partial<Player> & Partial<Attributes> & Record<string, unknown>,
): Attributes => {
  const nested = parseNestedAttributes(source.attributes);
  const merged: Attributes = { ...DEFAULT_ATTRIBUTES };

  for (const key of STAT_KEYS) {
    const fromRoot = coerceStat(source[key]);
    const fromNested = nested ? coerceStat(nested[key]) : undefined;
    const v = fromRoot ?? fromNested;
    if (v !== undefined) {
      merged[key] = v;
    }
  }

  return merged;
};

export const normalizeAttributes = (value: unknown): Attributes => {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<keyof Attributes, unknown>>)
      : {};

  const merged: Attributes = { ...DEFAULT_ATTRIBUTES };
  for (const key of STAT_KEYS) {
    const v = coerceStat(source[key]);
    if (v !== undefined) {
      merged[key] = v;
    }
  }
  return merged;
};

export const normalizePlayer = (player: unknown): Player => {
  const source = (player ?? {}) as Partial<Player> &
    Partial<Attributes> &
    Record<string, unknown>;

  const attributes = mergePlayerAttributesFromRow(source);

  const rating =
    coerceStat(source.rating) ??
    coerceStat(source["ovr"]) ??
    calculateOVR(attributes);

  const image =
    (typeof source.image === "string" && source.image.length > 0
      ? source.image
      : null) ??
    (typeof source.image_url === "string" && source.image_url.length > 0
      ? source.image_url
      : null);

  const position = (source.position as PlayerPosition | undefined) ?? "ATA";

  return {
    id: String(source.id ?? Date.now()),
    name:
      typeof source.name === "string" && source.name.trim()
        ? source.name.trim()
        : "Jogador",
    position,
    nationality: getCountryCode(source.nationality),
    image,
    attributes,
    rating,
    user_id: typeof source.user_id === "string" ? source.user_id : undefined,
    grupo_id: typeof source.grupo_id === "string" ? source.grupo_id : undefined,
    conta_id: typeof source.conta_id === "string" ? source.conta_id : undefined,
  };
};

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

/** The `players` columns a save writes. The author and the Grupo are set by the caller. */
export function jogadorParaLinha(jogador: DadosDoJogador) {
  return {
    name: jogador.name,
    position: jogador.position,
    nationality: jogador.nationality,
    image_url: jogador.image,
    ovr: calculateOVR(jogador.attributes),
    ...jogador.attributes,
  };
}

/**
 * A photo the app uploaded for this Grupo: a public URL in the player-images
 * bucket, under the Grupo's folder, on this project's Supabase. Anything else
 * (another site, another Grupo's folder, an inline image) isn't saved.
 */
export function ehFotoDoGrupo(url: string, grupoId: string, supabaseUrl: string): boolean {
  try {
    const foto = new URL(url);
    return (
      foto.origin === new URL(supabaseUrl).origin &&
      foto.pathname.startsWith(`/storage/v1/object/public/${PLAYER_IMAGES_BUCKET}/${grupoId}/`)
    );
  } catch {
    return false;
  }
}
