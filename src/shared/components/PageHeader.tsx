export interface PageHeaderProps {
  title: string;
  description: string;
}

export const PageHeader = ({ title, description }: PageHeaderProps) => (
  <header>
    <h1 className="m-0 text-2xl font-semibold tracking-tight">{title}</h1>
    <p className="mt-1 mb-0 max-w-[62ch] text-muted">{description}</p>
  </header>
);
