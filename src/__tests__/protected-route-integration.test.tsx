import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import NewSaleWizard from '@/pages/sales/NewSaleWizard';

// Mock do useSubscriptionGuard
vi.mock('@/hooks/useSubscriptionGuard', () => ({
  useSubscriptionGuard: vi.fn(() => ({
    hasAccess: true,
    loading: false
  }))
}));

// Mock dos outros hooks necessários
vi.mock('@/hooks/useMileageAccounts', () => ({
  useMileageAccounts: () => ({ 
    accounts: [], 
    loading: false,
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn()
  })
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ 
    supplierId: 'test-supplier-id', 
    loading: false,
    isAdmin: false,
    setSupplierIdLocal: vi.fn(),
    clearSupplierIdLocal: vi.fn()
  })
}));

vi.mock('@/hooks/useSupplierAirlines', () => ({
  useSupplierAirlines: () => ({ 
    linkedAirlines: [], 
    allAirlines: [],
    loading: false,
    linkAirline: vi.fn(),
    unlinkAirline: vi.fn()
  })
}));

vi.mock('@/hooks/usePaymentInterestConfig', () => ({
  usePaymentInterestConfig: () => ({ 
    configs: [], 
    loading: false,
    calculateInstallmentValue: () => 0
  })
}));

vi.mock('@/hooks/usePaymentMethods', () => ({
  usePaymentMethods: () => ({ 
    methods: [],
    activeMethods: [], 
    loading: false,
    fetchMethods: vi.fn(),
    createMethod: vi.fn(),
    updateMethod: vi.fn(),
    deleteMethod: vi.fn()
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('ProtectedRoute + NewSaleWizard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render NewSaleWizard when user has access', async () => {
    const { useSubscriptionGuard } = await import('@/hooks/useSubscriptionGuard');
    vi.mocked(useSubscriptionGuard).mockReturnValue({
      hasAccess: true,
      loading: false
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/sales/new']}>
        <Routes>
          <Route
            path="/sales/new"
            element={
              <ProtectedRoute>
                <NewSaleWizard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
      { wrapper }
    );

    await waitFor(() => {
      expect(getByText(/Nova Venda/i)).toBeInTheDocument();
    });
  });

  it('should show loading skeleton when checking access', async () => {
    const { useSubscriptionGuard } = await import('@/hooks/useSubscriptionGuard');
    vi.mocked(useSubscriptionGuard).mockReturnValue({
      hasAccess: false,
      loading: true
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/sales/new']}>
        <Routes>
          <Route
            path="/sales/new"
            element={
              <ProtectedRoute>
                <NewSaleWizard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
      { wrapper }
    );

    // Should show skeleton loading
    expect(getByText(/Carregando/i)).toBeInTheDocument();
  });

  it('should not render NewSaleWizard when user has no access', async () => {
    const { useSubscriptionGuard } = await import('@/hooks/useSubscriptionGuard');
    vi.mocked(useSubscriptionGuard).mockReturnValue({
      hasAccess: false,
      loading: false
    });

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/sales/new']}>
        <Routes>
          <Route path="/assinatura" element={<div>Subscription Page</div>} />
          <Route
            path="/sales/new"
            element={
              <ProtectedRoute>
                <NewSaleWizard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
      { wrapper }
    );

    await waitFor(() => {
      // Should not show NewSaleWizard
      expect(queryByText(/Nova Venda/i)).not.toBeInTheDocument();
    });
  });

  it('should not cause render loops or infinite redirects', async () => {
    const { useSubscriptionGuard } = await import('@/hooks/useSubscriptionGuard');
    const mockUseSubscriptionGuard = vi.mocked(useSubscriptionGuard);
    
    let callCount = 0;
    mockUseSubscriptionGuard.mockImplementation(() => {
      callCount++;
      return {
        hasAccess: true,
        loading: false
      };
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/sales/new']}>
        <Routes>
          <Route
            path="/sales/new"
            element={
              <ProtectedRoute>
                <NewSaleWizard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
      { wrapper }
    );

    await waitFor(() => {
      expect(getByText(/Nova Venda/i)).toBeInTheDocument();
    });

    // Should not be called excessively (max 3 times for initial mount + effects)
    expect(callCount).toBeLessThan(5);
  });
});
