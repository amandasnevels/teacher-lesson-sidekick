import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { add, resetStore, S } from "@/test-utils";
import { loadElps, searchElps } from "@/lib/elps";
import { localDateKey } from "@/lib/teks";
import { IWillWidget, normalizeObjective } from "./ICan";

beforeEach(() => resetStore());

describe("ELPS data and search", () => {
  it("has all 45 official cross-curricular student expectations", async () => {
    const d = await loadElps();
    expect(d.items).toHaveLength(45);
    const count = (dom: string) => d.items.filter((i) => i.domain === dom).length;
    expect([count("strategies"), count("listening"), count("speaking"), count("reading"), count("writing")]).toEqual([8, 9, 10, 11, 7]);
    expect(d.items.find((i) => i.code === "ELPS 3E")!.iwill).toBe("I will share information in cooperative learning interactions.");
    expect(d.items.find((i) => i.code === "ELPS 1A")!.iwill).toBe("I will use prior knowledge and experiences to understand meanings in English.");
  });

  it("filters by domain, keyword and code", async () => {
    const d = await loadElps();
    expect(searchElps(d.items, "speaking", "").every((i) => i.domain === "speaking")).toBe(true);
    const vocab = searchElps(d.items, "writing", "vocabulary");
    expect(vocab.length).toBeGreaterThan(0);
    expect(vocab.every((i) => i.domain === "writing" && /vocabulary/i.test(i.text))).toBe(true);
    expect(searchElps(d.items, "all", "3e").map((i) => i.code)).toEqual(["ELPS 3E"]);
    expect(searchElps(d.items, "all", "ELPS 4F").map((i) => i.code)).toEqual(["ELPS 4F"]);
  });

  it("adds “I will” to typed goals", () => {
    expect(normalizeObjective("explain my thinking to a partner", "I will")).toBe("I will explain my thinking to a partner");
    expect(normalizeObjective("I will write two sentences.", "I will")).toBe("I will write two sentences.");
  });
});

describe("I Will widget", () => {
  it("searches ELPS by domain, adds a goal, logs it, and shows ELPS coverage", async () => {
    const id = add("iwill");
    render(<IWillWidget.Body id={id} view="normal" size="M" />);
    expect(screen.getByText("Today I will…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Find ELPS/ }));
    const dialog = await screen.findByRole("dialog", { name: /Find ELPS/ });
    fireEvent.click(within(dialog).getByRole("radio", { name: /Speaking/ }));
    await waitFor(() => expect(within(dialog).getByTestId("elps-count")).toHaveTextContent("10 statements"));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /ELPS 3E/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Add 1 to Sidekick/ }));
    const list = screen.getByTestId("ican-list");
    expect(list).toHaveTextContent("I will share information in cooperative learning interactions.");
    expect(list).toHaveTextContent("ELPS 3E · Speaking");
    expect(S().taught[0]).toMatchObject({ code: "ELPS 3E", subject: "elps", course: "ELPS", date: localDateKey() });

    fireEvent.click(screen.getByRole("button", { name: /Tracker/ }));
    fireEvent.click(await screen.findByRole("button", { name: "ELPS (all grades)" }));
    await waitFor(() => expect(screen.getByTestId("teks-coverage")).toHaveTextContent("1 of 45 ELPS taught"));
  });

  it("adds a sentence stem to a goal", async () => {
    const id = add("iwill");
    S().updateConfig(id, { items: [{ id: "g1", text: "I will share information in cooperative learning interactions.", code: "ELPS 3E", domain: "Speaking" }] });
    render(<IWillWidget.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("button", { name: /Add sentence stem/ }));
    const box = await screen.findByRole("dialog", { name: "Sentence stem" });
    fireEvent.change(within(box).getByRole("textbox"), { target: { value: "I think ___ because ___." } });
    await act(async () => {
      fireEvent.click(within(box).getByRole("button", { name: "Save stem" }));
    });
    expect(screen.getByTestId("iwill-stem")).toHaveTextContent("I think ___ because ___.");
  });

  it("types language goals with the “I will” prefix", () => {
    const id = add("iwill");
    render(<IWillWidget.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("button", { name: /Type my own/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Objectives/ }), { target: { value: "retell the story to a partner" } });
    fireEvent.click(screen.getByRole("button", { name: "Add 1" }));
    expect(screen.getByTestId("ican-list")).toHaveTextContent("I will retell the story to a partner");
  });
});

describe("proficiency levels", () => {
  it("has official descriptors for every domain, band and level", async () => {
    const { findPld, LEVELS } = await import("@/lib/elps");
    const d = await loadElps();
    expect(d.plds).toHaveLength(24);
    for (const dom of ["listening", "speaking", "reading", "writing"])
      for (const band of ["K-1", "2-12"] as const)
        for (const l of LEVELS) {
          const p = findPld(d.plds, dom, l.value, band)!;
          expect(p, `${dom} ${band} ${l.value}`).toBeTruthy();
          expect(p.bullets.length).toBeGreaterThan(1);
        }
    expect(findPld(d.plds, "reading", "beginning", "K-1")!.summary).toMatch(/foundational reading skills/);
    expect(findPld(d.plds, "reading", "beginning", "2-12")!.summary).toMatch(/read and understand English/);
    expect(findPld(d.plds, "speaking", "beginning", "2-12")!.bullets[0]).toMatch(/^mainly speak using single words and short phrases/);
  });

  it("tags a goal with levels, shows the descriptor and supports, and applies a stem", async () => {
    const id = add("iwill");
    S().updateConfig(id, { items: [{ id: "g1", text: "I will share information in cooperative learning interactions.", code: "ELPS 3E", domain: "Speaking" }] });
    render(<IWillWidget.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("button", { name: /Proficiency levels and supports/ }));
    const dialog = await screen.findByRole("dialog", { name: "Proficiency levels & supports" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Beginning" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Advanced" }));
    const beginning = await within(dialog).findByTestId("level-beginning");
    await waitFor(() => expect(beginning).toHaveTextContent("little or no ability to speak English"));
    expect(beginning).toHaveTextContent("Picture word bank");
    expect(within(dialog).getByTestId("level-advanced")).toHaveTextContent("grade-appropriate English");
    fireEvent.click(within(beginning).getByRole("button", { name: /This is ___\./ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(S().widgets[id].config.items).toMatchObject([{ levels: ["beginning", "advanced"], stem: "This is ___." }]);
    expect(screen.getByTestId("iwill-levels")).toHaveTextContent("BeginningAdvanced");
    expect(screen.getByTestId("iwill-stem")).toHaveTextContent("This is ___.");
  });
});
