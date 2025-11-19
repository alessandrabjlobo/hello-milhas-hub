import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter as BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Subscription from "./pages/Subscription";
import Account from "./pages/Account";
import DashboardKPIs from "./pages/DashboardKPIs";
import AdminUsers from "./pages/AdminUsers";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
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
import PaymentInterestSettings from "./pages/settings/PaymentInterestSettings";
import PaymentSettings from "./pages/settings/PaymentSettings";
import QuoteHistory from "./pages/QuoteHistory";
import QuoteGenerator from "./pages/QuoteGenerator";
import Customers from "./pages/Customers";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import Demo from "./pages/Demo";

// Lazy load para páginas pesadas
const NewSaleWizard = lazy(() => import("./pages/sales/NewSaleWizard"));
const AgencySettings = lazy(() => import("./pages/settings/AgencySettings"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/assinatura" element={<Subscription />} />
          <Route path="/conta" element={<Account />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/privacy" element={<Privacy />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/dashboard" element={<DashboardKPIs />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/admin/users" element={<AdminUsers />} />
                        <Route path="/sales/new" element={
                          <Suspense fallback={
                            <div className="flex h-screen items-center justify-center">
                              <Skeleton className="h-96 w-full max-w-4xl" />
                            </div>
                          }>
                            <NewSaleWizard />
                          </Suspense>
                        } />
                        <Route path="/sales/:id" element={<SaleDetail />} />
                        <Route path="/sales" element={<SalesList />} />
                        <Route path="/accounts/:id" element={<AccountDetail />} />
                        <Route path="/accounts" element={<Accounts />} />
                        <Route path="/suppliers" element={<Suppliers />} />
                        <Route path="/tickets" element={<Tickets />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/calculator" element={<Calculator />} />
                        <Route path="/quotes/new" element={<QuoteGenerator />} />
                        <Route path="/quotes/:quoteId" element={<QuoteGenerator />} />
                        <Route path="/quotes" element={<QuoteHistory />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/settings/my-airlines" element={<MyAirlines />} />
                        <Route path="/settings/programs" element={<ProgramRules />} />
                        <Route path="/settings/billing" element={<Billing />} />
                        <Route path="/settings/credit" element={<PaymentInterestSettings />} />
                        <Route path="/settings/payment-interest" element={<PaymentInterestSettings />} />
                        <Route path="/settings/payment-methods" element={<PaymentSettings />} />
                        <Route path="/settings/agency" element={
                          <Suspense fallback={
                            <div className="container py-8">
                              <Skeleton className="h-12 w-64 mb-4" />
                              <Skeleton className="h-96 w-full" />
                            </div>
                          }>
                            <AgencySettings />
                          </Suspense>
                        } />
                        <Route path="/my-airlines" element={<Navigate to="/settings/my-airlines" replace />} />
                        <Route path="/program-rules" element={<Navigate to="/settings/programs" replace />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
