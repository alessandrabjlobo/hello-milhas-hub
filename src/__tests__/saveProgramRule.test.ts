import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveProgramRule } from '@/actions/saveProgramRule';
import { supabase } from '@/integrations/supabase/client';
import * as getSupplierIdModule from '@/lib/getSupplierId';

// Mock modules
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/getSupplierId', () => ({
  getSupplierId: vi.fn(),
}));

describe('saveProgramRule', () => {
  const mockSupplierId = 'supplier-123';
  const mockUserId = 'user-456';
  const mockAirlineId = 'airline-789';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(getSupplierIdModule, 'getSupplierId').mockResolvedValue({
      supplierId: mockSupplierId,
      userId: mockUserId,
    });
  });

  it('should upsert program rule successfully', async () => {
    const input = {
      airline_id: mockAirlineId,
      cpf_limit: 25,
      renewal_type: 'annual' as const,
    };

    const mockResult = {
      id: 'rule-123',
      supplier_id: mockSupplierId,
      airline_id: mockAirlineId,
      cpf_limit: 25,
      renewal_type: 'annual',
      updated_by: mockUserId,
      updated_at: new Date().toISOString(),
    };

    (supabase.from as any).mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockResult,
            error: null,
          }),
        }),
      }),
    });

    const result = await saveProgramRule(input);

    expect(result).toEqual(mockResult);
    expect(supabase.from).toHaveBeenCalledWith('program_rules');
  });

  it('should update existing rule with same supplier_id and airline_id', async () => {
    const input = {
      airline_id: mockAirlineId,
      cpf_limit: 30,
      renewal_type: 'rolling' as const,
    };

    const mockResult = {
      id: 'rule-123',
      supplier_id: mockSupplierId,
      airline_id: mockAirlineId,
      cpf_limit: 30,
      renewal_type: 'rolling',
      updated_by: mockUserId,
      updated_at: new Date().toISOString(),
    };

    (supabase.from as any).mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockResult,
            error: null,
          }),
        }),
      }),
    });

    const result = await saveProgramRule(input);

    expect(result.cpf_limit).toBe(30);
    expect(result.renewal_type).toBe('rolling');
  });

  it('should throw error when upsert fails', async () => {
    const input = {
      airline_id: mockAirlineId,
      cpf_limit: 25,
      renewal_type: 'annual' as const,
    };

    const dbError = new Error('Permission denied');
    (supabase.from as any).mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      }),
    });

    await expect(saveProgramRule(input)).rejects.toThrow('Permission denied');
  });

  it('should throw error when supplier_id cannot be retrieved', async () => {
    vi.spyOn(getSupplierIdModule, 'getSupplierId').mockRejectedValue(
      new Error('Not authenticated')
    );

    const input = {
      airline_id: mockAirlineId,
      cpf_limit: 25,
      renewal_type: 'annual' as const,
    };

    await expect(saveProgramRule(input)).rejects.toThrow('Not authenticated');
  });
});
