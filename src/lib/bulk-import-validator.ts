import type { SalesImportTemplate } from './bulk-import-generator';
import { parseBRNumber, isValidBRDate } from './bulk-import-helpers';
import { validateCPF } from './input-masks';
import { supabase } from '@/integrations/supabase/client';

// Tipos simplificados que aceitam as propriedades básicas necessárias
interface AirlineReference {
  id: string;
  code: string;
  name: string;
}

interface AccountReference {
  id: string;
  account_number: string;
  airline_company_id: string;
  status: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  resolvedData: {
    airlineCompanyId?: string;
    airlineName?: string;
    mileageAccountId?: string;
    accountNumber?: string;
    isCounter: boolean;
    isLegacyImport?: boolean;
    isDuplicate?: boolean;
  };
}

export async function validateSaleRow(
  row: SalesImportTemplate,
  airlines: AirlineReference[],
  accounts: AccountReference[],
  supplierId: string,
  mode: "simple" | "full" = "simple"
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resolvedData: ValidationResult['resolvedData'] = {
    isCounter: false,
  };

  // ==========================================
  // CAMPOS SEMPRE OBRIGATÓRIOS (ambos os modos)
  // ==========================================
  if (!row.data_venda) errors.push('Data da venda é obrigatória');
  if (!row.nome_cliente) errors.push('Nome do cliente é obrigatório');
  if (!row.valor_total) errors.push('Valor total é obrigatório');
  if (!row.forma_pagamento) errors.push('Forma de pagamento é obrigatória');
  if (!row.status_pagamento) errors.push('Status de pagamento é obrigatório');

  // ==========================================
  // CAMPOS OBRIGATÓRIOS APENAS NO MODO FULL
  // ==========================================
  if (mode === "full") {
    if (!row.cpf_cliente) errors.push('CPF do cliente é obrigatório');
    if (!row.programa_milhas) errors.push('Programa de milhas é obrigatório');
    if (!row.tipo_viagem) errors.push('Tipo de viagem é obrigatório');
    if (!row.origem) errors.push('Origem é obrigatória');
    if (!row.destino) errors.push('Destino é obrigatório');
    if (!row.data_ida) errors.push('Data de ida é obrigatória');
    if (!row.milhas_ida) errors.push('Milhas de ida é obrigatório');
    if (!row.numero_passageiros) errors.push('Número de passageiros é obrigatório');
  }

  // 2. Validar tipo de viagem
  if (row.tipo_viagem && !['one_way', 'round_trip'].includes(row.tipo_viagem)) {
    errors.push('Tipo de viagem inválido. Use: one_way ou round_trip');
  }

  // 3. Validar round_trip (apenas no modo full)
  if (mode === "full" && row.tipo_viagem === 'round_trip') {
    if (!row.data_volta) errors.push('Data de volta é obrigatória para viagem round_trip');
    if (!row.milhas_volta) errors.push('Milhas de volta são obrigatórias para viagem round_trip');
  }

  // 4. Validar números
  if (row.milhas_ida && isNaN(parseBRNumber(row.milhas_ida))) {
    errors.push('Milhas de ida deve ser um número');
  }
  if (row.milhas_volta && isNaN(parseBRNumber(row.milhas_volta))) {
    errors.push('Milhas de volta deve ser um número');
  }
  if (row.numero_passageiros && isNaN(parseBRNumber(row.numero_passageiros))) {
    errors.push('Número de passageiros deve ser um número');
  }
  if (row.taxa_embarque_total && isNaN(parseBRNumber(row.taxa_embarque_total))) {
    errors.push('Taxa de embarque deve ser um número');
  }
  if (row.valor_total && isNaN(parseBRNumber(row.valor_total))) {
    errors.push('Valor total deve ser um número');
  }

  // 5. Validar CPF
  if (row.cpf_cliente) {
    const cpfClean = row.cpf_cliente.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      if (mode === "full") {
        errors.push('CPF deve ter 11 dígitos');
      } else {
        warnings.push('⚠️ CPF inválido (ignorado no modo simplificado)');
      }
    }
  }

  // 6. Validar datas
  if (row.data_venda && !isValidBRDate(row.data_venda)) {
    errors.push('Data da venda inválida (use DD/MM/YYYY)');
  }
  if (row.data_ida && !isValidBRDate(row.data_ida)) {
    errors.push('Data de ida inválida (use DD/MM/YYYY)');
  }
  if (row.data_volta && !isValidBRDate(row.data_volta)) {
    errors.push('Data de volta inválida (use DD/MM/YYYY)');
  }

  // 7. Resolver programa de milhas
  if (row.programa_milhas) {
    const airline = airlines.find(
      (a) =>
        a.code.toUpperCase() === row.programa_milhas.toUpperCase() ||
        a.name.toUpperCase().includes(row.programa_milhas.toUpperCase())
    );

    if (airline) {
      resolvedData.airlineCompanyId = airline.id;
      resolvedData.airlineName = airline.name;
    } else {
      if (mode === "full") {
        errors.push(`Programa "${row.programa_milhas}" não encontrado`);
      } else {
        warnings.push(`⚠️ Programa "${row.programa_milhas}" não encontrado`);
      }
    }
  }

  // 8. Resolver conta de milhagem
  if (mode === "full" && resolvedData.airlineCompanyId && !resolvedData.isCounter) {
    // No modo full, tentar encontrar conta ativa
    if (row.numero_conta) {
      const account = accounts.find(
        (acc) =>
          acc.airline_company_id === resolvedData.airlineCompanyId &&
          acc.account_number === row.numero_conta &&
          acc.status === 'active'
      );

      if (account) {
        resolvedData.mileageAccountId = account.id;
        resolvedData.accountNumber = account.account_number;
      } else {
        errors.push(`Conta "${row.numero_conta}" não encontrada ou inativa`);
      }
    } else {
      // Tentar encontrar alguma conta ativa do programa
      const availableAccount = accounts.find(
        (acc) =>
          acc.airline_company_id === resolvedData.airlineCompanyId &&
          acc.status === 'active'
      );

      if (availableAccount) {
        resolvedData.mileageAccountId = availableAccount.id;
        resolvedData.accountNumber = availableAccount.account_number;
        warnings.push(`Conta "${availableAccount.account_number}" selecionada automaticamente`);
      } else {
        errors.push('Nenhuma conta ativa disponível para este programa');
      }
    }
  } else if (mode === "simple" && row.numero_conta && resolvedData.airlineCompanyId) {
    // No modo simple, apenas tentar resolver, mas não bloquear
    const account = accounts.find(
      (acc) =>
        acc.airline_company_id === resolvedData.airlineCompanyId &&
        acc.account_number === row.numero_conta &&
        acc.status === 'active'
    );

    if (account) {
      resolvedData.mileageAccountId = account.id;
      resolvedData.accountNumber = account.account_number;
    } else {
      warnings.push(`⚠️ Conta "${row.numero_conta}" não encontrada`);
    }
  }

  // 9. Determinar se é venda de balcão
  if (row.custo_mil_milhas_balcao || row.vendedor_balcao) {
    resolvedData.isCounter = true;
    
    if (!row.custo_mil_milhas_balcao) {
      errors.push('Custo por mil milhas é obrigatório para vendas de balcão');
    } else if (isNaN(parseBRNumber(row.custo_mil_milhas_balcao))) {
      errors.push('Custo por mil milhas deve ser um número');
    }
    
    if (!row.vendedor_balcao) {
      warnings.push('Nome do vendedor de balcão não informado');
    }
  }

  // 10. Validar forma de pagamento
  const validPaymentMethods = ['pix', 'credit_card', 'debit_card', 'boleto'];
  if (row.forma_pagamento && !validPaymentMethods.includes(row.forma_pagamento)) {
    errors.push(`Forma de pagamento inválida. Use: ${validPaymentMethods.join(', ')}`);
  }

  // 11. Validar status de pagamento
  const validPaymentStatus = ['pending', 'partial', 'paid'];
  if (row.status_pagamento && !validPaymentStatus.includes(row.status_pagamento)) {
    errors.push(`Status de pagamento inválido. Use: ${validPaymentStatus.join(', ')}`);
  }

  // 12. Marcar como importação legada se modo simples
  if (mode === "simple") {
    resolvedData.isLegacyImport = true;
  }

  // 13. Verificar duplicidade (se tiver localizador)
  // 13. Verificar duplicidade (se tiver localizador)
  const cpfClean = row.cpf_cliente ? row.cpf_cliente.replace(/\D/g, '') : '';
  // 13. Verificar duplicidade (se tiver localizador)
  if (row.localizador && row.cpf_cliente && row.data_venda && isValidBRDate(row.data_venda)) {
    const cpfForDupe = row.cpf_cliente.replace(/\D/g, '');
    try {
      const { data: existingSales } = await supabase
        .from('sales')
        .select('id')
        .eq('supplier_id', supplierId)
        .ilike('route_text', `%${row.localizador}%`)
        .limit(1);

      if (existingSales && existingSales.length > 0) {
        warnings.push('⚠️ Possível duplicata (localizador já existe)');
        resolvedData.isDuplicate = true;
      }
    } catch (error) {
      // Ignorar erro de duplicidade, não é crítico
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    resolvedData,
  };
}
