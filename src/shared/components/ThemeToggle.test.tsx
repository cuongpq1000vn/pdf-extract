// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_BOOT_SCRIPT } from "../theme";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

const radio = (name: string) => screen.getByRole("radio", { name });

describe("ThemeToggle", () => {
  it("starts on System and stamps an explicit choice on <html>", () => {
    render(<ThemeToggle />);
    expect(radio("System").getAttribute("aria-checked")).toBe("true");

    act(() => fireEvent.click(radio("Dark")));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(radio("Dark").getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("pdf-extract-theme")).toBe("dark");

    act(() => fireEvent.click(radio("System")));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("remembers the choice for the next visit", () => {
    localStorage.setItem("pdf-extract-theme", "light");
    render(<ThemeToggle />);
    expect(radio("Light").getAttribute("aria-checked")).toBe("true");
  });

  it("still works for this visit when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<ThemeToggle />);
    act(() => fireEvent.click(radio("Light")));
    expect(radio("Light").getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("renders System on the server, which can't see the stored choice", () => {
    localStorage.setItem("pdf-extract-theme", "dark");
    expect(renderToString(<ThemeToggle />)).toContain('aria-checked="true" aria-label="System"');
  });

  it("boot script applies a stored choice before React runs", () => {
    localStorage.setItem("pdf-extract-theme", "dark");
    new Function(THEME_BOOT_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
