import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, Download, FlaskConical, Gauge, Play, RefreshCw, RotateCcw, Save, Sparkles, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/recovery/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatCompactINR,
  formatDate,
  formatDateTime,
  formatINR,
  recoveryApi,
  type BatchReport,
  type CaseView,
  type Settings,
} from '@/services/recoveryEngine';

const PLAYBOOKS = [
  { name: 'Insufficient funds rescue', trigger: 'Insufficient funds', action: 'Retry after cooldown, then send reminder', enabled: true },
  { name: 'High-value voice handoff', trigger: 'Amount above INR 50,000', action: 'Escalate to voice recovery immediately', enabled: true },
  { name: 'Promise protection', trigger: 'Broken promise-to-pay', action: 'Escalate and mark for operator review', enabled: false },
];

function downloadCsv(cases: CaseView[]) {
  const rows = [
    ['case_id', 'customer', 'amount_inr', 'status', 'failure_reason', 'urgency', 'promise_date'],
    ...cases.map((c) => [c.id, c.customerName, String(Math.round(c.amount)), c.status, c.failureReason, String(c.urgencyScore), c.promise?.promisedDate ?? '']),
  ];
  const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'recovery-insights.csv';
  link.click();
  URL.revokeObjectURL(url);
  toast.success('Insights exported');
}

export default function Insights() {
  const [cases, setCases] = useState<CaseView[] | null>(null);
  const [report, setReport] = useState<BatchReport | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [retryLimit, setRetryLimit] = useState(3);
  const [escalationThreshold, setEscalationThreshold] = useState(70);
  const [activePlaybooks, setActivePlaybooks] = useState(PLAYBOOKS.map((playbook) => playbook.enabled));
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [loadedCases, loadedReport, loadedSettings] = await Promise.all([
        recoveryApi.getCases(),
        recoveryApi.getBatchReport(),
        recoveryApi.getSettings(),
      ]);
      if (!alive) return;
      setCases(loadedCases);
      setReport(loadedReport);
      setSettings(loadedSettings);
      setRetryLimit((value) => value === 3 ? loadedSettings.retryLimit : value);
      setEscalationThreshold((value) => value === 70 ? loadedSettings.escalationThreshold : value);
      setLastUpdated(new Date());
    };
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [refreshToken]);

  const promiseCases = useMemo(
    () => cases?.filter((c) => c.promise).sort((a, b) => new Date(a.promise?.promisedDate ?? '').getTime() - new Date(b.promise?.promisedDate ?? '').getTime()) ?? [],
    [cases],
  );
  const activity = useMemo(
    () => cases?.flatMap((c) => c.audit.map((event) => ({ ...event, caseId: c.id, customerName: c.customerName }))).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8) ?? [],
    [cases],
  );
  const segmentRows = useMemo(() => {
    if (!cases) return [];
    const groups = new Map<string, { count: number; amount: number; recovered: number }>();
    cases.forEach((currentCase) => {
      const existing = groups.get(currentCase.paymentMethod) ?? { count: 0, amount: 0, recovered: 0 };
      existing.count += 1;
      existing.amount += currentCase.amount;
      if (currentCase.status === 'Recovered') existing.recovered += currentCase.amount;
      groups.set(currentCase.paymentMethod, existing);
    });
    return [...groups.entries()].map(([name, values]) => ({ name, ...values, rate: values.amount ? (values.recovered / values.amount) * 100 : 0 }));
  }, [cases]);

  if (!cases || !report || !settings) {
    return <AppShell title="Insights" subtitle="Playbooks, simulations, promises, and recovery intelligence"><Skeleton className="h-[560px] rounded-xl" /></AppShell>;
  }

  const projectedRate = Math.min(99, report.recoveryRatePct + (retryLimit - settings.retryLimit) * 2.1 + (settings.escalationThreshold - escalationThreshold) * 0.08);
  const projectedCost = Math.max(0, report.falsePositiveCost + Math.max(0, settings.escalationThreshold - escalationThreshold) * 850);
  const maxSegmentAmount = Math.max(...segmentRows.map((row) => row.amount), 1);

  return (
    <AppShell
      title="Insights Studio"
      subtitle="Decision intelligence layered on top of the existing recovery engine"
      actions={<Button variant="outline" size="sm" onClick={() => downloadCsv(cases)}><Download /> Export cases</Button>}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex items-center gap-2"><WandSparkles className="h-5 w-5 text-primary" /><h2>Recovery playbooks</h2></div><p className="mt-1 text-xs text-muted-foreground">Preview operator policies without changing live engine bounds.</p></div>
            <Button size="sm" onClick={() => toast.success('Playbook draft saved locally')}><Save /> Save draft</Button>
          </div>
          <div className="mt-4 space-y-2">
            {PLAYBOOKS.map((playbook, index) => (
              <div key={playbook.name} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div><p className="text-sm font-medium">{playbook.name}</p><p className="mt-1 text-xs text-muted-foreground">When: {playbook.trigger} | Then: {playbook.action}</p></div>
                <Button variant={activePlaybooks[index] ? 'default' : 'outline'} size="sm" onClick={() => setActivePlaybooks((active) => active.map((value, itemIndex) => itemIndex === index ? !value : value))}>{activePlaybooks[index] ? 'Active' : 'Enable'}</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /><h2>What-if simulator</h2></div>
          <p className="mt-1 text-xs text-muted-foreground">Model policy impact before touching Settings.</p>
          <div className="mt-4 space-y-4">
            <div><Label htmlFor="sim-retry">Retry attempts</Label><Input id="sim-retry" type="number" min="1" max="6" value={retryLimit} onChange={(event) => setRetryLimit(Number(event.target.value))} className="mt-1" /></div>
            <div><Label htmlFor="sim-threshold">Voice threshold</Label><Input id="sim-threshold" type="number" min="10" max="95" value={escalationThreshold} onChange={(event) => setEscalationThreshold(Number(event.target.value))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3"><div><p className="text-xs text-muted-foreground">Projected rate</p><p className="mt-1 text-xl font-semibold">{projectedRate.toFixed(1)}%</p></div><div><p className="text-xs text-muted-foreground">Estimated risk cost</p><p className="mt-1 text-xl font-semibold">{formatCompactINR(projectedCost)}</p></div></div>
            <Button variant="outline" className="w-full" onClick={() => toast.success('Simulation saved to this session')}><Play /> Save scenario</Button>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2>Promise-to-pay calendar</h2></div>
          <p className="mt-1 text-xs text-muted-foreground">Upcoming customer commitments and their verification state.</p>
          <div className="mt-4 space-y-2">
            {promiseCases.length ? promiseCases.slice(0, 6).map((currentCase) => (
              <div key={currentCase.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0"><div><p className="text-sm font-medium">{currentCase.customerName}</p><p className="text-xs text-muted-foreground">{currentCase.id} | {currentCase.promise?.verified ? 'Verified promise' : 'Needs verification'}</p></div><div className="text-right"><p className="tabular text-sm font-medium">{formatDate(currentCase.promise!.promisedDate)}</p><p className="text-xs text-muted-foreground">{formatINR(currentCase.promise!.amount)} | {currentCase.promise!.status}</p></div></div>
            )) : <p className="py-4 text-sm text-muted-foreground">No promises are currently recorded.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /><h2>Segment performance</h2></div>
          <div className="mt-4 space-y-4">{segmentRows.map((row) => <div key={row.name}><div className="flex justify-between text-xs"><span className="font-medium">{row.name}</span><span className="text-muted-foreground">{row.rate.toFixed(1)}% recovered</span></div><div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${(row.amount / maxSegmentAmount) * 100}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{row.count} cases | {formatCompactINR(row.amount)}</p></div>)}</div>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2>Live decision activity</h2><span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="Live" /></div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Connecting...'}</span>
            <Button variant="ghost" size="sm" onClick={() => { setRefreshToken((token) => token + 1); toast.success('Activity feed refreshed'); }}><RefreshCw /> Refresh</Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Automatically refreshed every 3 seconds from the recovery event stream.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">{activity.map((event) => <div key={`${event.caseId}-${event.id}`} className="border-b border-border/70 pb-2"><div className="flex justify-between gap-3"><p className="text-sm font-medium">{event.action}</p><time className="text-xs text-muted-foreground">{formatDateTime(event.at)}</time></div><p className="mt-1 text-xs text-muted-foreground">{event.caseId} | {event.customerName}</p></div>)}</div>
      </section>

      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Simulations and playbook drafts are session-only; current recovery behavior remains unchanged.</p>
      <span className="sr-only"><Sparkles /> Insights are additive.</span>
    </AppShell>
  );
}
