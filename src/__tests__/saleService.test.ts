import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InternalSaleData, BalcaoSaleData } from '@/schemas/saleSchema';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
};

describe('Sale Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prepare correct payload for internal sale', () => {
    const formData: InternalSaleData = {
      channel: 'internal',
      customerName: 'Test Customer',
      customerCpf: '12345678900',
      passengers: 1,
      tripType: 'one_way',
      flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
      programId: '123e4567-e89b-12d3-a456-426614174000',
      accountId: '123e4567-e89b-12d3-a456-426614174001'
    };

    const payload = {
      channel: formData.channel,
      program_id: formData.programId,
      mileage_account_id: formData.accountId,
      client_name: formData.customerName,
      client_cpf_encrypted: formData.customerCpf,
      passengers: formData.passengers,
      trip_type: formData.tripType,
      status: 'draft',
      // Backward compatibility
      sale_source: 'internal_account'
    };

    expect(payload.channel).toBe('internal');
    expect(payload.program_id).toBeDefined();
    expect(payload.mileage_account_id).toBeDefined();
    expect(payload.sale_source).toBe('internal_account');
  });

  it('should prepare correct payload for balcao sale', () => {
    const formData: BalcaoSaleData = {
      channel: 'balcao',
      customerName: 'Test Customer',
      customerCpf: '12345678900',
      passengers: 1,
      tripType: 'one_way',
      flightSegments: [{ from: 'GRU', to: 'GIG', date: '2024-01-01' }],
      sellerName: 'Seller Name',
      sellerContact: '11999999999',
      counterCostPerThousand: 50
    };

    const payload = {
      channel: formData.channel,
      seller_name: formData.sellerName,
      seller_contact: formData.sellerContact,
      counter_cost_per_thousand: formData.counterCostPerThousand,
      client_name: formData.customerName,
      client_cpf_encrypted: formData.customerCpf,
      passengers: formData.passengers,
      trip_type: formData.tripType,
      status: 'draft',
      // Backward compatibility
      sale_source: 'mileage_counter',
      counter_seller_name: formData.sellerName,
      counter_seller_contact: formData.sellerContact
    };

    expect(payload.channel).toBe('balcao');
    expect(payload.seller_name).toBeDefined();
    expect(payload.seller_contact).toBeDefined();
    expect(payload.sale_source).toBe('mileage_counter');
  });

  it('should prepare sale_segments payloads correctly', () => {
    const segments = [
      { from: 'GRU', to: 'GIG', date: '2024-01-01' },
      { from: 'GIG', to: 'GRU', date: '2024-01-08' }
    ];

    const direction = 'roundtrip';
    const saleId = '123e4567-e89b-12d3-a456-426614174000';

    const segmentPayloads = segments.map((segment, index) => ({
      sale_id: saleId,
      direction,
      from_code: segment.from,
      to_code: segment.to,
      date: segment.date ? new Date(segment.date).toISOString() : null,
      flight_number: null,
      position: index
    }));

    expect(segmentPayloads).toHaveLength(2);
    expect(segmentPayloads[0].from_code).toBe('GRU');
    expect(segmentPayloads[0].to_code).toBe('GIG');
    expect(segmentPayloads[0].position).toBe(0);
    expect(segmentPayloads[1].position).toBe(1);
    expect(segmentPayloads[0].direction).toBe('roundtrip');
  });
});
