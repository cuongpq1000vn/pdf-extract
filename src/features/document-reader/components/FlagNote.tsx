import type { Flag } from "../types";

export interface FlagNoteProps {
  flag: Flag;
}

export const FlagNote = ({ flag }: FlagNoteProps) => (
  <div className="mt-1 inline-block rounded-(--radius-sm) bg-(--badge-warning-bg) px-1.5 text-xs text-warning">
    ⚠ {flag.message}
  </div>
);
