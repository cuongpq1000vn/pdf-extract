import { Panel } from "../../../shared";
import type { ExtractionResult } from "../types";
import { PageStrip } from "./PageStrip";
import { StatItem } from "./StatItem";

export interface SummaryPanelProps {
  result: ExtractionResult;
}

export const SummaryPanel = ({ result }: SummaryPanelProps) => {
  const pagesRead = result.pages.filter((page) => page.status === "read").length;
  return (
    <Panel>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <StatItem label="File" value={result.fileName} />
        <StatItem label="Document no." value={result.documentNo?.value ?? "Not found"} />
        <StatItem label="Date" value={result.date?.value ?? "Not found"} />
        <StatItem label="Pages read" value={`${pagesRead} of ${result.pageCount}`} />
        <StatItem label="Lines extracted" value={String(result.lineItems.length)} />
        <StatItem label="Needs checking" value={String(result.refusals.length)} />
      </div>
      <PageStrip pages={result.pages} />
    </Panel>
  );
};
