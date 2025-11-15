import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import NewSaleWizard from '@/pages/sales/NewSaleWizard';

// Mock dos hooks
vi.mock('@/hooks/useMileageAccounts', () => ({
  useMileageAccounts: vi.fn(() => ({ 
    accounts: [], 
    loading: false,
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn()
  }))
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: vi.fn(() => ({ 
    supplierId: 'test-supplier-id', 
    loading: false,
    isAdmin: false,
    setSupplierIdLocal: vi.fn(),
    clearSupplierIdLocal: vi.fn()
  }))
}));

vi.mock('@/hooks/useSupplierAirlines', () => ({
  useSupplierAirlines: vi.fn(() => ({ 
    linkedAirlines: [], 
    allAirlines: [],
    loading: false,
    linkAirline: vi.fn(),
    unlinkAirline: vi.fn()
  }))
}));

vi.mock('@/hooks/usePaymentInterestConfig', () => ({
  usePaymentInterestConfig: vi.fn(() => ({ 
    configs: [], 
    loading: false,
    calculateInstallmentValue: vi.fn(() => 0)
  }))
}));

vi.mock('@/hooks/usePaymentMethods', () => ({
  usePaymentMethods: vi.fn(() => ({ 
    methods: [],
    activeMethods: [], 
    loading: false,
    fetchMethods: vi.fn(),
    createMethod: vi.fn(),
    updateMethod: vi.fn(),
    deleteMethod: vi.fn()
  }))
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
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

describe('NewSaleWizard - React Hooks Stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', async () => {
    const { getByText } = render(<NewSaleWizard />, { wrapper });
    
    await waitFor(() => {
      expect(getByText(/Nova Venda/i)).toBeInTheDocument();
    });
  });

  it('should show loading state when data is loading', async () => {
    const { useMileageAccounts } = await import('@/hooks/useMileageAccounts');
    vi.mocked(useMileageAccounts).mockReturnValue({
      accounts: [],
      loading: true,
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn()
    } as any);

    const { getByText } = render(<NewSaleWizard />, { wrapper });
    
    expect(getByText(/Carregando dados da venda/i)).toBeInTheDocument();
  });

  it('should render form after loading completes', async () => {
    const { getByText } = render(<NewSaleWizard />, { wrapper });
    
    await waitFor(() => {
      expect(getByText(/Origem da Venda/i)).toBeInTheDocument();
    });
  });

  it('should not throw React Hook error #310 during render cycle', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { getByText } = render(<NewSaleWizard />, { wrapper });
    
    await waitFor(() => {
      expect(getByText(/Nova Venda/i)).toBeInTheDocument();
    });

    // ✅ Verificar que não há erro React #310
    const errorCalls = consoleError.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('Minified React error #310'))
    );
    
    expect(errorCalls.length).toBe(0);
    
    consoleError.mockRestore();
  });

  it('should maintain consistent hook order across re-renders', async () => {
    const { rerender, getByText } = render(<NewSaleWizard />, { wrapper });
    
    await waitFor(() => {
      expect(getByText(/Nova Venda/i)).toBeInTheDocument();
    });

    // Force re-render
    rerender(<NewSaleWizard />);
    
    // Should still render without errors
    await waitFor(() => {
      expect(getByText(/Nova Venda/i)).toBeInTheDocument();
    });
  });

  it('should handle loading state transitions gracefully', async () => {
    const { useMileageAccounts } = await import('@/hooks/useMileageAccounts');
    
    // Start with loading
    vi.mocked(useMileageAccounts).mockReturnValue({
      accounts: [],
      loading: true,
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn()
    } as any);

    const { rerender, getByText, queryByText } = render(<NewSaleWizard />, { wrapper });
    
    expect(getByText(/Carregando dados da venda/i)).toBeInTheDocument();

    // Simulate loading complete
    vi.mocked(useMileageAccounts).mockReturnValue({
      accounts: [],
      loading: false,
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn()
    } as any);

    rerender(<NewSaleWizard />);

    await waitFor(() => {
      expect(queryByText(/Carregando dados da venda/i)).not.toBeInTheDocument();
      expect(getByText(/Nova Venda/i)).toBeInTheDocument();
    });
  });
});
