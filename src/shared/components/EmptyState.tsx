export interface EmptyStateProps {
  message: string;
}

export const EmptyState = ({ message }: EmptyStateProps) => <p className="m-0 text-sm text-muted italic">{message}</p>;
