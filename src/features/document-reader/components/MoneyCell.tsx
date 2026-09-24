import type { Field } from "../types";
import { formatMoney } from "./format";

export interface MoneyCellProps {
  field: Field<number> | null;
}

/** A dollar value with its exact source text on hover, or a plain "not printed". */
export const MoneyCell = ({ field }: MoneyCellProps) =>
  field === null ? (
    <td className="px-2 py-2 text-right text-muted italic" title="Not printed in the document, so not calculated">
      not printed
    </td>
  ) : (
    <td className="px-2 py-2 text-right whitespace-nowrap" title={`Page ${field.source.page}: "${field.source.text}"`}>
      {formatMoney(field.value)}
    </td>
  );
