import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Command, LayoutDashboard, ListChecks, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/animations/StatusIndicator';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cases', label: 'Cases', icon: ListChecks },
  { to: '/batch-reports', label: 'Batch Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/insights', label: 'Insights Studio', icon: Sparkles },
];

export default function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandMenuOpen((open) => !open);
      }
      if (event.key === 'Escape') setIsCommandMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const goTo = (to: string) => {
    navigate(to);
    setIsCommandMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1.5 text-sm font-bold text-white shadow-md cursor-pointer hover:opacity-90 hover:shadow-lg transition-all active:scale-95">
                <Sparkles className="h-4 w-4" />
                <span>vasooli</span>
              </button>
              <div className="min-w-0">
                <h1 className="truncate bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">{title}</h1>
              {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator status="online" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCommandMenuOpen(true)}
                aria-label="Open command menu"
              >
                <Command />
                <span className="hidden lg:inline">Command menu</span>
                <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground lg:inline">Ctrl K</kbd>
              </Button>
              {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>
          </div>
        </header>

        {isCommandMenuOpen ? (
          <div className="fixed inset-0 z-40 bg-foreground/20 p-5 backdrop-blur-sm" onClick={() => setIsCommandMenuOpen(false)}>
            <div className="mx-auto mt-16 max-w-lg rounded-xl border border-border bg-card p-3 shadow-xl" role="dialog" aria-label="Command menu" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center gap-2 border-b border-border px-2 pb-3 text-sm font-medium"><Command className="h-4 w-4 text-primary" /> Quick navigation</div>
              <div className="mt-2 grid gap-1">
                {NAV.map(({ to, label, icon: Icon }) => <button key={to} type="button" className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary" onClick={() => goTo(to)}><Icon className="h-4 w-4 text-muted-foreground" />{label}<span className="ml-auto text-xs text-muted-foreground">Open</span></button>)}
              </div>
            </div>
          </div>
        ) : null}

        <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}