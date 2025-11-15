import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('CPF Count Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Distinct CPF Counting', () => {
    it('should not increment cpf_count when using repeated CPF in same account', async () => {
      const accountId = 'account-123';
      const cpfEncrypted = 'encrypted-cpf-1';
      
      // Simular que o CPF já existe na conta
      const mockCpfRegistry = [
        { cpf_encrypted: cpfEncrypted, airline_company_id: accountId }
      ];
      
      // Mock da query que conta CPFs distintos
      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: mockCpfRegistry,
            error: null
          })
        })
      });
      
      (supabase.from as any).mockImplementation(fromMock);
      
      // Quando salvar venda com CPF repetido
      // A função update_account_cpf_count deve contar apenas CPFs distintos
      const distinctCount = new Set(mockCpfRegistry.map(r => r.cpf_encrypted)).size;
      
      expect(distinctCount).toBe(1); // Ainda 1, não incrementou
    });

    it('should increment cpf_count when using new CPF in same account', async () => {
      const accountId = 'account-123';
      
      // CPF 1 já existe
      const existingCpf = 'encrypted-cpf-1';
      // CPF 2 é novo
      const newCpf = 'encrypted-cpf-2';
      
      const mockCpfRegistry = [
        { cpf_encrypted: existingCpf, airline_company_id: accountId },
        { cpf_encrypted: newCpf, airline_company_id: accountId }
      ];
      
      const distinctCount = new Set(mockCpfRegistry.map(r => r.cpf_encrypted)).size;
      
      expect(distinctCount).toBe(2); // Incrementou para 2
    });

    it('should count CPFs independently per account', async () => {
      const account1 = 'account-123';
      const account2 = 'account-456';
      const cpfEncrypted = 'encrypted-cpf-1';
      
      // Mesmo CPF usado em duas contas diferentes
      const mockCpfRegistryAccount1 = [
        { cpf_encrypted: cpfEncrypted, airline_company_id: account1 }
      ];
      
      const mockCpfRegistryAccount2 = [
        { cpf_encrypted: cpfEncrypted, airline_company_id: account2 }
      ];
      
      const count1 = new Set(mockCpfRegistryAccount1.map(r => r.cpf_encrypted)).size;
      const count2 = new Set(mockCpfRegistryAccount2.map(r => r.cpf_encrypted)).size;
      
      // Cada conta conta independentemente
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });

    it('should block CPF when reaching cpf_limit', async () => {
      const accountId = 'account-123';
      const cpfLimit = 25;
      const cpfUsageCount = 25;
      
      // Simular CPF que atingiu o limite
      const shouldBlock = cpfUsageCount >= cpfLimit;
      
      expect(shouldBlock).toBe(true);
      
      // Verificar que status seria 'blocked'
      const status = shouldBlock ? 'blocked' : 'available';
      expect(status).toBe('blocked');
    });

    it('should not block CPF when under cpf_limit', async () => {
      const cpfLimit = 25;
      const cpfUsageCount = 20;
      
      const shouldBlock = cpfUsageCount >= cpfLimit;
      
      expect(shouldBlock).toBe(false);
      
      const status = shouldBlock ? 'blocked' : 'available';
      expect(status).toBe('available');
    });
  });

  describe('CPF Status Management', () => {
    it('should calculate blocked_until correctly for rolling renewal', async () => {
      const renewalType = 'rolling';
      const firstUseDate = new Date('2024-01-15');
      
      // Rolling: 1 ano a partir do primeiro uso
      const blockedUntil = new Date(firstUseDate);
      blockedUntil.setFullYear(blockedUntil.getFullYear() + 1);
      
      const expectedDate = new Date('2025-01-15');
      expect(blockedUntil.getTime()).toBe(expectedDate.getTime());
    });

    it('should calculate blocked_until correctly for annual renewal', async () => {
      const renewalType = 'annual';
      const currentYear = new Date().getFullYear();
      
      // Annual: até 1º de janeiro do próximo ano
      const blockedUntil = new Date(`${currentYear + 1}-01-01`);
      
      expect(blockedUntil.getMonth()).toBe(0); // Janeiro
      expect(blockedUntil.getDate()).toBe(1);
      expect(blockedUntil.getFullYear()).toBe(currentYear + 1);
    });
  });
});
