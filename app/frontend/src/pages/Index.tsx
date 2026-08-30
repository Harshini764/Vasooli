import { useEffect, useState } from 'react';
import { AlertTriangle, BanknoteIcon, Percent, TrendingUp } from 'lucide-react';
import AppShell from '@/components/recovery/AppShell';
import CaseTable from '@/components/recovery/CaseTable';
import { CountUp } from '@/components/recovery/shared';
import { Skeleton } from '@/components/ui/skeleton';
import HeroSection from '@/components/animations/HeroSection';
import { AnimatedCard } from '@/components/animations/AnimationUtils';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { GlassmorphicCard } from '@/components/animations/GlassmorphicCard';
import {
  formatCompactINR,
  recoveryApi,
  type BatchReport,
  type CaseView,
  type Settings,
} from '@/services/recoveryEngine';

const CARD_ICONS = [BanknoteIcon, TrendingUp, Percent, AlertTriangle];

export default function Index() {
  const [cases, setCases] = useState<CaseView[] | null>(null);
  const [report, setReport] = useState<BatchReport | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [c, r, s] = await Promise.all([
        recoveryApi.getCases(),
        recoveryApi.getBatchReport(),
        recoveryApi.getSettings(),
      ]);
      if (!alive) return;
      setCases(c);
      setReport(r);
      setSettings(s);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeCases = cases?.filter((c) => !['Recovered', 'Unresolved'].includes(c.status)).length ?? 0;

  const summary = report
    ? [
        {
          label: 'Amount at Risk',
          value: report.totalAtRisk,
          format: formatCompactINR,
          hint: `${report.totalCases} failed payments detected`,
        },
        {
          label: 'Amount Recovered',
          value: report.amountRecovered,
          format: formatCompactINR,
          hint: `${report.recoveredCount} cases settled`,
        },
        {
          label: 'Recovery Rate',
          value: report.recoveryRatePct,
          format: (n: number) => `${n.toFixed(1)}%`,
          hint: 'Recovered value ÷ value at risk',
        },
        {
          label: 'Active Cases',
          value: activeCases,
          format: (n: number) => Math.round(n).toString(),
          hint: 'Still inside bounded automation',
        },
      ]
    : [];

  return (
    <>
      <HeroSection />
      <AppShell
        title="Recovery Dashboard"
        subtitle="Failed-payment queue with bounded automated interventions"
      >
        {/* Animated Statistics Cards */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          {report
            ? summary.map((card, i) => {
                const Icon = CARD_ICONS[i];
                return (
                  <AnimatedCard key={card.label} delay={i * 50}>
                    <GlassmorphicCard hover glow="indigo" className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{card.label}</p>
                          <div className="mt-3">
                            {card.label === 'Recovery Rate' ? (
                              <AnimatedCounter
                                target={card.value}
                                duration={2500}
                                suffix="%"
                                decimals={1}
                                className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent"
                              />
                            ) : card.label === 'Active Cases' ? (
                              <AnimatedCounter
                                target={card.value}
                                duration={2000}
                                decimals={0}
                                className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                              />
                            ) : (
                              <p className="text-2xl font-bold text-foreground">
                                <CountUp value={card.value} format={card.format} />
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-indigo-500/10 to-blue-500/10">
                          <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
                        </div>
                      </div>
                      <p className="mt-4 text-xs leading-relaxed text-muted-foreground border-t border-white/10 pt-3">{card.hint}</p>
                    </GlassmorphicCard>
                  </AnimatedCard>
                );
              })
            : Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[140px] rounded-xl" />
              ))}
        </div>

        {/* Recovery Queue */}
        <div className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Recovery queue</h2>
            <p className="text-xs text-muted-foreground">Click any row for the full audit trail</p>
          </div>
          {cases && settings ? (
            <GlassmorphicCard hover glow="blue" className="p-6">
              <CaseTable cases={cases} retryLimit={settings.retryLimit} />
            </GlassmorphicCard>
          ) : (
            <Skeleton className="h-[420px] rounded-xl" />
          )}
        </div>
      </AppShell>
    </>
  );
}