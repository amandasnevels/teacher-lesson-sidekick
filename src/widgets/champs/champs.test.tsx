import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { add, resetStore, S } from "@/test-utils";
import { DEFINITIONS } from "../definitions";
import Champs from "./Champs";
import { CHAMPS_PRESETS, DEFAULT_CHAMPS } from "./presets";

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

describe("CHAMPS widget", () => {
  it("shows all eight presets; one click switches the six expectations", () => {
    const id = add("champs");
    render(<Champs.Body id={id} view="normal" size="M" />);
    const group = screen.getByRole("radiogroup", { name: "CHAMPS activity" });
    expect(within(group).getAllByRole("radio")).toHaveLength(8);
    expect(within(group).getByRole("radio", { name: /Whole Group/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(group).getByRole("radio", { name: /Stations/ }));
    expect(within(group).getByRole("radio", { name: /Stations/ })).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("radio", { name: /Whole Group/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("champs-active")).toHaveTextContent("Stations");
    TABLE.Stations.forEach((text, i) => expect(screen.getByTestId(`champs-row-${"CHAMPS"[i]}`)).toHaveTextContent(text));
    expect(S().widgets[id].config.active).toBe("stations");
  });

  it("editing a preset in settings keeps the displayed activity and other presets unchanged", () => {
    const id = add("champs");
    S().updateConfig(id, { active: "stations" });
    const Settings = Champs.Settings!;
    render(<Settings id={id} />);
    expect(screen.getByRole("combobox", { name: "Preset to edit" })).toHaveValue("stations");
    fireEvent.change(screen.getByRole("textbox", { name: "Stations Help" }), { target: { value: "Ask three, then me." } });
    fireEvent.change(screen.getByRole("combobox", { name: "Preset to edit" }), { target: { value: "partner" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Partner Work Success" }), { target: { value: "Both can explain it." } });
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

  it("expanded view shows only the active activity and its expectations", () => {
    const id = add("champs");
    S().updateConfig(id, { active: "assessments" });
    render(<Champs.Body id={id} view="expanded" size="L" />);
    expect(screen.getByTestId("champs-active")).toHaveTextContent("Assessments");
    TABLE.Assessments.forEach((text) => expect(screen.getByTestId("champs-expanded")).toHaveTextContent(text));
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
