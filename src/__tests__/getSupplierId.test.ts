import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupplierId } from '@/lib/getSupplierId';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('getSupplierId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return supplierId and userId when profile exists', async () => {
    const mockUserId = 'user-123';
    const mockSupplierId = 'supplier-456';

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: mockUserId } },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { supplier_id: mockSupplierId },
            error: null,
          }),
        }),
      }),
    });

    const result = await getSupplierId();
    
    expect(result).toEqual({
      supplierId: mockSupplierId,
      userId: mockUserId,
    });
  });

  it('should throw error when user is not authenticated', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
    });

    await expect(getSupplierId()).rejects.toThrow('Not authenticated');
  });

  it('should throw error when supplier_id is missing', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { supplier_id: null },
            error: null,
          }),
        }),
      }),
    });

    await expect(getSupplierId()).rejects.toThrow('supplier_id missing in profile');
  });

  it('should throw database error when query fails', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });

    const dbError = new Error('Database connection failed');
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      }),
    });

    await expect(getSupplierId()).rejects.toThrow('Database connection failed');
  });
});
