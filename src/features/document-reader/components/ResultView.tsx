import type { ExtractionResult } from "../types";
import { LineItemsPanel } from "./LineItemsPanel";
import { RawJson } from "./RawJson";
import { RefusalList } from "./RefusalList";
import { SummaryPanel } from "./SummaryPanel";
import { TotalsPanel } from "./TotalsPanel";

export interface ResultViewProps {
  result: ExtractionResult;
}

// Refusals come before the items on purpose: they are what a person must act on.
export const ResultView = ({ result }: ResultViewProps) => (
  <>
    <SummaryPanel result={result} />
    <RefusalList refusals={result.refusals} />
    <TotalsPanel totals={result.totals} />
    <LineItemsPanel items={result.lineItems} />
    <RawJson result={result} />
  </>
);
