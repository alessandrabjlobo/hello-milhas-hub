import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupplierId } from '@/lib/getSupplierId';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('getSupplierId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call ensure_profile_and_supplier RPC and return supplierId', async () => {
    const mockUserId = 'user-123';
    const mockSupplierId = 'supplier-456';

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    (supabase.rpc as any).mockResolvedValue({
      data: mockSupplierId,
      error: null,
    });

    const result = await getSupplierId();
    
    expect(supabase.rpc).toHaveBeenCalledWith('ensure_profile_and_supplier', {
      p_user_id: mockUserId,
    });
    
    expect(result).toEqual({
      supplierId: mockSupplierId,
      userId: mockUserId,
    });
  });

  it('should throw error when user is not authenticated', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(getSupplierId()).rejects.toThrow('Não autenticado');
  });

  it('should throw error when RPC fails', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const rpcError = new Error('RPC failed');
    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: rpcError,
    });

    await expect(getSupplierId()).rejects.toThrow('RPC failed');
  });

  it('should throw error when RPC returns no data', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    (supabase.rpc as any).mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(getSupplierId()).rejects.toThrow('Falha ao obter supplier_id');
  });
});
