// Output contract of the extractor. Every number that leaves this module is
// wrapped in a Field, so it always carries the page and exact text it came from.

export type Source = {
  page: number;
  /** Exact text of the cell the value was read from. */
  text: string;
  /** Exact text of the whole line the cell sits on, for context. */
  line: string;
};

export type Field<T> = {
  value: T;
  source: Source;
};

export type SectionKind =
  | "delivery"
  | "summary"
  | "returns"
  | "credit"
  | "acceptance";

export type Flag = {
  code: string;
  message: string;
};

export type LineItem = {
  page: number;
  section: { kind: SectionKind; heading: string };
  itemNo: Field<number>;
  description: Field<string>;
  quantity: Field<number>;
  unit: Field<string> | null;
  unitPrice: Field<number> | null;
  lineTotal: Field<number> | null;
  /** Things the reader should know before using this line. */
  flags: Flag[];
};

export type StatedTotal = {
  page: number;
  amount: Field<number>;
  check:
    | { status: "matches_lines" }
    | { status: "does_not_match_lines"; linesSum: number; difference: number }
    | { status: "unchecked"; reason: string };
};

export type RefusalCode =
  | "SCANNED_PAGE"
  | "EMPTY_PAGE"
  | "PAGE_FAILED"
  | "NO_TABLE_FOUND"
  | "ROW_INCOMPLETE"
  | "VALUE_UNREADABLE"
  | "COLUMN_NOT_UNDERSTOOD"
  | "LINE_TOTAL_NOT_PRINTED"
  | "LINE_TOTAL_MISMATCH"
  | "TOTAL_NOT_STATED"
  | "TOTAL_MISMATCH"
  | "CONFLICTING_VALUES"
  | "SECTION_MEANING_UNCLEAR";

export type Refusal = {
  code: RefusalCode;
  /** null means the refusal applies to the whole document. */
  page: number | null;
  /** Short plain-language headline, shown as-is to the user. */
  title: string;
  /** Plain-language explanation of what we did not do and why. */
  detail: string;
  /** Source text that led to the refusal, when there is any. */
  evidence: Source[];
};

export type PageStatus = {
  page: number;
  status: "read" | "refused" | "failed";
  lineItemCount: number;
};

export type ExtractionResult = {
  fileName: string;
  pageCount: number;
  documentNo: Field<string> | null;
  date: Field<string> | null;
  pages: PageStatus[];
  lineItems: LineItem[];
  totals: StatedTotal[];
  refusals: Refusal[];
};

/** Errors that stop the whole file from being read. Shown to the user as-is. */
export type FileErrorCode =
  | "NO_FILE"
  | "NOT_A_PDF"
  | "FILE_TOO_LARGE"
  | "PASSWORD_PROTECTED"
  | "CORRUPT_PDF"
  | "INTERNAL_ERROR";

export type FileError = {
  code: FileErrorCode;
  title: string;
  message: string;
};

// ---- Input to the pure parser (produced by pdf.ts, or by tests directly) ----

export type Cell = { x: number; str: string };
export type TextLine = { y: number; cells: Cell[]; text: string };

export type PageInput =
  | { page: number; kind: "text"; lines: TextLine[] }
  | { page: number; kind: "image_only" }
  | { page: number; kind: "empty" }
  | { page: number; kind: "error"; message: string };
