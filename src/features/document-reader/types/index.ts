export type {
  ExtractionResult,
  Field,
  FileError,
  Flag,
  LineItem,
  PageStatus,
  Refusal,
  Source,
  StatedTotal,
} from "../../../lib/extract/types";

import type { ExtractionResult } from "../../../lib/extract/types";

/** What one upload ended in. Every error keeps the most specific reason we have. */
export type UploadOutcome =
  | { kind: "result"; result: ExtractionResult }
  | { kind: "error"; title: string; message: string; code?: string };
