import type { Refusal } from "../types";
import { EvidenceQuote } from "./EvidenceQuote";
import { formatWhere } from "./format";

export interface RefusalCardProps {
  refusal: Refusal;
}

export const RefusalCard = ({ refusal }: RefusalCardProps) => (
  <article
    data-code={refusal.code}
    className="rounded-(--radius) border border-(--warning-border) bg-(--warning-subtle) px-4 py-3"
  >
    <div className="flex flex-wrap justify-between gap-3">
      <h3 className="m-0 text-sm font-semibold text-warning">{refusal.title}</h3>
      <span className="text-xs whitespace-nowrap text-muted">{formatWhere(refusal.page)}</span>
    </div>
    <p className="mt-1 mb-0 text-sm">{refusal.detail}</p>
    {refusal.evidence.length > 0 ? (
      <div className="mt-2 flex flex-col gap-1">
        <span className="text-xs text-muted">What the document says:</span>
        {refusal.evidence.map((source, index) => (
          <EvidenceQuote key={index} source={source} />
        ))}
      </div>
    ) : null}
  </article>
);
