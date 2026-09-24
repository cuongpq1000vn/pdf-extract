import {
  Calculator,
  CircleHelp,
  Columns3,
  File,
  FileImage,
  FileQuestionMark,
  FileX,
  GitCompareArrows,
  Scale,
  Sigma,
  Table2,
  type LucideIcon,
} from "lucide-react";
import type { Refusal } from "../types";

/** One picture per kind of problem, so a list of refusals can be scanned by type. */
export const REFUSAL_ICON: Record<Refusal["code"], LucideIcon> = {
  SCANNED_PAGE: FileImage,
  EMPTY_PAGE: File,
  PAGE_FAILED: FileX,
  NO_TABLE_FOUND: Table2,
  ROW_INCOMPLETE: CircleHelp,
  VALUE_UNREADABLE: CircleHelp,
  COLUMN_NOT_UNDERSTOOD: Columns3,
  LINE_TOTAL_NOT_PRINTED: Calculator,
  LINE_TOTAL_MISMATCH: Scale,
  TOTAL_NOT_STATED: Sigma,
  TOTAL_MISMATCH: Scale,
  CONFLICTING_VALUES: GitCompareArrows,
  SECTION_MEANING_UNCLEAR: FileQuestionMark,
};
