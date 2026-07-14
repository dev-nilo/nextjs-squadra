import { Attributes, Player, PlayerPosition } from "@/types";
import { getCountryCode } from "./countries";

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
  };
};
