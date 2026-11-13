import { describe, expect, it } from "vitest";
import { parseCommand } from "./commands";

describe("Quick Find command parser", () => {
  it.each([
    ["5 min timer", 300],
    ["3 min timer", 180],
    ["timer 10", 600],
    ["90 sec timer", 90],
    ["start 2 minute timer", 120],
    ["timer for 1 hour", 3600],
    ["5m timer", 300],
  ])("parses %s", (q, seconds) => {
    expect(parseCommand(q)).toMatchObject({ kind: "timer", seconds });
  });

  it("parses fixed action commands", () => {
    expect(parseCommand("roll dice")?.kind).toBe("rollDice");
    expect(parseCommand("Flip Coin")?.kind).toBe("flipCoin");
    expect(parseCommand("pick student")?.kind).toBe("pickStudent");
    expect(parseCommand("spin the wheel")?.kind).toBe("spinWheel");
    expect(parseCommand("bell")).toMatchObject({ kind: "playSound", sound: "bell" });
    expect(parseCommand("undo")?.kind).toBe("undo");
  });

  it("returns null for plain searches (handled as search, not guessed)", () => {
    expect(parseCommand("timer")).toBeNull();
    expect(parseCommand("spinner")).toBeNull();
    expect(parseCommand("checklist")).toBeNull();
    expect(parseCommand("0 min timer")).toBeNull();
    expect(parseCommand("")).toBeNull();
  });
});
