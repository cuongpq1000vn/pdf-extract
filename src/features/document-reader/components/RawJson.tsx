import type { ExtractionResult } from "../types";

export interface RawJsonProps {
  result: ExtractionResult;
}

export const RawJson = ({ result }: RawJsonProps) => (
  <details className="rounded-(--radius-lg) border border-border-app bg-surface p-5">
    <summary className="cursor-pointer text-sm font-medium">Raw JSON from the service</summary>
    <pre className="mt-2 max-h-[420px] overflow-auto rounded-(--radius) bg-surface-subtle p-3 font-mono text-xs">
      {JSON.stringify(result, null, 2)}
    </pre>
  </details>
);
