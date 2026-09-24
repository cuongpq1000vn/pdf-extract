import { afterEach, describe, expect, it, vi } from "vitest";
import * as extract from "../../../lib/extract";
import { POST } from "./route";
import { sampleFile } from "../../../test/samples";

afterEach(() => vi.restoreAllMocks());

const post = (body?: FormData | string, headers?: Record<string, string>) =>
  POST(new Request("http://x/api/extract", { method: "POST", body, headers }));

const form = (file?: File) => {
  const data = new FormData();
  if (file) data.append("file", file);
  return data;
};

describe("POST /api/extract", () => {
  it("returns the extraction for a real sample", async () => {
    const res = await post(form(sampleFile("KBS-10270.pdf")));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.refusals.map((r: { code: string }) => r.code)).toContain("TOTAL_MISMATCH");
  });

  it("maps a file error to its status with the explanation", async () => {
    const res = await post(form(new File(["hello"], "a.txt")));
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe("NOT_A_PDF");
  });

  it("explains a missing file and a body that isn't a form", async () => {
    expect((await (await post(form())).json()).error.code).toBe("NO_FILE");
    const res = await post("{}", { "content-type": "application/json" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("could not be read as a form");
  });

  it("reports a crash as our bug, with the cause", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(extract, "extractFromPdf").mockRejectedValueOnce(new Error("kaboom")).mockRejectedValueOnce("str");
    for (const cause of ["kaboom", "str"]) {
      const res = await post(form(sampleFile("KBS-10234.pdf")));
      expect(res.status).toBe(500);
      expect((await res.json()).error).toMatchObject({ code: "INTERNAL_ERROR", message: expect.stringContaining(cause) });
    }
  });
});
