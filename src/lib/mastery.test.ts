import { beforeEach, describe, expect, it } from "vitest";
import { activeCheck, masterySummary, nextMasteryStudent } from "./mastery";
import { addClassWith, resetStore, S } from "@/test-utils";
import { applyRetention } from "@/store/persist";
import { persistedSnapshot } from "@/store/store";

beforeEach(() => resetStore());
const first = (n: number) => 0 * n; // deterministic "random": always the first candidate

describe("mastery check order", () => {
  it("calls students who haven't answered first, then reteach students; skips absent and correct", () => {
    const ids = ["a", "b", "c", "d"];
    const r = { a: { status: "reteach" as const, at: 1, tries: 1 }, b: { status: "absent" as const, at: 1, tries: 0 } };
    expect(nextMasteryStudent(ids, r, null, first)).toEqual({ id: "c", phase: "first" });
    const r2 = { ...r, c: { status: "correct" as const, at: 1, tries: 1 }, d: { status: "reteach" as const, at: 1, tries: 1 } };
    expect(nextMasteryStudent(ids, r2, null, first)).toEqual({ id: "a", phase: "reteach" });
    // Don't call the same reteach student twice in a row when someone else needs a turn.
    expect(nextMasteryStudent(ids, r2, "a", first).id).toBe("d");
    const done = { a: { status: "correct" as const, at: 1, tries: 2 }, b: r.b, c: r2.c, d: { status: "correct" as const, at: 1, tries: 1 } };
    expect(nextMasteryStudent(ids, done, null, first)).toEqual({ id: null, phase: "done" });
    expect(masterySummary(ids, r2)).toEqual({ correct: 1, reteach: 2, absent: 1, notYet: 0, total: 4 });
  });

  it("store: correct after reteach is noted; records are per class, deleted with the class and never kept in session-only mode", () => {
    const c1 = addClassWith("P1", ["Avery Brook", "Bennie Cruz"]);
    const c2 = addClassWith("P2", ["Cam Delgado"]);
    const ana = S().classes[0].students[0].id;
    const id = S().startMasteryCheck(c1, { text: "I can add fractions", code: "4.3E" });
    S().recordMastery(c1, id, ana, "reteach");
    S().recordMastery(c1, id, ana, "correct");
    const r = activeCheck(S().records.mastery?.[c1])!.results[ana];
    expect(r).toMatchObject({ status: "correct", tries: 2, afterReteach: true });
    expect(S().records.mastery?.[c2]).toBeUndefined();
    // Starting another check ends the previous one.
    S().startMasteryCheck(c1, { text: "Next" });
    expect(S().records.mastery![c1].checks.filter((c) => !c.endedAt)).toHaveLength(1);
    S().setPrefs({ studentDataRetention: "session" });
    expect(applyRetention(persistedSnapshot()).records.mastery).toEqual({});
    S().deleteClass(c1);
    expect(S().records.mastery?.[c1]).toBeUndefined();
  });
});
