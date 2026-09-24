"use client";

import { cva } from "class-variance-authority";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "../theme";

const OPTIONS: readonly { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

const option = cva(
  [
    "inline-flex h-[24px] w-[28px] cursor-pointer items-center justify-center rounded-full border-0",
    "transition-colors duration-[160ms] motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ring)",
  ],
  {
    variants: {
      active: {
        true: "bg-surface text-primary shadow-(--shadow-raise)",
        false: "bg-transparent text-muted hover:text-text",
      },
    },
  },
);

/**
 * Three-way theme control: three states rather than a switch because "follow
 * the OS" is a real preference. A radiogroup, so the current state is readable
 * without colour.
 */
export const ThemeToggle = () => {
  const { choice, setChoice } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex items-center gap-0.5 rounded-full border border-border-app bg-surface-subtle p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          className={option({ active: choice === value })}
          onClick={() => setChoice(value)}
        >
          <Icon size={14} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};
