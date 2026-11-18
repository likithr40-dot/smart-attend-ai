import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: 'default' | 'blue' | 'cyan' | 'emerald' | 'amber';
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'default',
}: StatCardProps) {
  const iconToneMap: Record<NonNullable<StatCardProps['tone']>, string> = {
    default: 'text-slate-600 bg-slate-100',
    blue: 'text-blue-600 bg-blue-50',
    cyan: 'text-cyan-700 bg-cyan-50',
    emerald: 'text-emerald-700 bg-emerald-50',
    amber: 'text-amber-700 bg-amber-50',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 whitespace-nowrap">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {value}
        </p>
        {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
      </div>
      <div className={`p-2 rounded-lg shrink-0 ${iconToneMap[tone]}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
    </div>
  );
}
