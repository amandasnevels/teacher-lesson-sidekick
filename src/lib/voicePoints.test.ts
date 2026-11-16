import { describe, expect, it } from "vitest";
import { QuietStreak, voiceLevelForConversation } from "./voicePoints";

describe("CHAMPS conversation → voice level", () => {
  it("maps level numbers, using the top of a range", () => {
    expect(voiceLevelForConversation("Level 0. Work silently.")).toBe("silent");
    expect(voiceLevelForConversation("Level 0–1. Move quietly.")).toBe("whisper");
    expect(voiceLevelForConversation("Level 1. Use a quiet voice.")).toBe("whisper");
    expect(voiceLevelForConversation("Level 1–2. Talk with your group.")).toBe("partner");
    expect(voiceLevelForConversation("Level 2. Talk with your partner.")).toBe("partner");
    expect(voiceLevelForConversation("level 3 table talk")).toBe("table");
    expect(voiceLevelForConversation("Level 4 presenting")).toBe("presentation");
    expect(voiceLevelForConversation("Quiet please")).toBeNull();
  });
});

describe("quiet streak", () => {
  it("rewards after the chosen minutes, restarts after a reward or an alarm", () => {
    const q = new QuietStreak();
    expect(q.tick(0, 2)).toBe(false); // not started
    q.start(0);
    expect(q.tick(119_000, 2)).toBe(false);
    expect(q.tick(120_000, 2)).toBe(true);
    expect(q.tick(150_000, 2)).toBe(false);
    q.alarm(200_000); // too loud: quiet time starts over
    expect(q.tick(300_000, 2)).toBe(false);
    expect(q.remaining(300_000, 2)).toBe(20_000);
    expect(q.tick(320_000, 2)).toBe(true);
    q.stop();
    expect(q.tick(999_999, 2)).toBe(false);
  });
});
