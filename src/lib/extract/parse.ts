// Pure parser: PageInput[] -> ExtractionResult. No PDF library in here, so the
// refusal rules can be tested with hand-built pages as well as real samples.
//
// Rules this file enforces:
// - A number is only output if it was read from one exact cell (Field.source).
// - Nothing is calculated and then presented as extracted. Sums are only used
//   to check printed figures, and a failed check becomes a refusal.
// - A problem on one page or one row is recorded and the rest carries on.

import {
  centsToNumber,
  formatMoney,
  multiplyCents,
  parseItemNo,
  parseMoney,
  parseQuantity,
} from "./numbers";
import type {
  Cell,
  ExtractionResult,
  Field,
  LineItem,
  PageInput,
  PageStatus,
  Refusal,
  SectionKind,
  Source,
  StatedTotal,
  TextLine,
} from "./types";

type ColumnKey = "item" | "description" | "qty" | "unit" | "unitPrice" | "lineTotal";
type Column = { key: ColumnKey | null; name: string; x: number };

const KNOWN_COLUMNS: Record<string, ColumnKey> = {
  item: "item",
  "#": "item",
  description: "description",
  qty: "qty",
  quantity: "qty",
  unit: "unit",
  "unit price": "unitPrice",
  price: "unitPrice",
  "line total": "lineTotal",
  amount: "lineTotal",
};

/** How far left of a header a cell may start and still belong to that column. */
const COLUMN_SLACK = 4;

type PageResult = {
  items: LineItem[];
  totals: StatedTotal[];
  refusals: Refusal[];
  notes: Source[];
  meta: { documentNo: Field<string> | null; date: Field<string> | null };
  /** A total line had an amount we refused to read (so the total isn't "not printed"). */
  totalUnreadable: boolean;
  status: PageStatus["status"];
};

export function parseDocument(fileName: string, pages: PageInput[]): ExtractionResult {
  const lineItems: LineItem[] = [];
  const totals: StatedTotal[] = [];
  const refusals: Refusal[] = [];
  const notes: Source[] = [];
  const pageStatuses: PageStatus[] = [];
  const docNos: Field<string>[] = [];
  const dates: Field<string>[] = [];
  let totalUnreadable = false;
  for (const input of pages) {
    let result: PageResult;
    try {
      result = parsePage(input);
    } catch (err) {
      // Containment: a bug or odd layout on one page must not lose the others.
      result = emptyResult("failed", [
        {
          code: "PAGE_FAILED",
          page: input.page,
          title: `Page ${input.page} could not be read`,
          detail: `Something unexpected happened while reading this page, so nothing from it is included. The other pages were still read. Technical detail: ${errorMessage(err)}`,
          evidence: [],
        },
      ]);
    }
    lineItems.push(...result.items);
    totals.push(...result.totals);
    refusals.push(...result.refusals);
    notes.push(...result.notes);
    if (result.meta.documentNo) docNos.push(result.meta.documentNo);
    if (result.meta.date) dates.push(result.meta.date);
    totalUnreadable ||= result.totalUnreadable;
    pageStatuses.push({ page: input.page, status: result.status, lineItemCount: result.items.length });
  }

  const readablePages = pageStatuses.some((p) => p.status === "read");
  if (readablePages && totals.length === 0 && !totalUnreadable) {
    refusals.push({
      code: "TOTAL_NOT_STATED",
      page: null,
      title: "No total is printed",
      detail:
        "No total amount appears anywhere in this document. We did not add up the lines to make one, because that figure would not come from the document.",
      evidence: [],
    });
  }

  refusals.push(...findConflictingMeta("document number", docNos));
  refusals.push(...findConflictingMeta("date", dates));
  refusals.push(...findConflictingCounts(notes));

  return {
    fileName,
    pageCount: pages.length,
    documentNo: docNos[0] ?? null,
    date: dates[0] ?? null,
    pages: pageStatuses,
    lineItems,
    totals,
    refusals,
  };
}

function parsePage(input: PageInput): PageResult {
  const page = input.page;
  switch (input.kind) {
    case "image_only":
      return emptyResult("refused", [
        {
          code: "SCANNED_PAGE",
          page,
          title: `Page ${page} is a scanned image`,
          detail:
            "This page is a picture of a document, not text, and we don't read pictures. Nothing on this page was extracted. Please check this page by hand.",
          evidence: [],
        },
      ]);
    case "empty":
      return emptyResult("refused", [
        {
          code: "EMPTY_PAGE",
          page,
          title: `Page ${page} is blank`,
          detail: "We found no text or images on this page.",
          evidence: [],
        },
      ]);
    case "error":
      return emptyResult("failed", [
        {
          code: "PAGE_FAILED",
          page,
          title: `Page ${page} could not be opened`,
          detail: `The PDF reader could not open this page, so nothing from it is included. The other pages were still read. Technical detail: ${input.message}`,
          evidence: [],
        },
      ]);
    case "text":
      return parseTextPage(page, input.lines);
  }
}

function parseTextPage(page: number, lines: TextLine[]): PageResult {
  const refusals: Refusal[] = [];
  const items: LineItem[] = [];
  const totals: StatedTotal[] = [];
  const notes: Source[] = [];
  const meta: PageResult["meta"] = { documentNo: null, date: null };
  let totalUnreadable = false;
  const src = (line: TextLine, text: string): Source => ({ page, text, line: line.text });

  const headerIndex = lines.findIndex(isHeaderLine);
  const heading = findHeading(lines, headerIndex);
  const section = { kind: classifySection(heading), heading };

  // Everything outside the table: metadata and free-text notes.
  lines.forEach((line, i) => {
    if (i === headerIndex) return;
    const docNo = /^Document No:\s*(.+)$/i.exec(line.text);
    const date = /^Date:\s*(.+)$/i.exec(line.text);
    if (docNo) meta.documentNo ??= { value: docNo[1].trim(), source: src(line, line.text) };
    else if (date) meta.date ??= { value: date[1].trim(), source: src(line, line.text) };
  });

  if (headerIndex === -1) {
    for (const line of lines) if (!isMetaLine(line)) notes.push(src(line, line.text));
    return {
      items,
      totals,
      notes,
      meta,
      totalUnreadable,
      status: "refused",
      refusals: [
        {
          code: "NO_TABLE_FOUND",
          page,
          title: `No item table found on page ${page}`,
          detail:
            'We look for a table with "Description" and "Qty" column headings. This page has text but no such table, so no items were taken from it.',
          evidence: lines.slice(0, 3).map((l) => src(l, l.text)),
        },
      ],
    };
  }

  const columns = readColumns(lines[headerIndex]);
  const hasColumn = (k: ColumnKey) => columns.some((c) => c.key === k);
  const unknownColumns = columns.filter((c) => c.key === null);
  const unknownCells = new Map<string, Source[]>(unknownColumns.map((c) => [c.name, []]));
  let rowsRefused = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i <= headerIndex) {
      if (i < headerIndex && !isMetaLine(line)) notes.push(src(line, line.text));
      continue;
    }
    if (/^-{3,}$/.test(line.text.trim())) continue;

    const cells = assignCells(line.cells, columns);
    const itemNoText = cells.get("item");
    const itemNo = itemNoText !== undefined ? parseItemNo(itemNoText) : null;

    if (itemNo === null) {
      if (/^total\b/i.test(line.text.trim())) {
        const total = readTotal(page, line);
        if (total?.kind === "read") totals.push({ page, amount: total.field, check: { status: "unchecked", reason: "" } });
        else if (total?.kind === "unreadable") {
          totalUnreadable = true;
          refusals.push({
            code: "VALUE_UNREADABLE",
            page,
            title: "The total couldn't be read",
            detail: `The total reads "${total.source.text}". We only accept a plain dollar amount such as $1,234.56 (no minus sign or brackets), so no total was taken from this line.`,
            evidence: [total.source],
          });
        } else
          refusals.push({
            code: "TOTAL_NOT_STATED",
            page,
            title: "A total is mentioned but no figure is given",
            detail: `The document says "${line.text}" but gives no figure for it. We did not work one out from the lines.`,
            evidence: [src(line, line.text)],
          });
      } else if (!/^page \d+ of \d+$/i.test(line.text.trim())) {
        notes.push(src(line, line.text));
      }
      continue;
    }

    for (const col of unknownColumns) {
      const v = cells.get(col.name);
      if (v !== undefined) unknownCells.get(col.name)!.push(src(line, v));
    }

    const row = readRow(page, line, cells, itemNo, section, hasColumn("lineTotal"));
    refusals.push(...row.refusals);
    if (row.item) items.push(row.item);
    else rowsRefused++;
  }

  if (!hasColumn("lineTotal") && items.length > 0) {
    refusals.push({
      code: "LINE_TOTAL_NOT_PRINTED",
      page,
      title: "Line totals are not printed",
      detail:
        "This table has no line total column. We did not work out quantity × price ourselves, because those amounts would not appear anywhere in the document.",
      evidence: [src(lines[headerIndex], lines[headerIndex].text)],
    });
  }

  for (const col of unknownColumns) {
    refusals.push(unknownColumnRefusal(page, col.name, unknownCells.get(col.name)!));
  }

  if (section.kind !== "delivery" && items.length > 0) {
    refusals.push({
      code: "SECTION_MEANING_UNCLEAR",
      page,
      title: `Unclear what page ${page} means for the totals`,
      detail: `${SECTION_EXPLANATION[section.kind]} We extracted these lines exactly as printed, but did not decide whether they should be counted, subtracted or ignored.`,
      evidence: [{ page, text: heading, line: heading }],
    });
  }

  for (const total of totals) total.check = checkTotal(total, items, rowsRefused);
  for (const total of totals) {
    if (total.check.status !== "does_not_match_lines") continue;
    const { linesSum, difference } = total.check;
    refusals.push({
      code: "TOTAL_MISMATCH",
      page,
      title: "The printed total doesn't match the lines",
      detail: `The document's total is ${total.amount.source.text}, but the line totals on this page add up to ${formatMoney(
        Math.round(linesSum * 100),
      )} (a difference of ${formatMoney(Math.round(difference * 100))}). Nothing in the document explains the gap, so we are not treating either figure as correct.`,
      // A mismatch is only possible when every line has a printed total (see checkTotal).
      evidence: [total.amount.source, ...items.map((it) => it.lineTotal!.source)],
    });
  }

  return { items, totals, refusals, notes, meta, totalUnreadable, status: "read" };
}

function readRow(
  page: number,
  line: TextLine,
  cells: Map<string, string>,
  itemNo: number,
  section: LineItem["section"],
  expectLineTotal: boolean,
): { item: LineItem | null; refusals: Refusal[] } {
  const refusals: Refusal[] = [];
  const src = (text: string): Source => ({ page, text, line: line.text });
  const rowSource = src(line.text);

  const descText = cells.get("description")?.trim();
  const qtyText = cells.get("qty")?.trim();
  const missing = [!descText && "description", !qtyText && "quantity"].filter(Boolean);
  if (missing.length > 0) {
    return {
      item: null,
      refusals: [
        {
          code: "ROW_INCOMPLETE",
          page,
          title: `Item ${itemNo} on page ${page} is incomplete`,
          detail: `This line has no ${missing.join(" or ")} we could find, so the whole line was left out rather than guessed.`,
          evidence: [rowSource],
        },
      ],
    };
  }

  const qty = parseQuantity(qtyText!);
  if (qty === null) {
    return {
      item: null,
      refusals: [
        {
          code: "VALUE_UNREADABLE",
          page,
          title: `Quantity for item ${itemNo} on page ${page} isn't a plain number`,
          detail: `The quantity reads "${qtyText}". We only accept plain numbers, so the whole line was left out.`,
          evidence: [src(qtyText!)],
        },
      ],
    };
  }

  const flags: LineItem["flags"] = [];
  const money = (key: "unitPrice" | "lineTotal", label: string) => {
    const text = cells.get(key)?.trim();
    if (!text) return null;
    const parsed = parseMoney(text);
    if (!parsed) {
      refusals.push({
        code: "VALUE_UNREADABLE",
        page,
        title: `${label} for item ${itemNo} on page ${page} couldn't be read`,
        detail: `It reads "${text}", which isn't a dollar amount we recognise, so it was left blank.`,
        evidence: [src(text)],
      });
      return null;
    }
    return { field: { value: centsToNumber(parsed.cents), source: src(text) }, parsed };
  };

  const price = money("unitPrice", "Unit price");
  const total = money("lineTotal", "Line total");
  if (expectLineTotal && !total && !cells.get("lineTotal")) {
    refusals.push({
      code: "ROW_INCOMPLETE",
      page,
      title: `Item ${itemNo} on page ${page} has no line total`,
      detail: "The line total cell is empty. We did not calculate one.",
      evidence: [rowSource],
    });
  }

  const unitText = cells.get("unit")?.trim();
  const unit: Field<string> | null = unitText
    ? { value: unitText, source: src(unitText) }
    : price?.parsed.per
      ? { value: price.parsed.per, source: price.field.source }
      : null;

  if (price && total) {
    const expected = multiplyCents(qty, price.parsed.cents);
    if (expected !== total.parsed.cents) {
      const msg = `${qtyText} × ${price.field.source.text} does not equal the printed line total ${total.field.source.text}.`;
      flags.push({ code: "LINE_TOTAL_MISMATCH", message: msg });
      refusals.push({
        code: "LINE_TOTAL_MISMATCH",
        page,
        title: `Item ${itemNo} on page ${page}: numbers don't add up`,
        detail: `${msg} We show the figures as printed but can't tell which one is wrong.`,
        evidence: [rowSource],
      });
    }
  }

  if (section.kind !== "delivery") {
    flags.push({
      code: "SECTION_MEANING_UNCLEAR",
      message: `From a page headed "${section.heading}". Check whether this line should count.`,
    });
  }

  return {
    item: {
      page,
      section,
      itemNo: { value: itemNo, source: src(cells.get("item")!) },
      description: { value: descText!, source: src(descText!) },
      quantity: { value: qty, source: src(qtyText!) },
      unit,
      unitPrice: price?.field ?? null,
      lineTotal: total?.field ?? null,
      flags,
    },
    refusals,
  };
}

function checkTotal(total: StatedTotal, items: LineItem[], rowsRefused: number): StatedTotal["check"] {
  if (items.length === 0) return { status: "unchecked", reason: "No lines were extracted on this page to compare against." };
  if (rowsRefused > 0)
    return { status: "unchecked", reason: "Some lines on this page were left out, so the lines can't be compared to the total." };
  if (items.some((it) => !it.lineTotal))
    return { status: "unchecked", reason: "Some lines have no printed line total, so the lines can't be compared to the total." };
  const sumCents = items.reduce((s, it) => s + Math.round(it.lineTotal!.value * 100), 0);
  const statedCents = Math.round(total.amount.value * 100);
  if (sumCents === statedCents) return { status: "matches_lines" };
  return {
    status: "does_not_match_lines",
    linesSum: centsToNumber(sumCents),
    difference: centsToNumber(statedCents - sumCents),
  };
}

/**
 * The amount on a "Total" line. An amount we can't take exactly as printed
 * (malformed, or signed like "-$153.90" or "($153.90)") is "unreadable": reading
 * just the "$153.90" part would silently drop the sign.
 */
function readTotal(
  page: number,
  line: TextLine,
): { kind: "read"; field: Field<number> } | { kind: "unreadable"; source: Source } | null {
  for (const cell of line.cells) {
    const m = /\$[\d,.]+/.exec(cell.str);
    if (!m) continue;
    const source = { page, text: cell.str, line: line.text };
    const signed = /[-−(]\s*$/.test(cell.str.slice(0, m.index));
    const parsed = parseMoney(m[0]);
    if (signed || !parsed) return { kind: "unreadable", source };
    return { kind: "read", field: { value: centsToNumber(parsed.cents), source } };
  }
  return null;
}

const SECTION_EXPLANATION: Record<Exclude<SectionKind, "delivery">, string> = {
  summary: "This page is a summary. Its lines might repeat lines from other pages, or might be extra items.",
  returns: "This page is a returns note. Its lines might be goods sent back rather than goods delivered.",
  credit: "This page is a credit adjustment. Its lines might be money taken off rather than charges.",
  acceptance: "This page is a signed acceptance. Its lines might be a sign-off copy of lines listed elsewhere.",
};

function classifySection(heading: string): SectionKind {
  if (/return/i.test(heading)) return "returns";
  if (/credit/i.test(heading)) return "credit";
  if (/summary/i.test(heading)) return "summary";
  if (/accept|sign/i.test(heading)) return "acceptance";
  return "delivery";
}

function findHeading(lines: TextLine[], headerIndex: number): string {
  const end = headerIndex === -1 ? lines.length : headerIndex;
  for (let i = 1; i < end; i++) if (!lines[i].text.includes(":")) return lines[i].text;
  return "";
}

function isHeaderLine(line: TextLine): boolean {
  const names = line.cells.map((c) => c.str.trim().toLowerCase());
  return names.includes("description") && (names.includes("qty") || names.includes("quantity"));
}

function isMetaLine(line: TextLine): boolean {
  return /^(Document No|Date|Delivered to|Ordered by):/i.test(line.text);
}

function readColumns(header: TextLine): Column[] {
  return [...header.cells]
    .sort((a, b) => a.x - b.x)
    .map((c) => {
      const name = c.str.trim();
      return { key: KNOWN_COLUMNS[name.toLowerCase()] ?? null, name, x: c.x };
    });
}

/** Put each cell under the right-most column heading that starts at or before it. */
function assignCells(cells: Cell[], columns: Column[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const cell of cells) {
    let col = columns[0];
    for (const c of columns) if (c.x <= cell.x + COLUMN_SLACK) col = c;
    const key = col.key ?? col.name;
    const prev = out.get(key);
    out.set(key, prev === undefined ? cell.str : `${prev} ${cell.str}`);
  }
  return out;
}

function unknownColumnRefusal(page: number, name: string, cells: Source[]): Refusal {
  let why = "";
  if (/weight/i.test(name)) {
    const marked = cells.filter((c) => /total/i.test(c.text)).length;
    if (marked > 0 && marked < cells.length)
      why = ` Some weights are marked "total" and others are not, so we can't tell which are per item and which are for the whole line.`;
    const units = new Set(cells.map((c) => /[a-z]+/i.exec(c.text.replace(/total/i, ""))?.[0]).filter(Boolean));
    if (units.size > 1) why += ` The units also vary (${[...units].join(", ")}).`;
  }
  return {
    code: "COLUMN_NOT_UNDERSTOOD",
    page,
    title: `"${name}" column not extracted`,
    detail: `We don't extract the "${name}" column, so none of its values are in the results.${why}`,
    evidence: cells,
  };
}

// ---- Cross-page checks ----

function findConflictingMeta(label: string, fields: Field<string>[]): Refusal[] {
  const distinct = new Map<string, Field<string>>();
  for (const f of fields) if (!distinct.has(f.value)) distinct.set(f.value, f);
  if (distinct.size <= 1) return [];
  return [
    {
      code: "CONFLICTING_VALUES",
      page: null,
      title: `Pages disagree on the ${label}`,
      detail: `Different pages show different values: ${[...distinct.keys()].map((v) => `"${v}"`).join(", ")}. We are not picking one.`,
      evidence: [...distinct.values()].map((f) => f.source),
    },
  ];
}

const NOT_A_COUNT = new Set([
  "of", "x", "mm", "m", "kg", "g", "ml", "l", "and", "or", "to",
  "january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december",
]);

/**
 * Free-text notes sometimes state the same count twice ("14 pallets loaded",
 * "16 pallets unloaded"). If they disagree we say so instead of picking one.
 */
function findConflictingCounts(notes: Source[]): Refusal[] {
  const byNoun = new Map<string, { value: string; source: Source }[]>();
  for (const note of notes) {
    for (const m of note.text.matchAll(/\b(\d+(?:\.\d+)?)\s+([A-Za-z]+)\b/g)) {
      const noun = m[2].toLowerCase().replace(/s$/, "");
      if (NOT_A_COUNT.has(noun) || noun.length < 3) continue;
      if (!byNoun.has(noun)) byNoun.set(noun, []);
      byNoun.get(noun)!.push({ value: m[1], source: note });
    }
  }
  const refusals: Refusal[] = [];
  for (const [noun, mentions] of byNoun) {
    const values = [...new Set(mentions.map((m) => m.value))];
    if (values.length < 2) continue;
    const pages = new Set(mentions.map((m) => m.source.page));
    refusals.push({
      code: "CONFLICTING_VALUES",
      page: pages.size === 1 ? [...pages][0] : null,
      title: `The ${noun} count doesn't agree`,
      detail: `The document gives different ${noun} counts: ${values.join(" and ")}. They might describe different steps, but nothing explains the difference, so we are not reporting a ${noun} count.`,
      evidence: mentions.map((m) => m.source),
    });
  }
  return refusals;
}

function emptyResult(status: PageStatus["status"], refusals: Refusal[]): PageResult {
  return {
    items: [],
    totals: [],
    refusals,
    notes: [],
    meta: { documentNo: null, date: null },
    totalUnreadable: false,
    status,
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
