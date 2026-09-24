"use client";

import * as Popover from "@radix-ui/react-popover";
import type { ReactNode } from "react";

export interface SourcePopoverProps {
  source: { page: number; text: string; line: string };
  /** What the value is, for screen readers: "Line total", "Quantity"… */
  label: string;
  children: ReactNode;
}

/**
 * A value you can click (or tap, or focus and press Enter) to see exactly
 * where it came from. Replaces a `title` tooltip, which touch screens and
 * screen readers never show.
 */
export const SourcePopover = ({ source, label, children }: SourcePopoverProps) => (
  <Popover.Root>
    <Popover.Trigger
      aria-label={`${label}: ${source.text}. Show source`}
      className="cursor-pointer rounded-(--radius-sm) border-0 bg-transparent p-0 text-inherit underline decoration-border-strong decoration-dotted underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
    >
      {children}
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content
        side="top"
        sideOffset={6}
        collisionPadding={12}
        className="z-50 w-[min(360px,calc(100vw-24px))] rounded-(--radius) border border-border-app bg-surface p-3 text-left text-sm text-text shadow-(--shadow-card)"
      >
        <p className="m-0 text-[11.5px] tracking-wide text-muted uppercase">
          {label} · page {source.page}
        </p>
        <p className="mt-1 mb-0">
          Read from the cell <code className="rounded-(--radius-sm) bg-surface-subtle px-1 font-mono">{source.text}</code>
        </p>
        <p className="mt-2 mb-0 text-xs text-muted">Whole line on the page:</p>
        <code className="mt-0.5 block rounded-(--radius-sm) bg-surface-subtle px-2 py-1 font-mono text-xs break-words">
          {source.line}
        </code>
        <Popover.Arrow className="fill-surface" />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
