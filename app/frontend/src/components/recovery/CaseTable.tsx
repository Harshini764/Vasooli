import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  CASE_STATUSES,
  daysOverdue,
  formatDate,
  formatINR,
  type CaseStatus,
  type CaseView,
} from '@/services/recoveryEngine';
import { ClassificationBadge, StatusBadge, UrgencyMeter } from './shared';

type SortKey = 'customerName' | 'amount' | 'urgencyScore' | 'dueDate' | 'attempts' | 'status';

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'customerName', label: 'Customer' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'dueDate', label: 'Overdue', align: 'right' },
  { key: 'urgencyScore', label: 'Urgency' },
  { key: 'attempts', label: 'Attempts', align: 'right' },
  { key: 'status', label: 'Status' },
];

export default function CaseTable({
  cases,
  retryLimit,
  pageSize = 25,
}: {
  cases: CaseView[];
  retryLimit: number;
  pageSize?: number;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | CaseStatus>('all');
  const [urgency, setUrgency] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('urgencyScore');
  const [asc, setAsc] = useState(false);
  const [limit, setLimit] = useState(pageSize);

  const rows = useMemo(() => {
    const filtered = cases
      .filter((c) =>
        search
          ? `${c.customerName} ${c.id} ${c.failureReason}`.toLowerCase().includes(search.toLowerCase())
          : true,
      )
      .filter((c) => (status === 'all' ? true : c.status === status))
      .filter((c) => {
        if (urgency === 'all') return true;
        if (urgency === 'high') return c.urgencyScore >= 70;
        if (urgency === 'medium') return c.urgencyScore >= 40 && c.urgencyScore < 70;
        return c.urgencyScore < 40;
      });

    const sorted = [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'customerName' || sortKey === 'status') {
        diff = a[sortKey].localeCompare(b[sortKey]);
      } else if (sortKey === 'dueDate') {
        diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        diff = a[sortKey] - b[sortKey];
      }
      return asc ? diff : -diff;
    });
    return sorted;
  }, [cases, search, status, urgency, sortKey, asc]);

  const visible = rows.slice(0, limit);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setAsc((v) => !v);
    } else {
      setSortKey(key);
      setAsc(key === 'customerName');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(pageSize);
            }}
            placeholder="Search customer, case ID or failure reason"
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as 'all' | CaseStatus);
            setLimit(pageSize);
          }}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CASE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={urgency}
          onValueChange={(v) => {
            setUrgency(v as 'all' | 'high' | 'medium' | 'low');
            setLimit(pageSize);
          }}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All urgency</SelectItem>
            <SelectItem value="high">High (70+)</SelectItem>
            <SelectItem value="medium">Medium (40–69)</SelectItem>
            <SelectItem value="low">Low (&lt;40)</SelectItem>
          </SelectContent>
        </Select>

        <p className="tabular ml-auto text-xs text-muted-foreground">
          {rows.length} of {cases.length} cases
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Case</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-2.5 font-medium', col.align === 'right' ? 'text-right' : 'text-left')}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      'inline-flex items-center gap-1 transition-colors duration-200 hover:text-foreground',
                      sortKey === col.key && 'text-foreground',
                    )}
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      asc ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5 text-left font-medium">Failure</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="cursor-pointer border-b border-border/70 transition-colors duration-200 ease-out last:border-0 hover:bg-accent/50"
              >
                <td className="tabular px-4 py-3 font-medium text-primary">{c.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{c.customerName}</div>
                  <div className="text-xs text-muted-foreground">{c.paymentMethod}</div>
                </td>
                <td className="tabular px-4 py-3 text-right font-medium">{formatINR(c.amount)}</td>
                <td className="tabular px-4 py-3 text-right">
                  <div>{daysOverdue(c)}d</div>
                  <div className="text-xs text-muted-foreground">{formatDate(c.dueDate)}</div>
                </td>
                <td className="px-4 py-3">
                  <UrgencyMeter score={c.urgencyScore} />
                </td>
                <td className="tabular px-4 py-3 text-right text-muted-foreground">
                  {c.attempts}/{retryLimit}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-foreground">{c.failureReason}</div>
                  <div className="mt-1">
                    <ClassificationBadge value={c.classification} />
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No cases match these filters. Clear the search or widen the status filter to see the
                  full recovery queue.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {rows.length > visible.length ? (
        <div className="border-t border-border px-4 py-3 text-center">
          <button
            type="button"
            onClick={() => setLimit((v) => v + pageSize)}
            className="fin-press rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors duration-200 hover:bg-accent"
          >
            Show {Math.min(pageSize, rows.length - visible.length)} more
          </button>
        </div>
      ) : null}
    </div>
  );
}