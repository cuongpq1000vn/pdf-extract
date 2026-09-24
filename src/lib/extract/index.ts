import { MAX_FILE_BYTES } from "../../config/constants";
import { parseDocument } from "./parse";
import { PdfFileError, readPdfPages } from "./pdf";
import type { ExtractionResult, FileError } from "./types";

export type ExtractOutcome = { ok: true; result: ExtractionResult } | { ok: false; error: FileError };

export async function extractFromPdf(fileName: string, bytes: Uint8Array): Promise<ExtractOutcome> {
  if (bytes.length > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: {
        code: "FILE_TOO_LARGE",
        title: "This file is too large",
        message: `The file is ${(bytes.length / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
      },
    };
  }
  if (!isPdf(bytes)) {
    return {
      ok: false,
      error: {
        code: "NOT_A_PDF",
        title: "This isn't a PDF",
        message: `"${fileName}" doesn't start like a PDF file does. Only PDF files can be read.`,
      },
    };
  }
  try {
    const pages = await readPdfPages(bytes);
    return { ok: true, result: parseDocument(fileName, pages) };
  } catch (err) {
    if (err instanceof PdfFileError) return { ok: false, error: err.info };
    throw err;
  }
}

function isPdf(bytes: Uint8Array): boolean {
  // "%PDF-" may be preceded by a little junk; readers accept it within the first 1 KB.
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

export type { ExtractionResult, FileError } from "./types";
