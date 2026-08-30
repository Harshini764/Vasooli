import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AppShell from '@/components/recovery/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { recoveryApi, settingsSchema, type Settings } from '@/services/recoveryEngine';

const FIELDS: {
  key: keyof Settings;
  label: string;
  help: string;
  min: number;
  max: number;
  suffix: string;
}[] = [
  {
    key: 'retryLimit',
    label: 'Retry limit',
    help: 'Hard bound on automated attempts per case. Once reached, retries are blocked and the case goes to voice escalation or manual review.',
    min: 1,
    max: 6,
    suffix: 'attempts',
  },
  {
    key: 'cooldownHours',
    label: 'Cooldown window',
    help: 'Minimum wait between two attempts on the same case. Retries inside this window are suppressed and downgraded to a reminder.',
    min: 1,
    max: 72,
    suffix: 'hours',
  },
  {
    key: 'escalationThreshold',
    label: 'Escalation threshold',
    help: 'Urgency score at or above which a case qualifies for Hinglish voice recovery. Cases below it only receive retries and reminders.',
    min: 10,
    max: 95,
    suffix: 'urgency score',
  },
];

export default function SettingsPage() {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    void (async () => {
      const s = await recoveryApi.getSettings();
      setSaved(s);
      setDraft(s);
    })();
  }, []);

  const save = async () => {
    if (!draft) return;
    const parsed = settingsSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Values are out of the allowed range');
      return;
    }
    setSaving(true);
    try {
      const next = await recoveryApi.postSettings(parsed.data);
      setSaved(next);
      setDraft(next);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 650);
      toast.success('Bounds updated — the decision engine reads these values on every decision');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!draft || !saved) {
    return (
      <AppShell title="Settings" subtitle="Live bounds for the decision engine">
        <Skeleton className="h-[360px] max-w-2xl rounded-xl" />
      </AppShell>
    );
  }

  const dirty = FIELDS.some((f) => draft[f.key] !== saved[f.key]);

  return (
    <AppShell
      title="Settings"
      subtitle="These bounds are read by the decision engine on every single decision"
    >
      <div className="relative">
        {/* Background glow effect */}
        <div className="absolute -inset-20 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 rounded-3xl blur-3xl pointer-events-none" />
        
        <div className="relative space-y-4 w-full">
        {FIELDS.map((f, i) => (
          <div
            key={f.key}
            className="fin-fade-up rounded-xl border border-indigo-200/50 dark:border-indigo-900/50 bg-gradient-to-br from-card via-card to-indigo-50/10 dark:to-indigo-950/10 p-6 shadow-lg hover:shadow-xl hover:border-indigo-300/70 dark:hover:border-indigo-800/70 transition-all duration-300 group"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <Label htmlFor={f.key} className="text-base font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  {f.label}
                </Label>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.help}</p>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-4 lg:flex-shrink-0">
                <div className="flex items-center gap-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/50 p-3 border border-indigo-200/50 dark:border-indigo-800/50">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Value</span>
                    <Input
                      id={f.key}
                      type="number"
                      min={f.min}
                      max={f.max}
                      value={draft[f.key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [f.key]: Number(e.target.value) } as Settings)
                      }
                      className="tabular h-10 w-20 text-right font-bold text-lg bg-transparent border-0 text-indigo-600 dark:text-indigo-400 focus:ring-0 p-0"
                    />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">{f.suffix}</span>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Allowed: <span className="font-semibold text-foreground">{f.min}–{f.max}</span></p>
                  <p className="mt-1">Live: <span className="font-bold text-indigo-600 dark:text-indigo-400">{saved[f.key]}</span></p>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-6 mt-8 border-t border-indigo-200/30 dark:border-indigo-900/30">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <Button
              className={`${saving ? 'fin-press' : `fin-press ${pulse ? 'fin-success-pulse' : ''}`} bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all`}
              disabled={saving || !dirty}
              onClick={() => void save()}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </span>
              ) : (
                'Save bounds'
              )}
            </Button>
            <Button
              variant="outline"
              className="fin-press border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-foreground"
              disabled={!dirty || saving}
              onClick={() => setDraft(saved)}
            >
              Discard changes
            </Button>
          </div>
          {dirty ? (
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-500 animate-pulse">⚠ Unsaved changes</span>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
              In sync with engine
            </span>
          )}
        </div>
        </div>

        <div className="mt-8 rounded-xl border border-indigo-200/50 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 dark:from-indigo-950/20 to-blue-50/50 dark:to-blue-950/20 p-5 shadow-md">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">💡 Pro Tip:</span> Changing these values immediately affects which actions are permitted. Open any case and the action buttons, cooldown tooltips and reasoning strings will reflect the new bounds.
          </p>
        </div>
      </div>
    </AppShell>
  );
}