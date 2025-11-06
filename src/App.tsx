import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/AppSidebar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NewSaleWizard from "./pages/sales/NewSaleWizard";
import SalesList from "./pages/sales/SalesList";
import AccountDetail from "./pages/AccountDetail";
import Accounts from "./pages/Accounts";
import Suppliers from "./pages/Suppliers";
import Tickets from "./pages/Tickets";
import Reports from "./pages/Reports";
import ProgramRules from "./pages/ProgramRules";
import MyAirlines from "./pages/MyAirlines";
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
          <Route
            path="/*"
            element={
              <SidebarProvider>
                <div className="flex min-h-screen w-full">
                  <AppSidebar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/sales/new" element={<NewSaleWizard />} />
                      <Route path="/sales" element={<SalesList />} />
                      <Route path="/accounts/:id" element={<AccountDetail />} />
                      <Route path="/accounts" element={<Accounts />} />
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings/my-airlines" element={<MyAirlines />} />
                      <Route path="/settings/program-rules" element={<ProgramRules />} />
                      <Route path="/settings/billing" element={<Billing />} />
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
