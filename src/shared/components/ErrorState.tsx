export interface ErrorStateProps {
  /** Required on purpose: there is no generic "Something went wrong" fallback. */
  title: string;
  message: string;
  code?: string;
}

export const ErrorState = ({ title, message, code }: ErrorStateProps) => (
  <div role="alert" className="rounded-(--radius) border border-(--danger-border) bg-(--danger-subtle) px-6 py-5">
    <p className="m-0 font-semibold text-danger">{title}</p>
    <p className="mt-1.5 mb-0 text-sm text-text">{message}</p>
    {code !== undefined ? <p className="mt-1.5 mb-0 font-mono text-xs text-muted">Error code: {code}</p> : null}
  </div>
);
