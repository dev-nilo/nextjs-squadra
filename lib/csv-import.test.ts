import { describe, expect, it } from "vitest";
import {
  importPlayersFromCsv,
  normalizeHeader,
  parseCsvRows,
  splitCsvLine,
} from "@/lib/csv-import";

describe("normalizeHeader", () => {
  it("strips UTF-8 BOM and accents", () => {
    expect(normalizeHeader("\uFEFFMÉDIA")).toBe("media");
    expect(normalizeHeader("Posição")).toBe("posicao");
  });
});

describe("splitCsvLine", () => {
  it("splits on commas and respects quotes", () => {
    expect(splitCsvLine('a,"b,c",d', ",")).toEqual(["a", "b,c", "d"]);
  });

  it("unescapes doubled quotes", () => {
    expect(splitCsvLine('"say ""hi""",x', ",")).toEqual(['say "hi"', "x"]);
  });
});

describe("parseCsvRows", () => {
  it("detects semicolon delimiter (Excel BR)", () => {
    const rows = parseCsvRows("JOGADOR;VEL;RES\nCELTA;90;75");
    expect(rows).toEqual([
      ["JOGADOR", "VEL", "RES"],
      ["CELTA", "90", "75"],
    ]);
  });

  it("skips blank lines and strips BOM", () => {
    const rows = parseCsvRows("\uFEFFJOGADOR,VEL\n\nJM,80\n");
    expect(rows).toHaveLength(2);
  });
});

describe("importPlayersFromCsv", () => {
  it("maps spreadsheet headers and recomputes OVR", () => {
    const sample = `#,JOGADOR,VEL,RES,CHU,PAS,POS,DEF,DRI,FIS,MÉDIA,TOTAL
1,CELTA,90,75,80,85,85,90,75,85,83,665
2,JM,80,85,80,85,85,75,90,75,82,655`;

    const { players, skippedRows, errors } = importPlayersFromCsv(sample);

    expect(errors.filter((e) => e.includes("nome ausente"))).toHaveLength(0);
    expect(skippedRows).toBe(0);
    expect(players).toHaveLength(2);

    const celta = players[0];
    expect(celta.name).toBe("CELTA");
    expect(celta.attributes.velocidade).toBe(90);
    expect(celta.attributes.passe).toBe(85);
    expect(celta.attributes.posicionamento).toBe(85);
    expect(celta.rating).toBe(83);
  });

  it("maps PAS→passe and POS→posicionamento regardless of column order", () => {
    // CSV-style order: PAS before POS
    const csvOrder = `JOGADOR,CHU,PAS,POS,DEF
A,10,20,30,40`;
    // UI-style order: POS before PAS
    const uiOrder = `JOGADOR,CHU,POS,DEF,PAS
B,10,30,40,20`;

    const fromCsv = importPlayersFromCsv(csvOrder).players[0];
    const fromUi = importPlayersFromCsv(uiOrder).players[0];

    expect(fromCsv.attributes.passe).toBe(20);
    expect(fromCsv.attributes.posicionamento).toBe(30);
    expect(fromUi.attributes.passe).toBe(20);
    expect(fromUi.attributes.posicionamento).toBe(30);
  });

  it("skips title rows before the JOGADOR header", () => {
    const csv = `FUT - ATRIBUTOS DOS JOGADORES;;;;;;;;;;
#;JOGADOR;VEL;RES;CHU;PAS;POS;DEF;DRI;FIS;MÉDIA;TOTAL
1;CELTA;90;75;80;85;85;90;75;85;83;665`;
    const { players, errors } = importPlayersFromCsv(csv);
    expect(errors).toHaveLength(0);
    expect(players).toHaveLength(1);
    expect(players[0].name).toBe("CELTA");
    expect(players[0].attributes.passe).toBe(85);
    expect(players[0].attributes.posicionamento).toBe(85);
  });

  it("skips rows without a player name", () => {
    const csv = `JOGADOR,VEL\n,90\nOK,70`;
    const { players, skippedRows } = importPlayersFromCsv(csv);
    expect(players).toHaveLength(1);
    expect(players[0].name).toBe("OK");
    expect(skippedRows).toBe(1);
  });

  it("errors when name column is missing", () => {
    const { players, errors } = importPlayersFromCsv("VEL,RES\n90,75");
    expect(players).toHaveLength(0);
    expect(errors[0]).toMatch(/JOGADOR/i);
  });

  it("accepts optional position and nationality columns", () => {
    const csv = `JOGADOR,POSIÇÃO,NACIONALIDADE,VEL\nAna,GOL,AR,88`;
    const { players } = importPlayersFromCsv(csv);
    expect(players[0].position).toBe("GOL");
    expect(players[0].nationality).toBe("AR");
    expect(players[0].attributes.velocidade).toBe(88);
  });
});
