import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { add, addClassWith, resetStore, S } from "@/test-utils";
import { loadTeks, searchTeks, stem, localDateKey } from "@/lib/teks";
import ICan, { normalizeObjective } from "./ICan";

beforeEach(() => resetStore());

describe("TEKS data and search", () => {
  it("covers every core grade and subject with exact codes", async () => {
    const d = await loadTeks();
    expect(d.items.length).toBeGreaterThan(3000);
    for (const subject of ["ela", "math", "science", "social"])
      for (const grade of ["K", "1", "2", "3", "4", "5", "6", "7", "8", "HS"])
        expect(d.items.filter((i) => i.subject === subject && i.grade === grade).length, `${subject} ${grade}`).toBeGreaterThan(20);
    const byCode = (s: string, c: string) => d.items.find((i) => i.subject === s && i.code === c)!;
    expect(byCode("math", "3.4K").ican).toMatch(/^I can solve one-step and two-step problems involving multiplication and division within 100/);
    expect(byCode("ela", "3.6F").ican).toBe("I can make inferences and use evidence to support understanding.");
    expect(byCode("math", "A1.5A").course).toBe("Algebra I");
    expect(new Set(d.items.map((i) => i.id)).size).toBe(d.items.length);
  });

  it("finds statements by keyword (with word variants) and by code", async () => {
    const d = await loadTeks();
    const infer = searchTeks(d.items, { subject: "ela", grade: "3", query: "infer" }).map((i) => i.code);
    expect(infer).toContain("3.6F");
    const mult = searchTeks(d.items, { subject: "math", grade: "3", query: "multiply" });
    expect(mult.length).toBeGreaterThan(3);
    expect(mult.every((i) => /multipl/i.test(i.text))).toBe(true);
    expect(searchTeks(d.items, { subject: "math", grade: "3", query: "3.4k" }).map((i) => i.code)).toEqual(["3.4K"]);
    expect(searchTeks(d.items, { subject: "math", grade: "HS", course: "Geometry", query: "" }).every((i) => i.course === "Geometry")).toBe(true);
    expect(stem("multiply")).toBe("multipl");
    expect(stem("comparing")).toBe("compar");
  });
});

describe("tracker and objectives", () => {
  it("adds “I can” to typed objectives only when missing", () => {
    expect(normalizeObjective("  multiply two-digit numbers ")).toBe("I can multiply two-digit numbers");
    expect(normalizeObjective("I can read fluently.")).toBe("I can read fluently.");
    expect(normalizeObjective("SWBAT explain")).toBe("SWBAT explain");
  });

  it("logs each statement once per day per class", () => {
    const e = { date: "2026-11-16", text: "I can infer.", teksId: "110.5:3.6F", code: "3.6F", classId: "c1" };
    expect(S().logTaught([e, e])).toBe(1);
    expect(S().logTaught([e])).toBe(0);
    expect(S().logTaught([{ ...e, classId: "c2" }, { ...e, date: "2026-11-17" }])).toBe(2);
    S().undo();
    expect(S().taught).toHaveLength(1);
  });
});

describe("I Can widget", () => {
  it("types objectives, logs one as taught today, and shows it in the tracker", async () => {
    addClassWith("P1", ["Ana"]);
    const id = add("ican");
    render(<ICan.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("button", { name: /Type my own/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Objectives/ }), { target: { value: "use text evidence\nI can write a claim." } });
    fireEvent.click(screen.getByRole("button", { name: "Add 2" }));
    const list = screen.getByTestId("ican-list");
    expect(list).toHaveTextContent("I can use text evidence");
    expect(list).toHaveTextContent("I can write a claim.");
    fireEvent.click(screen.getByRole("button", { name: "Log as taught today: I can write a claim." }));
    expect(S().taught[0]).toMatchObject({ date: localDateKey(), text: "I can write a claim.", className: "P1" });
    expect(screen.getByRole("button", { name: "Logged as taught today: I can write a claim." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Tracker/ }));
    expect(screen.getByTestId("teks-tracker")).toHaveTextContent("I can write a claim.");
  });

  it("searches TEKS, adds several, and logs them with the checkbox", async () => {
    const id = add("ican", { grade: "3", subject: "math" });
    render(<ICan.Body id={id} view="normal" size="M" />);
    fireEvent.click(screen.getByRole("button", { name: /Find TEKS/ }));
    const dialog = await screen.findByRole("dialog", { name: /Find TEKS/ });
    await waitFor(() => expect(within(dialog).getByTestId("teks-results").children.length).toBeGreaterThan(10));
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Search TEKS" }), { target: { value: "multiply" } });
    const results = within(dialog).getAllByRole("checkbox");
    fireEvent.click(results[0]);
    fireEvent.click(results[1]);
    expect(within(dialog).getByRole("checkbox", { name: /Log in tracker/ })).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: /Add 2 to Sidekick/ }));
    expect(S().widgets[id].config.items).toHaveLength(2);
    expect((S().widgets[id].config.items as { code: string }[]).every((i) => /^3\.\d+[A-Z]/.test(i.code))).toBe(true);
    expect(S().taught).toHaveLength(2);
    expect(S().taught.every((t) => t.date === localDateKey() && t.course === "Grade 3")).toBe(true);
    // Coverage for Grade 3 Math shows 2 taught.
    fireEvent.click(screen.getByRole("button", { name: /Tracker/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Grade 3 Math" }));
    await waitFor(() => expect(screen.getByTestId("teks-coverage")).toHaveTextContent(/^2 of \d+ TEKS taught$/));
  });
});

describe("search word families", () => {
  it("multiply finds multiplication, not multiple; apply finds application", async () => {
    const d = await loadTeks();
    const mult = searchTeks(d.items, { subject: "math", grade: "3", query: "multiply" });
    expect(mult.length).toBeGreaterThan(3);
    expect(mult.every((i) => /\bmultipl(y|i)/i.test(i.text))).toBe(true);
    expect(mult.map((i) => i.code)).not.toContain("3.1D"); // "multiple representations"
    expect(searchTeks(d.items, { subject: "math", grade: "3", query: "multiple" }).map((i) => i.code)).toContain("3.1D");
    expect(searchTeks(d.items, { subject: "ela", grade: "5", query: "inferring" }).length).toBeGreaterThan(0);
    expect(searchTeks(d.items, { subject: "math", grade: "4", query: "comparing fractions" }).length).toBeGreaterThan(0);
  });
});
