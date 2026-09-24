// Real extraction results for the sample PDFs, shared by the UI tests.
import fs from "node:fs";
import path from "node:path";
import { extractFromPdf } from "../lib/extract";
import type { ExtractionResult } from "../lib/extract/types";

export const SAMPLES_DIR = path.join(__dirname, "../../samples");

export const sampleFile = (name: string): File =>
  new File([fs.readFileSync(path.join(SAMPLES_DIR, name))], name, { type: "application/pdf" });

export const extractSample = async (name: string): Promise<ExtractionResult> => {
  const outcome = await extractFromPdf(name, new Uint8Array(fs.readFileSync(path.join(SAMPLES_DIR, name))));
  if (!outcome.ok) throw new Error(outcome.error.message);
  return outcome.result;
};
