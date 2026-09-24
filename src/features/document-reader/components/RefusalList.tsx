import { EmptyState, Panel } from "../../../shared";
import type { Refusal } from "../types";
import { RefusalCard } from "./RefusalCard";

export interface RefusalListProps {
  refusals: Refusal[];
}

export const RefusalList = ({ refusals }: RefusalListProps) => (
  <Panel
    title={`What we didn't extract, and why (${refusals.length})`}
    description="We leave things out rather than guess. Each item below needs a person to check it."
  >
    {refusals.length === 0 ? (
      <EmptyState message="Nothing was refused. Every line on every page was read." />
    ) : (
      <div className="flex flex-col gap-2.5">
        {refusals.map((refusal, index) => (
          <RefusalCard key={index} refusal={refusal} />
        ))}
      </div>
    )}
  </Panel>
);
