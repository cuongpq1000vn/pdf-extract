import type { Source } from "../types";

export interface EvidenceQuoteProps {
  source: Source;
}

export const EvidenceQuote = ({ source }: EvidenceQuoteProps) => (
  <code className="block rounded-(--radius-sm) bg-surface-subtle px-2 py-1 font-mono text-xs break-words text-text">
    Page {source.page}: “{source.line}”
  </code>
);
