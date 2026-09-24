export interface StatItemProps {
  label: string;
  value: string;
}

export const StatItem = ({ label, value }: StatItemProps) => (
  <div className="flex flex-col">
    <span className="text-[11.5px] tracking-wide text-muted uppercase">{label}</span>
    <span className="text-base font-semibold break-words">{value}</span>
  </div>
);
