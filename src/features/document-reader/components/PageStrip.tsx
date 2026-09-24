import { Badge, type BadgeTone } from "../../../shared";
import type { PageStatus } from "../types";

export interface PageStripProps {
  pages: PageStatus[];
}

const TONE: Record<PageStatus["status"], BadgeTone> = { read: "success", refused: "warning", failed: "danger" };
const LABEL: Record<PageStatus["status"], string> = { read: "read", refused: "not read", failed: "failed" };

export const PageStrip = ({ pages }: PageStripProps) => (
  <ul aria-label="Page status" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
    {pages.map((page) => (
      <li key={page.page}>
        <Badge tone={TONE[page.status]}>
          Page {page.page}: {LABEL[page.status]}
          {page.status === "read" ? ` · ${page.lineItemCount} lines` : null}
        </Badge>
      </li>
    ))}
  </ul>
);
