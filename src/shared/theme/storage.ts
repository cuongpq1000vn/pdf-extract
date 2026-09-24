import type { ThemeChoice } from "./types";

export const THEME_STORAGE_KEY = "pdf-extract-theme";

const isChoice = (value: unknown): value is ThemeChoice =>
  value === "light" || value === "dark" || value === "system";

// Kept for viewers whose browser refuses localStorage (private mode, blocked
// site data): the toggle still works for this visit.
let memory: ThemeChoice = "system";

export const readChoice = (): ThemeChoice => {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isChoice(raw) ? raw : memory;
  } catch {
    return memory;
  }
};

export const writeChoice = (choice: ThemeChoice): void => {
  memory = choice;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Nothing to do: `memory` already holds it.
  }
};

/** `system` removes the attribute, handing control back to `prefers-color-scheme` in globals.css. */
export const applyChoice = (choice: ThemeChoice): void => {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
};

/**
 * Runs in <head> before the page paints, so a stored light/dark choice that
 * differs from the OS doesn't flash the OS theme first.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
