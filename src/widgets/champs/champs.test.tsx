import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { add, resetStore, S } from "@/test-utils";
import { DEFINITIONS } from "../definitions";
import Champs from "./Champs";
import { CHAMPS_PRESETS, DEFAULT_CAPTIONS, DEFAULT_CHAMPS, DEFAULT_ICONS, artFor, voiceLevelOf } from "./presets";
import { existsSync } from "node:fs";
import path from "node:path";

beforeEach(() => resetStore());

const TABLE: Record<string, string[]> = {
  "Whole Group": ["Level 0–1. Listen and speak when called on.", "Raise your hand and wait.", "Follow the class lesson.", "Stay in your learning spot.", "Listen and respond when cued.", "Explain what we learned."],
  "Small Group": ["Level 1–2. Talk with your group.", "Ask your group, then signal the teacher.", "Work on the group task.", "Stay with your group.", "Take turns and share ideas.", "Everyone contributes."],
  Stations: ["Level 2. Talk with your station group.", "Check the directions, then ask your group.", "Complete the station task.", "Rotate on the signal.", "Do your part and share materials.", "Finish the task and reset the station."],
  "Independent Work": ["Level 0. Work silently.", "Reread the directions, then signal the teacher.", "Complete your own assignment.", "Stay in your work spot.", "Get started and keep working.", "Check your work before turning it in."],
  "Partner Work": ["Level 2. Talk with your partner.", "Ask your partner, then signal the teacher.", "Work through the task together.", "Stay in your partner spot.", "Take turns talking and listening.", "Both partners can explain the work."],
  Transitions: ["Level 0–1. Move quietly.", "Signal the teacher if you need help.", "Put away materials and get ready.", "Walk directly to your next spot.", "Move when you hear the signal.", "Be in place with materials ready."],
  Assessments: ["Level 0. Work silently.", "Raise your hand and wait for the teacher.", "Follow directions and do your own work.", "Stay seated unless directed.", "Read carefully and do your best.", "Review and submit as directed."],
  "Teacher-Led Table": ["Level 1. Use a quiet voice.", "Ask the teacher at your table.", "Practice the skill with your teacher.", "Stay at the table until dismissed.", "Follow the model and take your turn.", "Show the skill on your turn."],
};

describe("CHAMPS presets", () => {
  it("match the starter table exactly (C, H, A, M, P, S)", () => {
    expect(CHAMPS_PRESETS.map((p) => p.name)).toEqual(Object.keys(TABLE));
    for (const p of CHAMPS_PRESETS) {
      const e = DEFAULT_CHAMPS[p.id];
      expect([e.C, e.H, e.A, e.M, e.P, e.S]).toEqual(TABLE[p.name]);
    }
  });

  it("is a classroom-wide Management widget that needs no roster", () => {
    expect(DEFINITIONS.champs).toMatchObject({ category: "Management", usesRoster: false });
  });
});

describe("CHAMPS card artwork", () => {
  it("has a picture for every preset card and every C-H-A-M-P-S card", () => {
    for (const p of CHAMPS_PRESETS)
      for (const k of ["preset", "C", "H", "A", "M", "P", "S"] as const) {
        expect(existsSync(path.join(process.cwd(), "public", artFor(p.id, k))), `${p.id} ${k}`).toBe(true);
      }
  });

  it("has a short caption for every card and uses the pictures by default", () => {
    for (const p of CHAMPS_PRESETS) {
      expect(Object.values(DEFAULT_CAPTIONS[p.id]).every((c) => c.length > 3 && c.length <= 30)).toBe(true);
      expect(Object.values(DEFAULT_ICONS[p.id]).every((i) => i === "picture")).toBe(true);
    }
  });
});

describe("CHAMPS widget", () => {
  it("has a drop-down with all eight presets; choosing one switches the six picture tiles", () => {
    const id = add("champs");
    render(<Champs.Body id={id} view="normal" size="M" />);
    const select = screen.getByRole("combobox", { name: "Expectations activity" });
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(Object.keys(TABLE));
    expect(select).toHaveValue("wholeGroup");
    fireEvent.change(select, { target: { value: "stations" } });
    expect(select).toHaveValue("stations");
    expect(screen.getByTestId("champs-active")).toHaveTextContent("Stations");
    // Cards: short caption on the card; the full details as tooltip and for screen readers.
    TABLE.Stations.forEach((text, i) => {
      const tile = screen.getByTestId(`champs-row-${"CHAMPS"[i]}`);
      expect(tile).toHaveTextContent(text);
      expect(tile).toHaveAttribute("title", expect.stringContaining(text));
      expect(within(tile).getByText(text)).toHaveClass("sr-only");
    });
    expect(screen.getByTestId("champs-row-H-caption")).toHaveTextContent("Check the directions");
    expect(screen.getByTestId("champs-active-card")).toHaveTextContent("Stations");
    expect(screen.getByTestId("champs-row-A").querySelector("img")).toHaveAttribute("src", "/champs/stations-A.webp");
    expect(S().widgets[id].config.active).toBe("stations");
  });

  it("reads the voice level for the Conversation tile and has an icon for every field", () => {
    expect(voiceLevelOf("Level 0–1. Move quietly.")).toBe("0–1");
    expect(voiceLevelOf("Level 2. Talk with your partner.")).toBe("2");
    expect(voiceLevelOf("Whisper only")).toBeNull();
    for (const p of CHAMPS_PRESETS) expect(Object.keys(DEFAULT_ICONS[p.id])).toEqual(["C", "H", "A", "M", "P", "S"]);
  });

  it("can show words under the icons", () => {
    const id = add("champs");
    S().updateConfig(id, { showWords: true });
    render(<Champs.Body id={id} view="normal" size="M" />);
    expect(within(screen.getByTestId("champs-row-H")).getByText(TABLE["Whole Group"][1])).not.toHaveClass("sr-only");
  });

  it("editing a preset in settings keeps the displayed activity and other presets unchanged", () => {
    const id = add("champs");
    S().updateConfig(id, { active: "stations" });
    const Settings = Champs.Settings!;
    render(<Settings id={id} />);
    expect(screen.getByRole("combobox", { name: "Preset to edit" })).toHaveValue("stations");
    fireEvent.change(screen.getByRole("textbox", { name: "Stations Help details" }), { target: { value: "Ask three, then me." } });
    fireEvent.change(screen.getByRole("combobox", { name: "Preset to edit" }), { target: { value: "partner" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Partner Work Success details" }), { target: { value: "Both can explain it." } });
    const cfg = S().widgets[id].config as { active: string; presets: Record<string, Record<string, string>> };
    expect(cfg.active).toBe("stations");
    expect(cfg.presets.stations.H).toBe("Ask three, then me.");
    expect(cfg.presets.partner.S).toBe("Both can explain it.");
    expect(cfg.presets.partner.H).toBe(TABLE["Partner Work"][1]);
    expect(cfg.presets.wholeGroup.H).toBe(TABLE["Whole Group"][1]);
    fireEvent.click(screen.getByRole("button", { name: /Reset Partner Work/ }));
    expect((S().widgets[id].config as typeof cfg).presets.partner.S).toBe(TABLE["Partner Work"][5]);
    expect((S().widgets[id].config as typeof cfg).presets.stations.H).toBe("Ask three, then me.");
  });

  it("edits a card caption for one preset only", () => {
    const id = add("champs");
    const Settings = Champs.Settings!;
    render(<Settings id={id} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Whole Group Help caption" }), { target: { value: "Hand up, then wait" } });
    const cfg = S().widgets[id].config as { captions: Record<string, Record<string, string>> };
    expect(cfg.captions.wholeGroup.H).toBe("Hand up, then wait");
    expect(cfg.captions.stations).toBeUndefined();
  });

  it("changes a tile's icon for one preset only", () => {
    const id = add("champs");
    const Settings = Champs.Settings!;
    render(<Settings id={id} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Whole Group Success icon" }), { target: { value: "🏆" } });
    const cfg = S().widgets[id].config as { icons: Record<string, Record<string, string>> };
    expect(cfg.icons.wholeGroup.S).toBe("🏆");
    expect(cfg.icons.stations).toBeUndefined();
  });

  it("expanded view shows only the active activity and its expectations", () => {
    const id = add("champs");
    S().updateConfig(id, { active: "assessments" });
    render(<Champs.Body id={id} view="expanded" size="L" />);
    expect(screen.getByTestId("champs-active")).toHaveTextContent("Assessments");
    TABLE.Assessments.forEach((text) => expect(screen.getByTestId("champs-expanded")).toHaveTextContent(text));
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    // Projection view shows the words under each tile.
    expect(within(screen.getByTestId("champs-row-S")).getByText(TABLE.Assessments[5])).not.toHaveClass("sr-only");
  });
});

describe("CHAMPS tied to the voice level meter", () => {
  it("sets the voice level when the activity changes, without fighting manual changes", async () => {
    const { syncChampsVoice, resetChampsVoiceSync } = await import("@/components/engines/ChampsVoiceSync");
    resetChampsVoiceSync();
    const champs = add("champs");
    const voice = add("voice");
    S().updateConfig(voice, { level: "presentation" });
    syncChampsVoice();
    expect(S().widgets[voice].config.level).toBe("presentation"); // not tied yet

    S().updateConfig(champs, { tieVoice: true, active: "stations" });
    syncChampsVoice();
    expect(S().widgets[voice].config.level).toBe("partner"); // Stations: Level 2

    S().updateConfig(voice, { level: "silent" }); // teacher adjusts by hand
    syncChampsVoice();
    expect(S().widgets[voice].config.level).toBe("silent");

    S().updateConfig(champs, { active: "transitions" }); // Level 0–1
    syncChampsVoice();
    expect(S().widgets[voice].config.level).toBe("whisper");

    S().updateConfig(champs, { tieVoice: false, active: "partner" });
    syncChampsVoice();
    expect(S().widgets[voice].config.level).toBe("whisper");
  });

  it("shows the checkbox and the level it sets", () => {
    const id = add("champs");
    add("voice");
    render(<Champs.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Tie to voice level meter/ }));
    expect(S().widgets[id].config.tieVoice).toBe(true);
    expect(screen.getByTestId("champs-voice-level")).toHaveTextContent("Whisper"); // Whole Group: Level 0–1
  });
});
