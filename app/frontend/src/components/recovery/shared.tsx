import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CaseStatus, Classification, PromiseStatus } from '@/services/recoveryEngine';

/* ---------- Status colours ---------- */

const STATUS_STYLES: Record<CaseStatus, string> = {
  Recovered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Retrying: 'bg-amber-100 text-amber-800 border-amber-200',
  Escalated: 'bg-red-100 text-red-800 border-red-200',
  Disputed: 'bg-red-100 text-red-800 border-red-200',
  Unresolved: 'bg-slate-200 text-slate-700 border-slate-300',
};

export const STATUS_CHART_COLORS: Record<CaseStatus, string> = {
  Recovered: '#059669',
  Pending: '#d97706',
  Retrying: '#f59e0b',
  Escalated: '#dc2626',
  Disputed: '#b91c1c',
  Unresolved: '#64748b',
};

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ease-out',
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

const CLASS_STYLES: Record<Classification, string> = {
  retryable: 'bg-sky-50 text-sky-800 border-sky-200',
  'genuine non-payment': 'bg-slate-100 text-slate-700 border-slate-300',
  disputed: 'bg-rose-50 text-rose-800 border-rose-200',
};

export function ClassificationBadge({ value }: { value: Classification }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        CLASS_STYLES[value],
      )}
    >
      {value}
    </span>
  );
}

const PROMISE_STYLES: Record<PromiseStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Kept: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Broken: 'bg-red-100 text-red-800 border-red-200',
};

export function PromiseBadge({ status }: { status: PromiseStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ease-out',
        PROMISE_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

export function UrgencyMeter({ score }: { score: number }) {
  const tone =
    score >= 80 ? 'bg-red-500' : score >= 65 ? 'bg-amber-500' : score >= 40 ? 'bg-sky-500' : 'bg-slate-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn('h-full rounded-full transition-all duration-300 ease-out', tone)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="tabular text-xs font-medium text-slate-600">{score}</span>
    </div>
  );
}

/* ---------- Numeric count-up (~800ms, ease-out, no overshoot) ---------- */

export function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const progress = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return value;
}

export function CountUp({
  value,
  format,
  durationMs = 800,
}: {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
}) {
  const animated = useCountUp(value, durationMs);
  return <span className="tabular">{format(animated)}</span>;
}