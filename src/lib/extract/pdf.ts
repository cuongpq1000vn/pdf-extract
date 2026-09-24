// Turns PDF bytes into PageInput[] for the parser. Each page is read on its own,
// so one broken page becomes a "error" page instead of failing the file.

import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { Cell, FileError, PageInput, TextLine } from "./types";

/** Text items whose baselines are this close (in PDF points) are on one line. */
const LINE_TOLERANCE = 2;

const IMAGE_OPS = new Set<number>([
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintImageMaskXObject,
]);

export class PdfFileError extends Error {
  constructor(public readonly info: FileError) {
    super(info.message);
  }
}

export async function readPdfPages(bytes: Uint8Array): Promise<PageInput[]> {
  // verbosity 0: pdfjs warns about missing standard fonts, which only matter for rendering.
  const task = getDocument({ data: bytes, verbosity: 0 });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy();
    throw new PdfFileError(openError(err));
  }

  const pages: PageInput[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      try {
        pages.push(await readPage(doc, n));
      } catch (err) {
        pages.push({ page: n, kind: "error", message: err instanceof Error ? err.message : String(err) });
      }
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

async function readPage(doc: Awaited<ReturnType<typeof getDocument>["promise"]>, n: number): Promise<PageInput> {
  const page = await doc.getPage(n);
  const content = await page.getTextContent();
  const cells: (Cell & { y: number })[] = [];
  for (const item of content.items) {
    if (!("str" in item) || item.str.trim() === "") continue;
    cells.push({ x: item.transform[4], y: item.transform[5], str: item.str });
  }

  if (cells.length === 0) {
    const ops = await page.getOperatorList();
    const hasImage = ops.fnArray.some((fn) => IMAGE_OPS.has(fn));
    return { page: n, kind: hasImage ? "image_only" : "empty" };
  }
  return { page: n, kind: "text", lines: groupLines(cells) };
}

/** Group cells into lines top-to-bottom, cells left-to-right. */
export function groupLines(cells: (Cell & { y: number })[]): TextLine[] {
  const sorted = [...cells].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; cells: Cell[] }[] = [];
  for (const c of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - c.y) <= LINE_TOLERANCE) last.cells.push({ x: c.x, str: c.str });
    else lines.push({ y: c.y, cells: [{ x: c.x, str: c.str }] });
  }
  return lines.map((l) => {
    const ordered = l.cells.sort((a, b) => a.x - b.x);
    return { y: l.y, cells: ordered, text: ordered.map((c) => c.str.trim()).join(" ") };
  });
}

function openError(err: unknown): FileError {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  if (name === "PasswordException")
    return {
      code: "PASSWORD_PROTECTED",
      title: "This PDF is password protected",
      message: "We can't open password-protected PDFs. Remove the password and upload it again.",
    };
  if (name === "InvalidPDFException")
    return {
      code: "CORRUPT_PDF",
      title: "This PDF looks damaged",
      message: `The file could not be opened as a PDF. It may be damaged or only partly downloaded. Technical detail: ${message}`,
    };
  return {
    code: "CORRUPT_PDF",
    title: "This PDF could not be opened",
    message: `The PDF reader failed to open the file. Technical detail: ${message}`,
  };
}
