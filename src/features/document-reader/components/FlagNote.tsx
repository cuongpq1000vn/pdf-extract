import { TriangleAlert } from "lucide-react";
import type { Flag } from "../types";

export interface FlagNoteProps {
  flag: Flag;
}

export const FlagNote = ({ flag }: FlagNoteProps) => (
  <div className="mt-1 inline-flex items-center gap-1 rounded-(--radius-sm) bg-(--badge-warning-bg) px-1.5 text-xs text-warning">
    <TriangleAlert size={12} aria-hidden="true" className="flex-none" />
    {flag.message}
  </div>
);
