import { SourcePopover } from "../../../shared";
import type { LineItem } from "../types";
import { FlagNote } from "./FlagNote";
import { MoneyCell } from "./MoneyCell";

export interface LineItemRowProps {
  item: LineItem;
}

export const LineItemRow = ({ item }: LineItemRowProps) => (
  <tr className="border-b border-border-subtle align-top">
    <td className="px-2 py-2">{item.itemNo.value}</td>
    <td className="px-2 py-2">
      {item.description.value}
      <div className="text-xs text-subtle">
        Source, page {item.page}: “{item.quantity.source.line}”
      </div>
      {item.flags.map((flag) => (
        <FlagNote key={flag.code} flag={flag} />
      ))}
    </td>
    <td className="px-2 py-2 text-right">
      <SourcePopover source={item.quantity.source} label="Quantity">
        {item.quantity.value}
      </SourcePopover>
    </td>
    <td className="px-2 py-2">{item.unit?.value ?? <span className="text-muted italic">none</span>}</td>
    <MoneyCell field={item.unitPrice} label="Unit price" />
    <MoneyCell field={item.lineTotal} label="Line total" />
  </tr>
);
