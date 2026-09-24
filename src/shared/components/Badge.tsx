import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const badge = cva(
  "inline-flex h-[21px] items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-(--badge-neutral-bg) text-muted",
        success: "bg-(--badge-success-bg) text-success",
        warning: "bg-(--badge-warning-bg) text-warning",
        danger: "bg-(--badge-danger-bg) text-danger",
        info: "bg-(--badge-info-bg) text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export const Badge = ({ tone = "neutral", children }: BadgeProps) => (
  <span className={badge({ tone })}>
    <span aria-hidden="true" className="size-[5px] flex-none rounded-full bg-current" />
    {children}
  </span>
);
