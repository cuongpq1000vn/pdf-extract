import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadPdf } from "./api";

const file = new File(["%PDF-1.7"], "a.pdf");
const serve = (body: string, status = 200) => vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));

afterEach(() => vi.unstubAllGlobals());

describe("uploadPdf", () => {
  it("returns the result on success", async () => {
    serve(JSON.stringify({ ok: true, result: { fileName: "a.pdf" } }));
    expect(await uploadPdf(file)).toEqual({ kind: "result", result: { fileName: "a.pdf" } });
  });

  it("passes the server's explanation through unchanged", async () => {
    serve(JSON.stringify({ ok: false, error: { code: "NOT_A_PDF", title: "T", message: "M" } }), 415);
    expect(await uploadPdf(file)).toEqual({ kind: "error", code: "NOT_A_PDF", title: "T", message: "M" });
  });

  it("quotes a non-JSON reply and its status instead of hiding it", async () => {
    serve("<html>Gateway Timeout</html>", 504);
    expect(await uploadPdf(file)).toMatchObject({
      title: expect.stringContaining("HTTP 504"),
      message: expect.stringContaining("Gateway Timeout"),
    });
  });

  it("says when the reply was empty, and shortens a long one", async () => {
    serve("", 502);
    expect((await uploadPdf(file)).kind === "error" && (await uploadPdf(file))).toMatchObject({ message: expect.stringContaining("empty response") });
    serve("x".repeat(500), 500);
    const out = await uploadPdf(file);
    expect(out.kind === "error" && out.message.endsWith("…")).toBe(true);
  });

  it("flags JSON in an unknown shape", async () => {
    serve(JSON.stringify({ hello: 1 }), 200);
    expect(await uploadPdf(file)).toMatchObject({ title: expect.stringContaining("don't recognise") });
    serve("null", 200);
    expect(await uploadPdf(file)).toMatchObject({ title: expect.stringContaining("don't recognise") });
    serve(JSON.stringify({ ok: false, error: { title: "only title" } }), 400);
    expect(await uploadPdf(file)).toMatchObject({ title: expect.stringContaining("don't recognise") });
  });

  it("reports a network failure with its cause, even a non-Error one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw "offline"; }));
    expect(await uploadPdf(file)).toMatchObject({ message: expect.stringContaining("offline") });
  });
});
