import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// ⬇️ use HashRouter para evitar 404 no host do Lovable
import { HashRouter as BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/AppSidebar";

import Index from "./pages/Index";
import DashboardKPIs from "./pages/DashboardKPIs";
import AdminUsers from "./pages/AdminUsers";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import NewSaleWizard from "./pages/sales/NewSaleWizard";
import SalesList from "./pages/sales/SalesList";
import SaleDetail from "./pages/sales/SaleDetail";
import AccountDetail from "./pages/AccountDetail";
import Accounts from "./pages/Accounts";
import Suppliers from "./pages/Suppliers";
import Tickets from "./pages/Tickets";
import Reports from "./pages/Reports";
import Calculator from "./pages/Calculator";
import ProgramRules from "./pages/ProgramRules";
import MyAirlines from "./pages/MyAirlines";
import Billing from "./pages/Billing";
import CreditSettings from "./pages/settings/CreditSettings";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/privacy" element={<Privacy />} />

          {/* app “logado” com sidebar */}
          <Route
            path="/*"
            element={
              <SidebarProvider>
                <div className="flex min-h-screen w-full">
                  <AppSidebar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/dashboard" element={<DashboardKPIs />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/sales/new" element={<NewSaleWizard />} />
                      <Route path="/sales/:id" element={<SaleDetail />} />
                      <Route path="/sales" element={<SalesList />} />
                      <Route path="/accounts/:id" element={<AccountDetail />} />
                      <Route path="/accounts" element={<Accounts />} />
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/calculator" element={<Calculator />} />

                      {/* Settings */}
                      <Route path="/settings/my-airlines" element={<MyAirlines />} />
                      <Route path="/settings/programs" element={<ProgramRules />} />
                      <Route path="/settings/billing" element={<Billing />} />
                      <Route path="/settings/credit" element={<CreditSettings />} />

                      {/* Redirects de compatibilidade */}
                      <Route path="/my-airlines" element={<Navigate to="/settings/my-airlines" replace />} />
                      <Route path="/program-rules" element={<Navigate to="/settings/programs" replace />} />

                      {/* 404 local */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </SidebarProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
