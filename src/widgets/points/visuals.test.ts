import { describe, expect, it } from "vitest";
import { critterCollection, monsterProgress, rarityFor, revealGrid, revealedTiles, shuffled } from "./Visuals";

describe("point visuals", () => {
  it("critters: one per 5 points; every 10 is rare, 25 epic, 50 legendary", () => {
    expect(critterCollection(4, "c1")).toHaveLength(0);
    const got = critterCollection(50, "c1");
    expect(got.map((c) => c.rarity)).toEqual(["common", "rare", "common", "rare", "epic", "rare", "common", "rare", "common", "legendary"]);
    expect(rarityFor(2)).toBe("rare");
    // Stable per class; losing points removes the newest critter.
    expect(critterCollection(10, "c1")).toEqual(got.slice(0, 2));
  });

  it("secret picture: one tile per point, losing a point covers one back up, full at the goal", () => {
    const { n } = revealGrid(20);
    expect(revealedTiles(3, 20, "c1").size).toBe(3);
    const two = revealedTiles(2, 20, "c1");
    for (const t of two) expect(revealedTiles(3, 20, "c1").has(t)).toBe(true);
    expect(revealedTiles(20, 20, "c1").size).toBe(n);
    expect(revealedTiles(-4, 20, "c1").size).toBe(0);
    // Different classes uncover in a different order.
    expect(shuffled(20, "a")).not.toEqual(shuffled(20, "b"));
  });

  it("monster: ten parts spread over the goal", () => {
    expect(monsterProgress(0, 20)).toMatchObject({ parts: 0, next: "Body", per: 2 });
    expect(monsterProgress(5, 20)).toMatchObject({ parts: 2, next: "Smile", toNext: 1 });
    expect(monsterProgress(99, 20)).toMatchObject({ parts: 10, next: null });
  });
});
