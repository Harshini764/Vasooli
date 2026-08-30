import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { Download, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/recovery/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CountUp, STATUS_CHART_COLORS, StatusBadge } from '@/components/recovery/shared';
import {
  formatCompactINR,
  formatDateTime,
  formatINR,
  recoveryApi,
  type BatchReport,
} from '@/services/recoveryEngine';

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(report: BatchReport): string {
  const head = ['metric', 'value'];
  const rows: string[][] = [
    ['generated_at', report.generatedAt],
    ['total_cases', String(report.totalCases)],
    ['total_at_risk_inr', String(Math.round(report.totalAtRisk))],
    ['amount_recovered_inr', String(Math.round(report.amountRecovered))],
    ['recovery_rate_pct', report.recoveryRatePct.toFixed(2)],
    ['avg_attempts_per_recovery', report.avgAttemptsPerRecovery.toFixed(2)],
    ['false_positive_cost_inr', String(Math.round(report.falsePositiveCost))],
    ['false_positive_count', String(report.falsePositiveCount)],
    ['unnecessary_escalations', String(report.unnecessaryEscalations)],
    ['retry_limit', String(report.settingsUsed.retryLimit)],
    ['cooldown_hours', String(report.settingsUsed.cooldownHours)],
    ['escalation_threshold', String(report.settingsUsed.escalationThreshold)],
    [],
    ['status', 'count', 'amount_inr'],
    ...report.outcomeMix.map((o) => [o.status, String(o.count), String(Math.round(o.amount))]),
    [],
    ['exception_case_id', 'customer', 'amount_inr', 'status', 'reason'],
    ...report.exceptions.map((e) => [
      e.id,
      e.customerName,
      String(Math.round(e.amount)),
      e.status,
      `"${e.reason.replace(/"/g, "'")}"`,
    ]),
  ];
  return [head.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export default function BatchReports() {
  const [report, setReport] = useState<BatchReport | null>(null);
  const [running, setRunning] = useState(false);
  const [runToken, setRunToken] = useState(0);

  const load = useCallback(async () => {
    setReport(await recoveryApi.getBatchReport());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runBatch = async () => {
    setRunning(true);
    try {
      const res = await recoveryApi.runBatch();
      setReport(res.report);
      setRunToken((v) => v + 1);
      toast.success(
        `Batch pass complete — ${res.stepsApplied} bounded step(s) applied, ${res.promisesBroken} promise(s) marked broken`,
      );
    } finally {
      setRunning(false);
    }
  };

  if (!report) {
    return (
      <AppShell title="Batch Reports" subtitle="Honest batch-level recovery metrics">
        <Skeleton className="h-[520px] rounded-xl" />
      </AppShell>
    );
  }

  const chartData = report.outcomeMix.filter((o) => o.count > 0);

  const headline = [
    { label: 'Amount at Risk', value: report.totalAtRisk, format: formatCompactINR },
    { label: 'Amount Recovered', value: report.amountRecovered, format: formatCompactINR },
    {
      label: 'Recovery Rate',
      value: report.recoveryRatePct,
      format: (n: number) => `${n.toFixed(1)}%`,
    },
  ];

  const diagnostics = [
    {
      label: 'Avg Attempts per Recovery',
      value: report.avgAttemptsPerRecovery,
      format: (n: number) => n.toFixed(2),
      subtitle: `Mean bounded attempts spent on each of the ${report.recoveredCount} recovered cases. Lower means the engine settles faster.`,
    },
    {
      label: 'False-Positive Cost',
      value: report.falsePositiveCost,
      format: formatCompactINR,
      subtitle: `${report.falsePositiveCount} case(s) where a retry or voice call was spent on a failure classified as genuine non-payment or disputed — automation could never have fixed it.`,
    },
    {
      label: 'Unnecessary Escalations',
      value: report.unnecessaryEscalations,
      format: (n: number) => Math.round(n).toString(),
      subtitle: `Cases escalated to a voice call that then settled on attempt 1 (${formatCompactINR(
        report.unnecessaryEscalationAmount,
      )} of value) — the call was not what recovered them.`,
    },
  ];

  return (
    <AppShell
      title="Batch Reports"
      subtitle={`Computed ${formatDateTime(report.generatedAt)} using retry limit ${
        report.settingsUsed.retryLimit
      }, ${report.settingsUsed.cooldownHours}h cooldown, threshold ${report.settingsUsed.escalationThreshold}`}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="fin-press !bg-transparent hover:!bg-accent"
            onClick={() => {
              downloadFile('recovery-batch-report.csv', toCsv(report), 'text/csv;charset=utf-8');
              toast.success('CSV exported');
            }}
          >
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="fin-press !bg-transparent hover:!bg-accent"
            onClick={() => {
              downloadFile(
                'recovery-batch-report.json',
                JSON.stringify(report, null, 2),
                'application/json',
              );
              toast.success('JSON exported');
            }}
          >
            <Download className="mr-1.5 h-4 w-4" />
            JSON
          </Button>
          <Button size="sm" className="fin-press" disabled={running} onClick={() => void runBatch()}>
            {running ? (
              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-4 w-4" />
            )}
            {running ? 'Running batch…' : 'Run Batch'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {headline.map((c, i) => (
          <div
            key={c.label}
            className="fin-fade-up rounded-xl border border-border bg-card p-4 shadow-sm"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">
              <CountUp key={`${c.label}-${runToken}`} value={c.value} format={c.format} />
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {diagnostics.map((c, i) => (
          <div
            key={c.label}
            className="fin-fade-up rounded-xl border border-border bg-card p-4 shadow-sm"
            style={{ animationDelay: `${(i + 3) * 50}ms` }}
          >
            <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">
              <CountUp key={`${c.label}-${runToken}`} value={c.value} format={c.format} />
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1">Outcome mix</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Distribution of all {report.totalCases} cases by current status
          </p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status]} />
                  ))}
                </Pie>
                <ChartTooltip
                  formatter={(value: number, _name, payload) => [
                    `${value} cases · ${formatINR((payload as { payload: { amount: number } }).payload.amount)}`,
                    (payload as { payload: { status: string } }).payload.status,
                  ]}
                />
                <Legend verticalAlign="bottom" iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3">Results by status</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-right font-medium">Cases</th>
                <th className="py-2 text-right font-medium">Value</th>
                <th className="py-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {report.outcomeMix.map((o) => (
                <tr key={o.status} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="tabular py-2.5 text-right">{o.count}</td>
                  <td className="tabular py-2.5 text-right font-medium">{formatINR(o.amount)}</td>
                  <td className="tabular py-2.5 text-right text-muted-foreground">
                    {report.totalAtRisk === 0 ? '0.0%' : `${((o.amount / report.totalAtRisk) * 100).toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1">Unresolved exception cases</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {report.exceptions.length} case(s) that left automation without settlement, each with the reason
          it exited
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left font-medium">Case</th>
                <th className="py-2 text-left font-medium">Customer</th>
                <th className="py-2 text-right font-medium">Amount</th>
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {report.exceptions.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0">
                  <td className="tabular py-2.5">
                    <Link to={`/cases/${e.id}`} className="font-medium text-primary hover:underline">
                      {e.id}
                    </Link>
                  </td>
                  <td className="py-2.5">{e.customerName}</td>
                  <td className="tabular py-2.5 text-right font-medium">{formatINR(e.amount)}</td>
                  <td className="py-2.5">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">{e.reason}</td>
                </tr>
              ))}
              {report.exceptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No exceptions in this batch — every case is either recovered or still inside bounds.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}