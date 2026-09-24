import { SourcePopover } from "../../../shared";
import type { Field } from "../types";
import { formatMoney } from "./format";

export interface MoneyCellProps {
  field: Field<number> | null;
  label: string;
}

/** A dollar value you can click to see its exact source text, or a plain "not printed". */
export const MoneyCell = ({ field, label }: MoneyCellProps) =>
  field === null ? (
    <td className="px-2 py-2 text-right text-muted italic" title="Not printed in the document, so not calculated">
      not printed
    </td>
  ) : (
    <td className="px-2 py-2 text-right whitespace-nowrap">
      <SourcePopover source={field.source} label={label}>
        {formatMoney(field.value)}
      </SourcePopover>
    </td>
  );
