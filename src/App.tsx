import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/AppSidebar";

import Index from "./pages/Index";
import DashboardKPIs from "./pages/DashboardKPIs";
import AdminUsers from "./pages/AdminUsers";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import NewSaleWizard from "./pages/sales/NewSaleWizard";
import SalesList from "./pages/sales/SalesList";
import AccountDetail from "./pages/AccountDetail";
import Accounts from "./pages/Accounts";
import Suppliers from "./pages/Suppliers";
import Tickets from "./pages/Tickets";
import Reports from "./pages/Reports";
import ProgramRules from "./pages/ProgramRules";
import MyAirlines from "./pages/MyAirlines";             // idem: "./pages/settings/MyAirlines"
import Billing from "./pages/Billing";
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
                      <Route path="/sales" element={<SalesList />} />
                      <Route path="/accounts/:id" element={<AccountDetail />} />
                      <Route path="/accounts" element={<Accounts />} />
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/reports" element={<Reports />} />

                      {/* Settings */}
                      <Route path="/settings/my-airlines" element={<MyAirlines />} />
                      <Route path="/settings/programs" element={<ProgramRules />} />
                      <Route path="/settings/billing" element={<Billing />} />

                      {/* Redirects de compatibilidade (evita 404 em links antigos) */}
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
