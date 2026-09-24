import type { LineItem } from "../types";
import { LineItemRow } from "./LineItemRow";

export interface PageRowsProps {
  page: number;
  items: LineItem[];
}

export const PageRows = ({ page, items }: PageRowsProps) => {
  const heading = items[0].section.heading;
  return (
    <tbody>
      <tr>
        <td colSpan={6} className="bg-surface-subtle px-2 py-1.5 text-xs font-semibold">
          Page {page}
          {heading !== "" ? ` · ${heading}` : null}
        </td>
      </tr>
      {items.map((item) => (
        <LineItemRow key={item.itemNo.value} item={item} />
      ))}
    </tbody>
  );
};
