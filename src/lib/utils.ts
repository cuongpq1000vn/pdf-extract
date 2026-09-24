import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names, letting a later Tailwind utility win over an earlier one in the same group. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
