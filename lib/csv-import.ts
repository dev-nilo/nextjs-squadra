import type { Player, PlayerPosition } from "@/types";
import { POSITIONS } from "@/lib/constants";
import { calculateOVR, coerceStat, mergePlayerAttributesFromRow } from "@/lib/jogador";
import { getCountryCode } from "@/lib/countries";

/**
 * Header aliases → domain fields.
 * Always map by header name, never by column index — CSV column order
 * (e.g. PAS before POS) often differs from UI slider order (POS before PAS).
 */
const HEADER_ALIASES: Record<string, string> = {
  jogador: "name",
  nome: "name",
  name: "name",
  player: "name",

  vel: "velocidade",
  velocidade: "velocidade",
  speed: "velocidade",

  res: "resistencia",
  resistencia: "resistencia",
  stamina: "resistencia",

  chu: "chute",
  chute: "chute",
  shooting: "chute",

  pas: "passe",
  passe: "passe",
  passing: "passe",

  pos: "posicionamento",
  posicionamento: "posicionamento",
  positioning: "posicionamento",

  def: "defesa",
  defesa: "defesa",
  defense: "defesa",
  defence: "defesa",

  dri: "drible",
  drible: "drible",
  dribbling: "drible",

  fis: "fisico",
  fisico: "fisico",
  physical: "fisico",

  position: "position",
  posicao: "position",

  nationality: "nationality",
  nacionalidade: "nationality",
  nation: "nationality",
};

/** Spreadsheet extras — ignored; OVR is recomputed from attributes. */
const SKIP_HEADERS = new Set([
  "#",
  "n",
  "nr",
  "id",
  "media",
  "avg",
  "average",
  "total",
  "ovr",
  "rating",
]);

export type CsvImportResult = {
  players: Player[];
  skippedRows: number;
  errors: string[];
};

/** Strip BOM and normalize accents for header matching. */
export function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function detectDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

/** Minimal RFC-ish CSV split (quotes + escaped quotes). */
export function splitCsvLine(line: string, delimiter: "," | ";"): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

export function parseCsvRows(text: string): string[][] {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!normalized) return [];

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) =>
    splitCsvLine(line, delimiter).map((c) => c.trim()),
  );
}

function mapHeaders(rawHeaders: string[]): (string | null)[] {
  return rawHeaders.map((h) => {
    const key = normalizeHeader(h);
    if (!key || SKIP_HEADERS.has(key)) return null;
    return HEADER_ALIASES[key] ?? null;
  });
}

/** Find the header row (e.g. skip title lines like "FUT - ATRIBUTOS…"). */
function findHeaderRowIndex(rows: string[][]): number {
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    if (mapHeaders(rows[i]).includes("name")) return i;
  }
  return -1;
}

function parsePosition(value: unknown): PlayerPosition {
  if (typeof value !== "string") return "ATA";
  const upper = value.trim().toUpperCase();
  return POSITIONS.includes(upper as PlayerPosition)
    ? (upper as PlayerPosition)
    : "ATA";
}

function rowToPlayer(mapped: Record<string, string>): Player | null {
  const name = mapped.name?.trim();
  if (!name) return null;

  const attrs = mergePlayerAttributesFromRow(mapped);
  const position = parsePosition(mapped.position);
  const nationality = getCountryCode(mapped.nationality);

  return {
    id: crypto.randomUUID(),
    name,
    position,
    nationality,
    image: null,
    attributes: attrs,
    rating: calculateOVR(attrs),
  };
}

/**
 * Parse a UTF-8 attributes CSV into domain Jogadores.
 * Columns are bound by header aliases only — order of PAS/POS/etc. does not matter.
 * MÉDIA / TOTAL / # are ignored; OVR is recomputed from the 8 attributes.
 */
export function importPlayersFromCsv(csvText: string): CsvImportResult {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return {
      players: [],
      skippedRows: 0,
      errors: ["CSV vazio ou sem linhas de dados."],
    };
  }

  const headerIndex = findHeaderRowIndex(rows);
  if (headerIndex < 0) {
    return {
      players: [],
      skippedRows: 0,
      errors: [
        'Coluna de nome não encontrada. Use "JOGADOR" ou "name" no cabeçalho.',
      ],
    };
  }

  const fields = mapHeaders(rows[headerIndex]);
  const players: Player[] = [];
  let skippedRows = 0;
  const errors: string[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const cells = rows[i];
    const mapped: Record<string, string> = {};
    let hasAnyValue = false;

    for (let c = 0; c < fields.length; c++) {
      const field = fields[c];
      const raw = cells[c] ?? "";
      if (raw !== "") hasAnyValue = true;
      if (!field) continue;
      mapped[field] = raw;
    }

    if (!hasAnyValue) {
      skippedRows++;
      continue;
    }

    const player = rowToPlayer(mapped);
    if (!player) {
      skippedRows++;
      errors.push(`Linha ${i + 1}: nome ausente — ignorada.`);
      continue;
    }

    for (const [key, value] of Object.entries(mapped)) {
      if (key === "name" || key === "position" || key === "nationality") {
        continue;
      }
      if (value.trim() !== "" && coerceStat(value) === undefined) {
        errors.push(
          `Linha ${i + 1} (${player.name}): valor inválido em "${key}" ("${value}") — usando padrão.`,
        );
      }
    }

    players.push(player);
  }

  return { players, skippedRows, errors };
}
