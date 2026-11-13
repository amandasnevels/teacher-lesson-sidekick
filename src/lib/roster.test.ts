import { describe, expect, it } from "vitest";
import { namesFromCSV, namesFromPaste, parseCSV, validateNames } from "./roster";

describe("roster import", () => {
  it("parses quoted CSV with a name header", () => {
    const csv = 'Name,Grade\n"Brook, Avery",5\nCam Delgado,5\r\n\n';
    expect(parseCSV(csv)).toEqual([["Name", "Grade"], ["Brook, Avery", "5"], ["Cam Delgado", "5"]]);
    expect(namesFromCSV(csv)).toEqual(["Brook, Avery", "Cam Delgado"]);
  });

  it("joins first/last columns", () => {
    expect(namesFromCSV("First Name,Last Name\nDara,Ellis\nEmry,Fox")).toEqual(["Dara Ellis", "Emry Fox"]);
  });

  it("falls back to the first column without a header", () => {
    expect(namesFromCSV("Finn\nGia")).toEqual(["Finn", "Gia"]);
  });

  it("splits pasted names by line or commas", () => {
    expect(namesFromPaste("A\nB\n\nC")).toEqual(["A", "B", "", "C"]);
    expect(namesFromPaste("A, B; C")).toEqual(["A", " B", " C"]);
  });

  it("validates, de-duplicates (case-insensitive) and reports", () => {
    const r = validateNames(["  Avery  ", "avery", "Bennie", "", "x".repeat(80), "Cam"], ["Cam"]);
    expect(r.names).toEqual(["Avery", "Bennie"]);
    expect(r.duplicates).toEqual(["avery", "Cam"]);
    expect(r.invalid).toHaveLength(1);
  });
});
