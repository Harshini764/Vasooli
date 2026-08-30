import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  PhoneCall,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/recovery/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  daysOverdue,
  formatDate,
  formatDateTime,
  formatINR,
  getActionAvailability,
  recoveryApi,
  type ActionAvailability,
  type AuditEventType,
  type CaseView,
  type OperatorAction,
  type Settings,
} from '@/services/recoveryEngine';
import { ClassificationBadge, PromiseBadge, StatusBadge, UrgencyMeter } from '@/components/recovery/shared';

const EVENT_DOT: Record<AuditEventType, string> = {
  detection: 'bg-slate-400',
  retry: 'bg-amber-500',
  reminder: 'bg-sky-500',
  escalation: 'bg-red-500',
  verification: 'bg-indigo-500',
  promise_made: 'bg-emerald-500',
  promise_broken: 'bg-red-600',
  promise_kept: 'bg-emerald-600',
  recovered: 'bg-emerald-600',
  blocked: 'bg-rose-600',
  stop: 'bg-slate-500',
};

export default function CaseDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<CaseView | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<OperatorAction | null>(null);
  const [pulse, setPulse] = useState<OperatorAction | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(true);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([recoveryApi.getCase(id), recoveryApi.getSettings()]);
    if (!c) {
      setNotFound(true);
      return;
    }
    setItem(c);
    setSettings(s);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: OperatorAction) => {
    setBusy(action);
    try {
      const res = await recoveryApi.postAction(id, { action });
      setItem(res.case);
      setSettings(await recoveryApi.getSettings());
      setPulse(action);
      window.setTimeout(() => setPulse(null), 650);
      toast.success(res.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action blocked');
    } finally {
      setBusy(null);
    }
  };

  if (notFound) {
    return (
      <AppShellFallback>
        <p className="text-sm text-muted-foreground">
          Case {id} does not exist in this batch.{' '}
          <Link to="/cases" className="font-medium text-primary underline">
            Back to all cases
          </Link>
        </p>
      </AppShellFallback>
    );
  }

  if (!item || !settings) {
    return (
      <AppShellFallback>
        <Skeleton className="h-[520px] rounded-xl" />
      </AppShellFallback>
    );
  }

  const availability: ActionAvailability[] = getActionAvailability(item, settings);
  const overdue = daysOverdue(item);

  return (
    <AppShellFallback
      title={item.customerName}
      subtitle={`${item.id} · ${item.paymentMethod}`}
      actions={
        <Button variant="outline" size="sm" className="fin-press" onClick={() => navigate('/cases')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          All cases
        </Button>
      }
    >
      {/* Header facts */}
      <div className="fin-fade-up grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <Fact label="Amount">{formatINR(item.amount)}</Fact>
        <Fact label="Days overdue">
          {overdue}d
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            due {formatDate(item.dueDate)}
          </span>
        </Fact>
        <Fact label="Failure reason">
          <span className="text-base">{item.failureReason}</span>
          <div className="mt-1.5">
            <ClassificationBadge value={item.classification} />
          </div>
        </Fact>
        <Fact label="Urgency">
          <UrgencyMeter score={item.urgencyScore} />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            threshold {settings.escalationThreshold}
          </span>
        </Fact>
        <Fact label="Status">
          <StatusBadge status={item.status} />
          <span className="tabular mt-1.5 block text-xs font-normal text-muted-foreground">
            {item.attempts}/{settings.retryLimit} attempts · {settings.cooldownHours}h cooldown
          </span>
        </Fact>
      </div>

      {/* Actions */}
      <div className="fin-fade-up mt-4 rounded-xl border border-border bg-card p-4 shadow-sm" style={{ animationDelay: '50ms' }}>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Bounded actions
        </p>
        <div className="flex flex-wrap gap-2">
          {availability.map((a) => (
            <Tooltip key={a.action}>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    size="sm"
                    variant={
                      a.action === 'resolve' ? 'default' : a.action === 'stop' ? 'destructive' : 'outline'
                    }
                    disabled={!a.enabled || busy !== null}
                    onClick={() => void runAction(a.action)}
                    className={cn(
                      'fin-press',
                      a.action !== 'resolve' && a.action !== 'stop'
                        ? '!bg-transparent hover:!bg-accent'
                        : '',
                      pulse === a.action && 'fin-success-pulse',
                    )}
                  >
                    {busy === a.action ? 'Working…' : a.label}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{a.reason}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Audit timeline */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4">Audit trail</h2>
          <ol className="relative space-y-5 border-l border-border pl-5">
            {item.audit.map((ev, i) => (
              <li
                key={ev.id}
                className="fin-slide-left relative"
                style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
              >
                <span
                  className={cn(
                    'absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card',
                    EVENT_DOT[ev.type],
                  )}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{ev.action}</p>
                  <p className="tabular text-xs text-muted-foreground">{formatDateTime(ev.at)}</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ev.reasoning}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-4">
          {/* Promise to pay */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2>Promise to Pay</h2>
              {item.promise ? <PromiseBadge status={item.promise.status} /> : null}
            </div>

            {item.promise ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Promised amount</span>
                  <span className="tabular text-lg font-semibold">{formatINR(item.promise.amount)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Promised date</span>
                  <span className="tabular text-sm font-medium">
                    {formatDate(item.promise.promisedDate)}
                  </span>
                </div>
                <div
                  className={cn(
                    'flex items-start gap-2 rounded-md border p-3 text-xs leading-relaxed',
                    item.promise.verified
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900',
                  )}
                >
                  {item.promise.verified ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>
                    <strong className="font-semibold">
                      {item.promise.verified ? '✓ Verified against invoice' : '⚠ Unverified'}
                    </strong>
                    <br />
                    {item.promise.verificationNote}
                  </span>
                </div>
              </div>
            ) : item.transcript ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong className="font-semibold">⚠ Unverified — needs review</strong>
                  <br />
                  {item.transcript.verification.note} No commitment was written to the tracker.
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No commitment yet. A promise is only recorded after a voice escalation whose extracted
                amount verifies against the invoice on record.
              </p>
            )}
          </section>

          {/* Hinglish transcript */}
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() => setTranscriptOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-semibold">Voice recovery transcript</span>
              </span>
              {transcriptOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {transcriptOpen ? (
              <div className="border-t border-border px-5 py-4">
                {item.transcript ? (
                  <>
                    <div className="mb-4 grid gap-2 rounded-md bg-secondary/60 p-3 text-xs sm:grid-cols-3">
                      <ExtractedField
                        label="Amount confirmed"
                        value={
                          item.transcript.extracted.amountConfirmed !== null
                            ? formatINR(item.transcript.extracted.amountConfirmed)
                            : 'Not stated'
                        }
                        ok={item.transcript.verification.status === 'Verified'}
                      />
                      <ExtractedField
                        label="New promised date"
                        value={
                          item.transcript.extracted.promisedDate
                            ? formatDate(item.transcript.extracted.promisedDate)
                            : 'Not stated'
                        }
                        ok={Boolean(item.transcript.extracted.promisedDate)}
                      />
                      <ExtractedField
                        label="Reason for delay"
                        value={item.transcript.extracted.reasonForDelay}
                        ok
                      />
                    </div>

                    <p className="tabular mb-3 text-xs text-muted-foreground">
                      {formatDateTime(item.transcript.at)} · {item.transcript.durationSeconds}s ·
                      Hinglish (Roman script)
                    </p>

                    <div className="space-y-3">
                      {item.transcript.lines.map((line, i) => (
                        <div
                          key={i}
                          className={cn(
                            'rounded-lg border p-3 text-sm leading-relaxed',
                            line.speaker === 'Agent'
                              ? 'border-sky-200 bg-sky-50/70 text-slate-800'
                              : 'border-border bg-secondary/50 text-slate-800',
                          )}
                        >
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {line.speaker}
                          </p>
                          {line.text}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No voice call on record. Escalate this case to generate a Hinglish recovery call and
                    extract a commitment.
                  </p>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </AppShellFallback>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="tabular mt-1 text-lg font-semibold text-foreground">{children}</div>
    </div>
  );
}

function ExtractedField({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border px-2.5 py-2',
        ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-semibold', ok ? 'text-emerald-900' : 'text-amber-900')}>{value}</p>
    </div>
  );
}

/** Thin wrapper so loading/not-found states share the same chrome. */
function AppShellFallback({
  title = 'Case detail',
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AppShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AppShell>
  );
}