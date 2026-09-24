// pdf.ts against a fake pdfjs, to reach paths real sample files don't hit.
import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({ open: null as null | (() => Promise<unknown>) }));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  OPS: { paintImageXObject: 85, paintInlineImageXObject: 86, paintImageMaskXObject: 83 },
  getDocument: () => ({ promise: fake.open!(), destroy: async () => {} }),
}));

const { readPdfPages, PdfFileError } = await import("./pdf");

const page = (items: unknown[], ops: number[] = []) => ({
  getTextContent: async () => ({ items }),
  getOperatorList: async () => ({ fnArray: ops }),
});

async function openError(err: unknown) {
  fake.open = () => Promise.reject(err);
  const e = await readPdfPages(new Uint8Array()).catch((x) => x);
  expect(e).toBeInstanceOf(PdfFileError);
  return (e as InstanceType<typeof PdfFileError>).info;
}

describe("readPdfPages", () => {
  beforeEach(() => {
    fake.open = null;
  });

  it("keeps going when single pages fail, and tells blank from scanned", async () => {
    const pages = [
      page([{ str: "Hello", transform: [1, 0, 0, 1, 40, 700] }, { str: "  " }, { type: "beginMarkedContent" }]),
      page([], []),
      page([], [85]),
    ];
    fake.open = async () => ({
      numPages: 5,
      getPage: async (n: number) => {
        if (n === 4) throw new Error("broken page");
        if (n === 5) throw "not an Error";
        return pages[n - 1];
      },
    });
    const out = await readPdfPages(new Uint8Array());
    expect(out.map((p) => p.kind)).toEqual(["text", "empty", "image_only", "error", "error"]);
    expect(out[3]).toMatchObject({ message: "broken page" });
    expect(out[4]).toMatchObject({ message: "not an Error" });
  });

  it("explains a password-protected file", async () => {
    const err = Object.assign(new Error("pw"), { name: "PasswordException" });
    expect((await openError(err)).code).toBe("PASSWORD_PROTECTED");
  });

  it("explains a damaged file", async () => {
    const err = Object.assign(new Error("Invalid PDF structure."), { name: "InvalidPDFException" });
    expect(await openError(err)).toMatchObject({ code: "CORRUPT_PDF", title: "This PDF looks damaged" });
  });

  it("passes on any other reader error, including non-Error values", async () => {
    expect((await openError(new Error("odd"))).message).toContain("odd");
    expect((await openError("weird")).message).toContain("weird");
  });
});
