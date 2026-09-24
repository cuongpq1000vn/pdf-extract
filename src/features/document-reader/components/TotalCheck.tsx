import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import type { StatedTotal } from "../types";
import { formatMoney } from "./format";

export interface TotalCheckProps {
  check: StatedTotal["check"];
}

export const TotalCheck = ({ check }: TotalCheckProps) => {
  switch (check.status) {
    case "matches_lines":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-success">
          <CircleCheck size={15} aria-hidden="true" />
          Matches the lines below
        </span>
      );
    case "does_not_match_lines":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-danger">
          <CircleX size={15} aria-hidden="true" className="flex-none" />
          Lines add up to {formatMoney(check.linesSum)}, a difference of {formatMoney(check.difference)}
        </span>
      );
    case "unchecked":
      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <CircleDashed size={15} aria-hidden="true" className="flex-none" />
          Not checked: {check.reason}
        </span>
      );
  }
};
