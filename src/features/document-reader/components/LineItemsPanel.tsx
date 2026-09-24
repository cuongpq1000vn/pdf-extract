import { EmptyState, Panel } from "../../../shared";
import type { LineItem } from "../types";
import { PageRows } from "./PageRows";

export interface LineItemsPanelProps {
  items: LineItem[];
}

const groupByPage = (items: LineItem[]): [number, LineItem[]][] => {
  const groups = new Map<number, LineItem[]>();
  for (const item of items) groups.set(item.page, [...(groups.get(item.page) ?? []), item]);
  return [...groups];
};

const HEADINGS = [
  ["#", "text-left"],
  ["Description", "text-left"],
  ["Qty", "text-right"],
  ["Unit", "text-left"],
  ["Unit price", "text-right"],
  ["Line total", "text-right"],
] as const;

export const LineItemsPanel = ({ items }: LineItemsPanelProps) => (
  <Panel
    title={`Lines we extracted (${items.length})`}
    description="Every figure is copied from the document. Click any number to see the exact text it came from."
  >
    {items.length === 0 ? (
      <EmptyState message="No lines could be extracted from this document. See above for why." />
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-app">
              {HEADINGS.map(([label, align]) => (
                <th key={label} className={`px-2 py-1.5 text-xs font-medium text-muted ${align}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          {groupByPage(items).map(([page, rows]) => (
            <PageRows key={page} page={page} items={rows} />
          ))}
        </table>
      </div>
    )}
  </Panel>
);
