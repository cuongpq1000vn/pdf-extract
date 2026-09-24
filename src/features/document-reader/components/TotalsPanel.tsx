import { Panel } from "../../../shared";
import type { StatedTotal } from "../types";
import { EvidenceQuote } from "./EvidenceQuote";
import { formatMoney } from "./format";
import { TotalCheck } from "./TotalCheck";

export interface TotalsPanelProps {
  totals: StatedTotal[];
}

export const TotalsPanel = ({ totals }: TotalsPanelProps) =>
  totals.length === 0 ? null : (
    <Panel title="Printed totals" description="Totals exactly as printed, checked against the line totals.">
      <div className="flex flex-col gap-3">
        {totals.map((total, index) => (
          <div key={index} className="flex flex-col gap-1">
            <span className="text-lg font-semibold">{formatMoney(total.amount.value)}</span>
            <TotalCheck check={total.check} />
            <EvidenceQuote source={total.amount.source} />
          </div>
        ))}
      </div>
    </Panel>
  );
