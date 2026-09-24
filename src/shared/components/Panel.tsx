import type { ReactNode } from "react";

export interface PanelProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export const Panel = ({ title, description, children }: PanelProps) => (
  <section className="rounded-(--radius-lg) border border-border-app bg-surface p-5 shadow-(--shadow-card)">
    {title !== undefined ? <h2 className="m-0 text-base font-semibold">{title}</h2> : null}
    {description !== undefined ? <p className="mt-0.5 mb-3 text-sm text-muted">{description}</p> : null}
    {children}
  </section>
);
