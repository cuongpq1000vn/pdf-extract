import { extractFromPdf, type FileError } from "@/lib/extract";

// Response shape is always JSON with either `result` or `error`, never a bare
// status code, so the page can always show the real reason.
export type ExtractResponse =
  | { ok: true; result: import("@/lib/extract").ExtractionResult }
  | { ok: false; error: FileError };

const STATUS: Record<FileError["code"], number> = {
  NO_FILE: 400,
  NOT_A_PDF: 415,
  FILE_TOO_LARGE: 413,
  PASSWORD_PROTECTED: 422,
  CORRUPT_PDF: 422,
  INTERNAL_ERROR: 500,
};

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

function fail(error: FileError) {
  return Response.json({ ok: false, error } satisfies ExtractResponse, { status: STATUS[error.code] });
}

export async function POST(request: Request) {
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch (err) {
    return fail({
      code: "NO_FILE",
      title: "No file was received",
      message: `The upload could not be read as a form. Technical detail: ${describe(err)}`,
    });
  }
  if (!(file instanceof File) || file.size === 0) {
    return fail({ code: "NO_FILE", title: "No file was received", message: "Choose a PDF file and try again." });
  }

  try {
    const outcome = await extractFromPdf(file.name, new Uint8Array(await file.arrayBuffer()));
    return outcome.ok ? Response.json(outcome satisfies ExtractResponse) : fail(outcome.error);
  } catch (err) {
    console.error("extract failed", err);
    return fail({
      code: "INTERNAL_ERROR",
      title: "The reader crashed on this file",
      message: `This is a bug on our side, not a problem with your file being refused. Technical detail: ${describe(err)}`,
    });
  }
}
