// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useExtraction } from "./useExtraction";

afterEach(() => vi.unstubAllGlobals());

it("ignores the reply to an upload that a newer upload replaced", async () => {
  const pending: ((r: Response) => void)[] = [];
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))));
  const { result } = renderHook(() => useExtraction());

  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => {
    first = result.current.extract(new File(["a"], "old.pdf"));
  });
  act(() => {
    second = result.current.extract(new File(["b"], "new.pdf"));
  });
  expect(result.current.state).toEqual({ kind: "loading", fileName: "new.pdf" });

  const ok = (name: string) => new Response(JSON.stringify({ ok: true, result: { fileName: name } }));
  await act(async () => {
    pending[1](ok("new.pdf"));
    await second;
    pending[0](ok("old.pdf"));
    await first;
  });
  expect(result.current.state).toEqual({ kind: "result", result: { fileName: "new.pdf" } });
});
