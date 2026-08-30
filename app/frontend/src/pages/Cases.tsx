import { useEffect, useState } from 'react';
import AppShell from '@/components/recovery/AppShell';
import CaseTable from '@/components/recovery/CaseTable';
import { Skeleton } from '@/components/ui/skeleton';
import { recoveryApi, type CaseView, type Settings } from '@/services/recoveryEngine';

export default function Cases() {
  const [cases, setCases] = useState<CaseView[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [c, s] = await Promise.all([recoveryApi.getCases(), recoveryApi.getSettings()]);
      if (!alive) return;
      setCases(c);
      setSettings(s);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppShell
      title="Cases"
      subtitle="Every detected payment failure, filterable by status and urgency"
    >
      {cases && settings ? (
        <CaseTable cases={cases} retryLimit={settings.retryLimit} pageSize={40} />
      ) : (
        <Skeleton className="h-[520px] rounded-xl" />
      )}
    </AppShell>
  );
}