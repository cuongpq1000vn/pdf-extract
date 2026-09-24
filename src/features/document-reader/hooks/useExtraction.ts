import { useCallback, useRef, useState } from "react";
import { uploadPdf } from "../api";
import type { UploadOutcome } from "../types";

export type ExtractionState = { kind: "idle" } | { kind: "loading"; fileName: string } | UploadOutcome;

interface UseExtraction {
  state: ExtractionState;
  extract: (file: File) => Promise<void>;
}

export const useExtraction = (): UseExtraction => {
  const [state, setState] = useState<ExtractionState>({ kind: "idle" });
  const current = useRef<AbortController | null>(null);

  const extract = useCallback(async (file: File) => {
    // A newer upload replaces an older one; the older reply must not overwrite it.
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;

    setState({ kind: "loading", fileName: file.name });
    const outcome = await uploadPdf(file, controller.signal);
    if (!controller.signal.aborted) setState(outcome);
  }, []);

  return { state, extract };
};
