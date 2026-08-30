import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import BatchReports from './pages/BatchReports';
import SettingsPage from './pages/SettingsPage';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import Insights from './pages/Insights';
// MODULE_IMPORTS_START
// MODULE_IMPORTS_END

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/cases" element={<Cases />} />
    <Route path="/cases/:id" element={<CaseDetail />} />
    <Route path="/batch-reports" element={<BatchReports />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/insights" element={<Insights />} />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/auth/error" element={<AuthError />} />
    {/* MODULE_ROUTES_START */}
    {/* MODULE_ROUTES_END */}
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* MODULE_PROVIDERS_START */}
    {/* MODULE_PROVIDERS_END */}
    <TooltipProvider delayDuration={150}>
      <Toaster />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
    {/* MODULE_PROVIDERS_CLOSE */}
  </QueryClientProvider>
);

export default App;
export { AppRoutes };