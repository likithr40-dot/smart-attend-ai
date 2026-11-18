import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { AttendanceStatus } from '../types';

export function StatusIndicator({ status }: { status: AttendanceStatus }) {
  if (status === 'Present') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>Present</span>
      </span>
    );
  }

  if (status === 'Pending Review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span>Pending Review</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
      <span>Absent</span>
    </span>
  );
}
