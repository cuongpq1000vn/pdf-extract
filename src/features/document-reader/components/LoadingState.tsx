import { Spinner } from "../../../shared";

export interface LoadingStateProps {
  fileName: string;
}

export const LoadingState = ({ fileName }: LoadingStateProps) => (
  <div aria-live="polite" className="flex items-center gap-3 rounded-(--radius-lg) border border-border-app bg-surface p-5">
    <span className="text-primary">
      <Spinner size="lg" label={`Reading ${fileName}`} />
    </span>
    <div>
      <p className="m-0 font-semibold">Reading {fileName}…</p>
      <p className="m-0 text-sm text-muted">Checking every page. Pages we can&apos;t read will be listed, not skipped.</p>
    </div>
  </div>
);
