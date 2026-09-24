"use client";

import { useCallback, useSyncExternalStore } from "react";
import { applyChoice, readChoice, writeChoice } from "./storage";
import type { ThemeChoice } from "./types";

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// The server can't know the stored choice; the boot script in <head> has
// already applied it, so the toggle catches up right after hydration.
const serverChoice = (): ThemeChoice => "system";

export const useTheme = () => {
  const choice = useSyncExternalStore(subscribe, readChoice, serverChoice);

  const setChoice = useCallback((next: ThemeChoice) => {
    writeChoice(next);
    applyChoice(next);
    listeners.forEach((listener) => listener());
  }, []);

  return { choice, setChoice };
};
