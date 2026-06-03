interface MetricCardProps {
  title: string;
  value: string | number;
  note?: string;
  icon?: string;
}

export function MetricCard({ title, value, note, icon }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {note && <p className="mt-1 text-xs text-muted">{note}</p>}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </div>
  );
}
