import { describe, expect, it, vi } from "vitest";

vi.mock("./pdf", () => ({
  PdfFileError: class extends Error {},
  readPdfPages: async () => {
    throw new Error("unexpected bug");
  },
}));

const { extractFromPdf } = await import(".");
const { MAX_FILE_BYTES } = await import("../../config");

describe("extractFromPdf", () => {
  it("rejects files over the size limit with the actual size", async () => {
    const out = await extractFromPdf("big.pdf", new Uint8Array(MAX_FILE_BYTES + 1));
    expect(out).toMatchObject({ ok: false, error: { code: "FILE_TOO_LARGE", message: expect.stringContaining("10.0 MB") } });
  });

  it("lets unexpected errors through so the API reports them as bugs, not refusals", async () => {
    await expect(extractFromPdf("a.pdf", new TextEncoder().encode("%PDF-1.7"))).rejects.toThrow("unexpected bug");
  });
});
