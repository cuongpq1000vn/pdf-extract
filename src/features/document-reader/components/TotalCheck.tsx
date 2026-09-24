import type { StatedTotal } from "../types";
import { formatMoney } from "./format";

export interface TotalCheckProps {
  check: StatedTotal["check"];
}

export const TotalCheck = ({ check }: TotalCheckProps) => {
  switch (check.status) {
    case "matches_lines":
      return <span className="text-sm text-success">✓ Matches the lines below</span>;
    case "does_not_match_lines":
      return (
        <span className="text-sm text-danger">
          ✗ Lines add up to {formatMoney(check.linesSum)}, a difference of {formatMoney(check.difference)}
        </span>
      );
    case "unchecked":
      return <span className="text-sm text-muted">Not checked: {check.reason}</span>;
  }
};
