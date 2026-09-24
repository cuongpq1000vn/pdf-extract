import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractFromPdf } from ".";
import { parseMoney } from "./numbers";
import { parseDocument } from "./parse";
import type { ExtractionResult, PageInput, TextLine } from "./types";

const SAMPLES = path.join(__dirname, "../../../samples");

async function sample(name: string): Promise<ExtractionResult> {
  const out = await extractFromPdf(name, new Uint8Array(fs.readFileSync(path.join(SAMPLES, name))));
  if (!out.ok) throw new Error(`${name}: ${out.error.message}`);
  return out.result;
}

const codes = (r: ExtractionResult) => r.refusals.map((x) => x.code);

// Build a text page from rows of [x, text] pairs, same shape pdf.ts produces.
function textPage(page: number, rows: [number, string][][]): PageInput {
  const lines: TextLine[] = rows.map((cells, i) => ({
    y: 800 - i * 15,
    cells: cells.map(([x, str]) => ({ x, str })),
    text: cells.map(([, s]) => s).join(" "),
  }));
  return { page, kind: "text", lines };
}
const HEADER: [number, string][] = [
  [43, "Item"], [71, "Description"], [326, "Qty"], [377, "Unit"], [428, "Unit Price"], [502, "Line Total"],
];
const row = (n: string, desc: string, qty: string, unit: string, price: string, total: string): [number, string][] => [
  [43, n], [71, desc], [326, qty], [377, unit], [428, price], [502, total],
];

describe("refuses instead of guessing", () => {
  it("refuses a scanned page and outputs no numbers from it", async () => {
    const r = await sample("KBS-10241.pdf");
    expect(r.lineItems).toHaveLength(0);
    expect(r.totals).toHaveLength(0);
    expect(codes(r)).toContain("SCANNED_PAGE");
    expect(r.pages[0].status).toBe("refused");
  });

  it("does not calculate line totals that are not printed", async () => {
    const r = await sample("KBS-10255.pdf");
    expect(r.lineItems).toHaveLength(4);
    for (const item of r.lineItems) expect(item.lineTotal).toBeNull();
    expect(codes(r)).toContain("LINE_TOTAL_NOT_PRINTED");
    expect(codes(r)).toContain("TOTAL_NOT_STATED");
    expect(r.totals).toHaveLength(0);
  });

  it("refuses the ambiguous weight column instead of reading it", async () => {
    const r = await sample("KBS-10255.pdf");
    const weight = r.refusals.find((x) => x.code === "COLUMN_NOT_UNDERSTOOD");
    expect(weight?.detail).toMatch(/per item/);
    expect(weight?.evidence.map((e) => e.text)).toEqual(["25kg", "480g total", "1.2kg", "650g"]);
    // Weights may appear in a row's context line, but never as an extracted value.
    const values = r.lineItems.flatMap((i) => [i.description, i.quantity, i.unit, i.unitPrice].map((f) => String(f?.value)));
    expect(values.join(" ")).not.toMatch(/480|25kg|650/);
  });

  it("flags a total that doesn't match its lines, and does not correct it", async () => {
    const r = await sample("KBS-10270.pdf");
    expect(r.totals).toHaveLength(1);
    expect(r.totals[0].amount.value).toBe(1612.9);
    expect(r.totals[0].check).toEqual({ status: "does_not_match_lines", linesSum: 1538.2, difference: 74.7 });
    const mismatch = r.refusals.find((x) => x.code === "TOTAL_MISMATCH");
    expect(mismatch?.detail).toContain("$1,612.90");
    expect(mismatch?.detail).toContain("$1,538.20");
  });

  it("surfaces contradicting counts in notes instead of picking one", async () => {
    const r = await sample("KBS-10262.pdf");
    const conflict = r.refusals.find((x) => x.code === "CONFLICTING_VALUES");
    expect(conflict?.title).toMatch(/pallet/);
    expect(conflict?.evidence.map((e) => e.text)).toEqual([
      "Summary: 14 pallets loaded at depot, all strapped and wrapped.",
      "Driver notes: 16 pallets unloaded at site, all accounted for on the day.",
    ]);
  });

  it("leaves out a row whose quantity isn't a plain number", () => {
    const r = parseDocument("x.pdf", [
      textPage(1, [HEADER, row("1", "Board", "12a", "sheet", "$10.00", "$120.00"), row("2", "Screws", "3", "box", "$5.00", "$15.00")]),
    ]);
    expect(r.lineItems.map((i) => i.itemNo.value)).toEqual([2]);
    expect(r.refusals.find((x) => x.code === "VALUE_UNREADABLE")?.evidence[0].text).toBe("12a");
  });

  it("flags a line where qty × price ≠ line total but keeps the printed figures", () => {
    const r = parseDocument("x.pdf", [textPage(1, [HEADER, row("1", "Board", "10", "sheet", "$10.00", "$99.00")])]);
    expect(r.lineItems[0].lineTotal?.value).toBe(99);
    expect(r.lineItems[0].flags.map((f) => f.code)).toContain("LINE_TOTAL_MISMATCH");
    expect(codes(r)).toContain("LINE_TOTAL_MISMATCH");
  });
});

describe("contains problems to the part of the file they are in", () => {
  it("still reads the other 7 pages when page 4 is scanned", async () => {
    const r = await sample("KBS-DR118.pdf");
    expect(r.pages.map((p) => p.status)).toEqual(["read", "read", "read", "refused", "read", "read", "read", "read"]);
    expect(r.lineItems).toHaveLength(21);
    expect(r.refusals.filter((x) => x.code === "SCANNED_PAGE").map((x) => x.page)).toEqual([4]);
  });

  it("flags returns / credit / summary pages rather than treating them as deliveries", async () => {
    const r = await sample("KBS-DR118.pdf");
    const unclear = r.refusals.filter((x) => x.code === "SECTION_MEANING_UNCLEAR").map((x) => x.page);
    expect(unclear).toEqual([5, 6, 7, 8]);
    for (const item of r.lineItems.filter((i) => i.page >= 5))
      expect(item.flags.map((f) => f.code)).toContain("SECTION_MEANING_UNCLEAR");
  });

  it("survives a page that crashes the parser", () => {
    const broken = { page: 2, kind: "text", lines: null } as unknown as PageInput;
    const r = parseDocument("x.pdf", [
      textPage(1, [HEADER, row("1", "Board", "2", "sheet", "$10.00", "$20.00")]),
      broken,
    ]);
    expect(r.lineItems).toHaveLength(1);
    expect(r.pages.map((p) => p.status)).toEqual(["read", "failed"]);
    expect(r.refusals.find((x) => x.code === "PAGE_FAILED")?.detail).toMatch(/other pages were still read/);
  });
});

describe("file-level errors carry a real reason", () => {
  it("rejects a file that isn't a PDF", async () => {
    const out = await extractFromPdf("notes.txt", new TextEncoder().encode("hello"));
    expect(out).toMatchObject({ ok: false, error: { code: "NOT_A_PDF" } });
  });

  it("reports a damaged PDF as damaged", async () => {
    const out = await extractFromPdf("bad.pdf", new TextEncoder().encode("%PDF-1.4\nthis is not really a pdf"));
    expect(out).toMatchObject({ ok: false, error: { code: "CORRUPT_PDF" } });
  });
});

describe("every number is traceable", () => {
  it("every numeric Field's value can be read back from its own source text", async () => {
    for (const name of fs.readdirSync(SAMPLES)) {
      const r = await sample(name);
      const fields: { value: number; source: { page: number; text: string } }[] = [];
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (typeof o.value === "number" && o.source) fields.push(o as never);
          Object.values(o).forEach(walk);
        }
      };
      walk(r);
      expect(fields.length).toBeGreaterThan(name === "KBS-10241.pdf" ? -1 : 0);
      for (const f of fields) {
        expect(f.source.page).toBeGreaterThan(0);
        const money = /\$[\d,]+\.\d{2}/.exec(f.source.text);
        // A sign in front of the amount would make the value wrong, not just differently formatted.
        if (money) expect(f.source.text.slice(0, money.index), `${name}: signed amount`).not.toMatch(/[-\u2212(]\s*$/);
        const readBack = money ? parseMoney(money[0])!.cents / 100 : Number(f.source.text);
        expect(readBack, `${name} p${f.source.page} "${f.source.text}"`).toBe(f.value);
      }
    }
  });
});
