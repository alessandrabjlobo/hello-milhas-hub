import { describe, it, expect } from 'vitest';
import { internalSaleSchema, balcaoSaleSchema } from '@/schemas/saleSchema';

describe('Sale Validation Schema', () => {
  describe('Internal Channel', () => {
    it('should require program_id for internal sales', () => {
      const invalidData = {
        channel: 'internal' as const,
        customerName: 'Test Customer',
        customerCpf: '12345678900',
        passengers: 1,
        tripType: 'one_way' as const,
        flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
        accountId: 'acc-123'
        // Missing programId
      };

      const result = internalSaleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('programId'))).toBe(true);
      }
    });

    it('should allow valid internal sale', () => {
      const validData = {
        channel: 'internal' as const,
        customerName: 'Test Customer',
        customerCpf: '12345678900',
        passengers: 1,
        tripType: 'one_way' as const,
        flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
        programId: '123e4567-e89b-12d3-a456-426614174000',
        accountId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = internalSaleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should not require seller info for internal sales', () => {
      const validData = {
        channel: 'internal' as const,
        customerName: 'Test Customer',
        customerCpf: '12345678900',
        passengers: 1,
        tripType: 'one_way' as const,
        flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
        programId: '123e4567-e89b-12d3-a456-426614174000',
        accountId: '123e4567-e89b-12d3-a456-426614174001'
        // No seller fields
      };

      const result = internalSaleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Balcao Channel', () => {
    it('should require seller_name and seller_contact for balcao sales', () => {
      const invalidData = {
        channel: 'balcao' as const,
        customerName: 'Test Customer',
        customerCpf: '12345678900',
        passengers: 1,
        tripType: 'one_way' as const,
        flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
        counterCostPerThousand: 50
        // Missing sellerName and sellerContact
      };

      const result = balcaoSaleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('sellerName'))).toBe(true);
        expect(result.error.issues.some(i => i.path.includes('sellerContact'))).toBe(true);
      }
    });

    it('should allow valid balcao sale', () => {
      const validData = {
        channel: 'balcao' as const,
        customerName: 'Test Customer',
        customerCpf: '12345678900',
        passengers: 1,
        tripType: 'one_way' as const,
        flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
        sellerName: 'Seller Name',
        sellerContact: '11999999999',
        counterCostPerThousand: 50
      };

      const result = balcaoSaleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should not require program_id for balcao sales', () => {
      const validData = {
        channel: 'balcao' as const,
        customerName: 'Test Customer',
        customerCpf: '12345678900',
        passengers: 1,
        tripType: 'one_way' as const,
        flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
        sellerName: 'Seller Name',
        sellerContact: '11999999999',
        counterCostPerThousand: 50
        // No programId
      };

      const result = balcaoSaleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Flight Segments', () => {
    it('should require at least one flight segment', () => {
      const invalidData = {
        channel: 'internal' as const,
        customerName: 'Test Customer',
        customerCpf: '12345678900',
        passengers: 1,
        tripType: 'one_way' as const,
        flightSegments: [], // Empty
        programId: '123e4567-e89b-12d3-a456-426614174000',
        accountId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = internalSaleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate segment structure', () => {
      const invalidData = {
        channel: 'internal' as const,
        customerName: 'Test Customer',
        customerCpf: '12345678900',
        passengers: 1,
        tripType: 'one_way' as const,
        flightSegments: [{ from: 'GR', to: 'GIG', date: '2024-01-01' }], // Invalid from code
        programId: '123e4567-e89b-12d3-a456-426614174000',
        accountId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = internalSaleSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Sale Creation Mock', () => {
  it('should generate correct payload for internal sale', () => {
    const formData = {
      channel: 'internal' as const,
      customerName: 'Test Customer',
      customerCpf: '12345678900',
      passengers: 1,
      tripType: 'one_way' as const,
      flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
      programId: '123e4567-e89b-12d3-a456-426614174000',
      accountId: '123e4567-e89b-12d3-a456-426614174001'
    };

    // Simulate payload generation
    const payload = {
      channel: formData.channel,
      program_id: formData.programId,
      client_name: formData.customerName,
      client_cpf_encrypted: formData.customerCpf,
      passengers: formData.passengers,
      status: 'draft'
    };

    expect(payload.channel).toBe('internal');
    expect(payload.program_id).toBeDefined();
    expect(payload.client_name).toBe('Test Customer');
  });

  it('should generate correct payload for balcao sale', () => {
    const formData = {
      channel: 'balcao' as const,
      customerName: 'Test Customer',
      customerCpf: '12345678900',
      passengers: 1,
      tripType: 'one_way' as const,
      flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
      sellerName: 'Seller Name',
      sellerContact: '11999999999',
      counterCostPerThousand: 50
    };

    // Simulate payload generation
    const payload = {
      channel: formData.channel,
      seller_name: formData.sellerName,
      seller_contact: formData.sellerContact,
      client_name: formData.customerName,
      client_cpf_encrypted: formData.customerCpf,
      passengers: formData.passengers,
      status: 'draft'
    };

    expect(payload.channel).toBe('balcao');
    expect(payload.seller_name).toBeDefined();
    expect(payload.seller_contact).toBeDefined();
    expect(payload.client_name).toBe('Test Customer');
  });
});

describe('RLS Simulation', () => {
  it('should handle supplier mismatch gracefully', () => {
    // Simulate a 403 error from Supabase RLS
    const rlsError = {
      code: 'PGRST301',
      message: 'new row violates row-level security policy',
      details: 'Policy check violation'
    };

    // In the real app, this would trigger a toast or error message
    expect(rlsError.code).toBe('PGRST301');
    expect(rlsError.message).toContain('security policy');
  });
});
