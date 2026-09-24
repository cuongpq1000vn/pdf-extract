// Sends a file to the extractor and turns every outcome into something the
// page can show. There is deliberately no "something went wrong" branch.

import { EXTRACT_ENDPOINT } from "../../config";
import type { ExtractionResult, FileError, UploadOutcome } from "./types";

export const uploadPdf = async (file: File, signal?: AbortSignal): Promise<UploadOutcome> => {
  const body = new FormData();
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch(EXTRACT_ENDPOINT, { method: "POST", body, signal });
  } catch (cause) {
    return {
      kind: "error",
      title: "Couldn't reach the document reader",
      message: `The request never got a reply. Check your connection and try again. Technical detail: ${describe(cause)}`,
    };
  }

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      kind: "error",
      title: `The server replied with an unexpected response (HTTP ${response.status})`,
      message: `We expected a result or an explanation, but got: ${preview(text)}`,
    };
  }

  if (isOk(json)) return { kind: "result", result: json.result };
  if (isFail(json)) return { kind: "error", ...json.error };
  return {
    kind: "error",
    title: `The server replied in a format we don't recognise (HTTP ${response.status})`,
    message: `Response started with: ${preview(text)}`,
  };
};

const isOk = (v: unknown): v is { ok: true; result: ExtractionResult } =>
  (v as { ok?: unknown } | null)?.ok === true && typeof (v as { result?: unknown }).result === "object";

const isFail = (v: unknown): v is { ok: false; error: FileError } => {
  const error = (v as { error?: Partial<FileError> } | null)?.error;
  return (v as { ok?: unknown } | null)?.ok === false && typeof error?.title === "string" && typeof error.message === "string";
};

const describe = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

const preview = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed === "") return "(an empty response)";
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
};
