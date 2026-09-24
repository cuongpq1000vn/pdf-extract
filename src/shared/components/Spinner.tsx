import { cva } from "class-variance-authority";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const spinner = cva(
  "inline-block animate-spin rounded-full border-current border-r-transparent motion-reduce:[animation-duration:2.4s]",
  {
    variants: {
      size: {
        sm: "size-3 border-2",
        md: "size-3.5 border-2",
        lg: "size-6 border-[3px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export const Spinner = ({ size = "md", label = "Loading" }: SpinnerProps) => (
  <span className={spinner({ size })} role="status" aria-label={label} />
);
