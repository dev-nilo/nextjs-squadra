import { describe, expect, it } from "vitest";
import type { Attributes, Player } from "@/types";
import { sortearTimes, teamAverage } from "@/lib/sorteio";

const attrs = (n: number): Attributes => ({
  velocidade: n,
  resistencia: n,
  chute: n,
  posicionamento: n,
  defesa: n,
  drible: n,
  passe: n,
  fisico: n,
});

const player = (
  id: string,
  rating: number,
  attributeValue: number,
): Player => ({
  id,
  name: id,
  position: "ATA",
  nationality: "BR",
  image: null,
  attributes: attrs(attributeValue),
  rating,
});

/** Deterministic: always returns 0 (first choice among ties; Fisher-Yates swaps toward index 0). */
const alwaysZero = () => 0;

/** Keeps array order under Fisher-Yates (j === i) and picks the last tied team. */
const preserveOrder = () => 0.999999;

describe("sortearTimes (Sorteio seam)", () => {
  it("returns the requested number of Times with TIME A/B names", () => {
    const players = [
      player("p1", 80, 80),
      player("p2", 70, 70),
      player("p3", 60, 60),
      player("p4", 50, 50),
    ];

    const times = sortearTimes(players, 2, { random: alwaysZero });

    expect(times).toHaveLength(2);
    expect(times[0].name).toBe("TIME A");
    expect(times[1].name).toBe("TIME B");
  });

  it("partitions every Jogador across Times exactly once", () => {
    const players = [
      player("p1", 90, 90),
      player("p2", 80, 80),
      player("p3", 70, 70),
      player("p4", 60, 60),
      player("p5", 50, 50),
      player("p6", 40, 40),
    ];

    const times = sortearTimes(players, 3, { random: alwaysZero });
    const ids = times.flatMap((t) => t.members.map((m) => m.id)).sort();

    expect(ids).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
  });

  it("exposes only domain fields on Time (no presentation tokens)", () => {
    const times = sortearTimes(
      [player("a", 70, 70), player("b", 70, 70)],
      2,
      { random: alwaysZero },
    );

    for (const time of times) {
      expect(Object.keys(time).sort()).toEqual(["avg", "members", "name"]);
      expect(time).not.toHaveProperty("color");
      expect(time).not.toHaveProperty("borderColor");
      expect(time).not.toHaveProperty("headerColor");
    }
  });

  it("sets avg to the rounded mean of member ratings", () => {
    const players = [
      player("a", 90, 10),
      player("b", 80, 10),
      player("c", 70, 10),
      player("d", 60, 10),
    ];

    const times = sortearTimes(players, 2, { random: alwaysZero });

    // With equal attribute values, assignment alternates; alwaysZero picks lowest index on ties.
    // Order after tier sort (ratings 90→60): a,b,c,d → teams [a,c] and [b,d]
    expect(times[0].members.map((m) => m.id)).toEqual(["a", "c"]);
    expect(times[1].members.map((m) => m.id)).toEqual(["b", "d"]);
    expect(times[0].avg).toBe(80); // (90+70)/2
    expect(times[1].avg).toBe(70); // (80+60)/2
  });

  it("balances by attribute sum: stronger attributes avoid stacking on one Time", () => {
    // Equal ratings so tier order follows input; preserveOrder keeps input order.
    const players = [
      player("strong", 70, 100), // attr sum 800
      player("strong2", 70, 100),
      player("weak", 70, 10), // attr sum 80
      player("weak2", 70, 10),
    ];

    const times = sortearTimes(players, 2, { random: preserveOrder });
    const sums = times.map((t) =>
      t.members.reduce(
        (s, p) => s + Object.values(p.attributes).reduce((a, b) => a + b, 0),
        0,
      ),
    );

    // Two strong (800 each) and two weak (80 each) → each Time gets one of each → 880
    expect(sums[0]).toBe(880);
    expect(sums[1]).toBe(880);
  });
});

describe("teamAverage", () => {
  it("returns 0 for an empty Time", () => {
    expect(teamAverage([])).toBe(0);
  });

  it("rounds the mean of ratings", () => {
    expect(
      teamAverage([
        player("a", 70, 70),
        player("b", 71, 71),
      ]),
    ).toBe(71);
  });
});
