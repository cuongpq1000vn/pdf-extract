// Edge cases of the parser, built from hand-made pages. The sample-based
// refusal rules live in refusals.test.ts.
import { describe, expect, it } from "vitest";
import { formatMoney, multiplyCents } from "./numbers";
import { parseDocument } from "./parse";
import type { PageInput, TextLine } from "./types";

type Cells = [number, string][];

function textPage(page: number, rows: Cells[]): PageInput {
  const lines: TextLine[] = rows.map((cells, i) => ({
    y: 800 - i * 15,
    cells: cells.map(([x, str]) => ({ x, str })),
    text: cells.map(([, str]) => str).join(" "),
  }));
  return { page, kind: "text", lines };
}

const COMPANY: Cells = [[43, "Kowhai Building Supplies Ltd"]];
const HEADER: Cells = [[43, "Item"], [71, "Description"], [326, "Qty"], [377, "Unit"], [428, "Unit Price"], [502, "Line Total"]];
const row = (...v: string[]): Cells =>
  [43, 71, 326, 377, 428, 502].map((x, i) => [x, v[i]] as [number, string]).filter(([, t]) => t !== "");

const one = (rows: Cells[]) => parseDocument("t.pdf", [textPage(1, rows)]);
const codes = (r: ReturnType<typeof one>) => r.refusals.map((x) => x.code);

describe("page kinds", () => {
  it("refuses a blank page", () => {
    const r = parseDocument("t.pdf", [{ page: 1, kind: "empty" }]);
    expect(codes(r)).toEqual(["EMPTY_PAGE"]);
  });

  it("reports a page the PDF reader could not open, with its message", () => {
    const r = parseDocument("t.pdf", [{ page: 3, kind: "error", message: "bad xref" }]);
    expect(r.pages[0].status).toBe("failed");
    expect(r.refusals[0].detail).toContain("bad xref");
  });

  it("reports a crash that throws a non-Error value", () => {
    const lines = { findIndex: () => { throw "boom"; } } as unknown as TextLine[];
    const r = parseDocument("t.pdf", [{ page: 1, kind: "text", lines }]);
    expect(r.refusals[0].detail).toContain("boom");
  });

  it("refuses a text page with no item table", () => {
    const r = one([COMPANY, [[43, "Date: 1 May 2026"]], [[43, "Thanks for your order"]]]);
    expect(r.pages[0].status).toBe("refused");
    expect(codes(r)).toContain("NO_TABLE_FOUND");
    expect(r.date?.value).toBe("1 May 2026");
  });
});

describe("rows", () => {
  it("leaves out a row with no description", () => {
    const r = one([HEADER, row("1", "", "4", "ea", "$1.00", "$4.00")]);
    expect(r.lineItems).toHaveLength(0);
    expect(r.refusals[0]).toMatchObject({ code: "ROW_INCOMPLETE", detail: expect.stringContaining("description") });
  });

  it("leaves out a row with no quantity", () => {
    const r = one([HEADER, row("1", "Board", "", "ea", "$1.00", "$4.00")]);
    expect(r.refusals[0]).toMatchObject({ code: "ROW_INCOMPLETE", detail: expect.stringContaining("quantity") });
  });

  it("blanks a price it can't read instead of guessing", () => {
    const r = one([HEADER, row("1", "Board", "4", "ea", "$12", "$48.00")]);
    expect(r.lineItems[0].unitPrice).toBeNull();
    expect(r.refusals.find((x) => x.code === "VALUE_UNREADABLE")?.evidence[0].text).toBe("$12");
  });

  it("does not report an unreadable line total as missing too", () => {
    const r = one([HEADER, row("1", "Board", "4", "ea", "$1.00", "abc")]);
    expect(codes(r)).toEqual(["VALUE_UNREADABLE", "TOTAL_NOT_STATED"]);
  });

  it("refuses an empty line total cell, and leaves the total unchecked", () => {
    const r = one([HEADER, row("1", "Board", "4", "ea", "$1.00", ""), [[337, "Total:"], [502, "$4.00"]]]);
    expect(codes(r)).toContain("ROW_INCOMPLETE");
    expect(r.totals[0].check).toMatchObject({ status: "unchecked", reason: expect.stringContaining("no printed line total") });
  });

  it("has no unit and no price when neither is printed", () => {
    const r = one([HEADER, row("1", "Board", "4", "", "", "$4.00")]);
    expect(r.lineItems[0].unit).toBeNull();
    expect(r.lineItems[0].unitPrice).toBeNull();
  });

  it("keeps a fractional quantity whose product isn't a whole cent as a mismatch", () => {
    const r = one([HEADER, row("1", "Board", "1.5", "m", "$3.33", "$5.00")]);
    expect(r.lineItems[0].flags[0].code).toBe("LINE_TOTAL_MISMATCH");
  });

  it("joins two cells that fall under the same column", () => {
    const r = one([HEADER, [[43, "1"], [71, "Board"], [200, "(long)"], [326, "2"], [502, "$2.00"]]]);
    expect(r.lineItems[0].description.value).toBe("Board (long)");
  });

  it("accepts 'Quantity' as the quantity heading", () => {
    const r = one([[[43, "Item"], [71, "Description"], [326, "Quantity"]], [[43, "1"], [71, "Board"], [326, "2"]]]);
    expect(r.lineItems[0].quantity.value).toBe(2);
  });
});

describe("totals", () => {
  it("leaves a total unchecked when there are no lines", () => {
    const r = one([HEADER, [[337, "Total:"], [502, "$4.00"]]]);
    expect(r.totals[0].check).toMatchObject({ status: "unchecked", reason: expect.stringContaining("No lines") });
  });

  it("leaves a total unchecked when a row was refused", () => {
    const r = one([HEADER, row("1", "Board", "x", "ea", "$1.00", "$1.00"), row("2", "Nail", "1", "ea", "$1.00", "$1.00"), [[337, "Total:"], [502, "$2.00"]]]);
    expect(r.totals[0].check).toMatchObject({ status: "unchecked", reason: expect.stringContaining("left out") });
  });

  it("shows a negative difference when the total is lower than the lines", () => {
    const r = one([HEADER, row("1", "Board", "2", "ea", "$5.00", "$10.00"), [[337, "Total:"], [502, "$8.00"]]]);
    expect(r.refusals.find((x) => x.code === "TOTAL_MISMATCH")?.detail).toContain("-$2.00");
  });

  it("refuses a malformed total amount, and doesn't also call it missing", () => {
    const r = one([HEADER, row("1", "Board", "2", "ea", "$5.00", "$10.00"), [[337, "Total: $1,0.00"]]]);
    expect(r.totals).toHaveLength(0);
    expect(codes(r)).toEqual(["VALUE_UNREADABLE"]);
  });

  it("refuses a negative total instead of dropping its minus sign", () => {
    for (const printed of ["-$10.00", "($10.00)", "\u2212$10.00"]) {
      const r = one([HEADER, row("1", "Board", "2", "ea", "$5.00", "$10.00"), [[337, "Total:"], [502, printed]]]);
      expect(r.totals).toHaveLength(0);
      expect(r.refusals[0]).toMatchObject({ code: "VALUE_UNREADABLE", title: "The total couldn't be read" });
      expect(r.refusals[0].evidence[0].text).toBe(printed);
    }
  });
});

describe("columns and headings", () => {
  it("refuses an unknown column without a weight explanation", () => {
    const header: Cells = [...HEADER.slice(0, 3), [360, "Colour"]];
    const r = one([header, [[43, "1"], [71, "Board"], [326, "2"], [360, "red"]], [[43, "2"], [71, "Nail"], [326, "5"]]]);
    const ref = r.refusals.find((x) => x.code === "COLUMN_NOT_UNDERSTOOD")!;
    expect(ref.detail).toBe('We don\'t extract the "Colour" column, so none of its values are in the results.');
    expect(ref.evidence.map((e) => e.text)).toEqual(["red"]);
  });

  it("does not over-explain a weight column that is consistent", () => {
    const header: Cells = [...HEADER.slice(0, 3), [360, "Weight"]];
    const r = one([header, [[43, "1"], [71, "Board"], [326, "2"], [360, "5kg total"]]]);
    expect(r.refusals.find((x) => x.code === "COLUMN_NOT_UNDERSTOOD")?.detail).not.toMatch(/per item|vary/);
  });

  it("uses an empty heading when every line above the table is a key: value line", () => {
    const r = one([COMPANY, [[43, "Date: 1 May 2026"]], HEADER, row("1", "Board", "2", "ea", "$1.00", "$2.00")]);
    expect(r.lineItems[0].section).toEqual({ kind: "delivery", heading: "" });
  });
});

describe("cross-page checks", () => {
  const page = (n: number, docNo: string, note: string) =>
    textPage(n, [COMPANY, [[43, `Document No: ${docNo}`]], [[43, note]], HEADER, row("1", "Board", "1", "ea", "$1.00", "$1.00")]);

  it("flags pages that disagree on the document number", () => {
    const r = parseDocument("t.pdf", [page(1, "A-1", "Packing List"), page(2, "A-2", "Packing List")]);
    const ref = r.refusals.find((x) => x.code === "CONFLICTING_VALUES")!;
    expect(ref.detail).toContain('"A-1", "A-2"');
    expect(ref.page).toBeNull();
  });

  it("does not flag a count that is repeated with the same value", () => {
    const r = parseDocument("t.pdf", [page(1, "A", "3 pallets"), page(2, "A", "3 pallets")]);
    expect(r.refusals.some((x) => x.code === "CONFLICTING_VALUES")).toBe(false);
  });

  it("puts a count conflict across pages at document level", () => {
    const r = parseDocument("t.pdf", [page(1, "A", "3 pallets"), page(2, "A", "4 pallets")]);
    expect(r.refusals.find((x) => x.code === "CONFLICTING_VALUES")?.page).toBeNull();
  });
});

describe("numbers", () => {
  it("formats negative cents", () => expect(formatMoney(-150)).toBe("-$1.50"));
  it("refuses to multiply to a fraction of a cent", () => expect(multiplyCents(1.5, 333)).toBeNull());
});
