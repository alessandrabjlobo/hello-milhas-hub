import { useState } from 'react';
import { parseSalesFile, type ParsedSaleRow } from '@/lib/bulk-import-parser';
import { validateSaleRow, type ValidationResult } from '@/lib/bulk-import-validator';
import { createSaleWithSegments } from '@/services/saleService';
import { useMileageAccounts } from './useMileageAccounts';
import { useSupplierAirlines } from './useSupplierAirlines';
import { useUserRole } from './useUserRole';
import { useToast } from './use-toast';
import { parseBRNumber, parseBRDate, formatDateToISO } from '@/lib/bulk-import-helpers';
import type { SaleFormData } from '@/schemas/saleSchema';

export interface ProcessedSaleRow extends ParsedSaleRow {
  validation: ValidationResult;
  status: 'pending' | 'valid' | 'invalid' | 'imported' | 'error';
  errorMessage?: string;
}

export function useBulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ProcessedSaleRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<"simple" | "full">("simple");
  
  const { accounts } = useMileageAccounts();
  const { supplierId } = useUserRole();
  const { linkedAirlines } = useSupplierAirlines(supplierId);
  const { toast } = useToast();

  const handleFileUpload = async (uploadedFile: File) => {
    try {
      setParsing(true);
      setFile(uploadedFile);
      
      // Parse file
      const parseResult = await parseSalesFile(uploadedFile);
      
      if (!parseResult.success) {
        toast({
          title: 'Erro ao processar arquivo',
          description: parseResult.errors[0]?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
        return;
      }

      if (parseResult.rows.length === 0) {
        toast({
          title: 'Arquivo vazio',
          description: 'O arquivo não contém dados para importar',
          variant: 'destructive',
        });
        return;
      }

      if (parseResult.rows.length > 500) {
        toast({
          title: 'Arquivo muito grande',
          description: 'Limite máximo: 500 vendas por arquivo',
          variant: 'destructive',
        });
        return;
      }

      // Validate each row
      const processedRows: ProcessedSaleRow[] = await Promise.all(
        parseResult.rows.map(async (row) => {
          const validation = await validateSaleRow(
            row.data,
            linkedAirlines,
            accounts,
            supplierId || '',
            mode
          );

          return {
            ...row,
            validation,
            status: validation.isValid ? 'valid' : 'invalid',
          };
        })
      );

      setRows(processedRows);
      
      const validCount = processedRows.filter((r) => r.status === 'valid').length;
      const invalidCount = processedRows.filter((r) => r.status === 'invalid').length;
      
      toast({
        title: 'Arquivo processado',
        description: `${validCount} vendas válidas, ${invalidCount} com erros`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (rowNumber: number, updates: Partial<ProcessedSaleRow>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowNumber === rowNumber ? { ...row, ...updates } : row
      )
    );
  };

  const importValidRows = async () => {
    const validRows = rows.filter((r) => r.status === 'valid');
    
    if (validRows.length === 0) {
      toast({
        title: 'Nenhuma venda para importar',
        description: 'Corrija os erros antes de importar',
        variant: 'destructive',
      });
      return;
    }

    if (!supplierId) {
      toast({
        title: 'Erro de configuração',
        description: 'Supplier ID não encontrado',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      try {
        // Converter dados da planilha para formato do saleService
        const saleData = convertRowToSaleData(row);
        
        // Criar venda usando serviço existente (REUTILIZA 100% DA LÓGICA)
        const result = await createSaleWithSegments(saleData, supplierId);
        
        if (result.error) {
          updateRow(row.rowNumber, {
            status: 'error',
            errorMessage: result.error,
          });
          errorCount++;
        } else {
          updateRow(row.rowNumber, { status: 'imported' });
          successCount++;
        }
      } catch (error: any) {
        updateRow(row.rowNumber, {
          status: 'error',
          errorMessage: error.message,
        });
        errorCount++;
      }
    }

    setImporting(false);
    
    toast({
      title: 'Importação concluída',
      description: `${successCount} vendas importadas, ${errorCount} erros`,
      variant: successCount > 0 ? 'default' : 'destructive',
    });
  };

  return {
    file,
    rows,
    parsing,
    importing,
    mode,
    setMode,
    handleFileUpload,
    updateRow,
    importValidRows,
    stats: {
      total: rows.length,
      valid: rows.filter((r) => r.status === 'valid').length,
      invalid: rows.filter((r) => r.status === 'invalid').length,
      imported: rows.filter((r) => r.status === 'imported').length,
      error: rows.filter((r) => r.status === 'error').length,
    },
  };
}

function convertRowToSaleData(row: ProcessedSaleRow): any {
  const data = row.data;
  const resolved = row.validation.resolvedData;
  
  // ✨ Detectar se é importação SIMPLES (tem quantidade_milhas e custo_milheiro)
  const isSimpleImport = data.quantidade_milhas && data.custo_milheiro;
  
  if (isSimpleImport) {
    // ============================================
    // IMPORTAÇÃO SIMPLIFICADA (FATURAMENTO)
    // ============================================
    const qtdMilhas = parseBRNumber(data.quantidade_milhas || '0');
    const custoMilheiro = parseBRNumber(data.custo_milheiro || '0');
    const taxa = data.taxa_embarque_total ? parseBRNumber(data.taxa_embarque_total) : 0;
    const valorTotal = parseBRNumber(data.valor_total || '0');
    
    // Fórmulas da calculadora
    const custoMilhas = (qtdMilhas / 1000) * custoMilheiro;
    const custoTotal = custoMilhas + taxa;
      const lucro = valorTotal - custoTotal;
      let margem = valorTotal > 0 ? (lucro / valorTotal) * 100 : 0;

      // Limitar margem a valores razoáveis (-999% a +999%) para evitar overflow
      if (margem > 999) {
        console.warn(`[Importação] Margem muito alta: ${margem}%. Limitando a 999%`);
        margem = 999;
      } else if (margem < -999) {
        console.warn(`[Importação] Margem muito baixa: ${margem}%. Limitando a -999%`);
        margem = -999;
      }
    
    console.log('[Importação Simples] Cálculo financeiro:', {
      quantidade_milhas: qtdMilhas,
      custo_milheiro: custoMilheiro,
      custo_milhas: custoMilhas.toFixed(2),
      taxa_embarque: taxa.toFixed(2),
      custo_total: custoTotal.toFixed(2),
      valor_total: valorTotal.toFixed(2),
      lucro: lucro.toFixed(2),
      margem: margem.toFixed(2) + '%'
    });
    
    return {
      channel: 'legacy',
      customerName: data.nome_cliente,
      customerCpf: '',
      customerPhone: '',
      passengers: 1,
      tripType: 'one_way' as const,
      flightSegments: [],
      
      // Valores financeiros calculados
      priceTotal: valorTotal,
      boardingFee: taxa,
      totalMilesUsed: qtdMilhas,
      costPerThousand: custoMilheiro,
      totalCost: custoTotal,
      profit: lucro, // Usar 'profit' em vez de 'profitValue'
      profitMargin: margem,
      
      paymentMethod: data.forma_pagamento,
      paymentStatus: data.status_pagamento,
      notes: data.observacoes || '',
      airlineProgram: data.programa_milhas || '',
      localizador: data.localizador || '',
    };
  }
  
  // ============================================
  // IMPORTAÇÃO COMPLETA (DETALHADA)
  // ============================================
  const isCounter = resolved.isCounter;
  const isLegacy = resolved.isLegacyImport;
  
  const channel: 'internal' | 'counter' | 'legacy' = 
    isCounter ? 'counter' : 
    isLegacy ? 'legacy' : 
    'internal';

  const flightSegments: any[] = [];
  
  // Ida (apenas se tiver dados completos)
  if (data.origem && data.destino && data.data_ida && data.milhas_ida) {
    const dataIdaDate = parseBRDate(data.data_ida);
    flightSegments.push({
      from: data.origem,
      to: data.destino,
      date: dataIdaDate ? formatDateToISO(dataIdaDate) : data.data_ida,
      miles: parseBRNumber(data.milhas_ida),
    });
  }
  
  // Volta (se round_trip e dados completos)
  if (data.tipo_viagem === 'round_trip' && data.destino && data.origem && data.data_volta && data.milhas_volta) {
    const dataVoltaDate = parseBRDate(data.data_volta);
    flightSegments.push({
      from: data.destino,
      to: data.origem,
      date: dataVoltaDate ? formatDateToISO(dataVoltaDate) : data.data_volta,
      miles: parseBRNumber(data.milhas_volta),
    });
  }

  const baseData = {
    customerName: data.nome_cliente,
    customerCpf: data.cpf_cliente ? data.cpf_cliente.replace(/\D/g, '') : '',
    customerPhone: data.telefone_cliente || '',
    passengers: data.numero_passageiros ? parseBRNumber(data.numero_passageiros) : 1,
    tripType: (data.tipo_viagem || 'one_way') as 'one_way' | 'round_trip',
    flightSegments,
    boardingFee: data.taxa_embarque_total ? parseBRNumber(data.taxa_embarque_total) : 0,
    priceTotal: parseBRNumber(data.valor_total || '0'),
    paymentMethod: data.forma_pagamento,
    paymentStatus: data.status_pagamento,
    notes: data.observacoes || '',
  };

  // Vendas legadas (modo simples)
  if (channel === 'legacy') {
    return {
      ...baseData,
      channel: 'legacy',
    };
  }
  
  // Vendas internas (modo completo)
  if (channel === 'internal') {
    return {
      ...baseData,
      channel: 'internal',
      accountId: resolved.mileageAccountId || '',
      programId: resolved.airlineCompanyId || '',
    };
  }
  
  // Vendas de balcão
  return {
    ...baseData,
    channel: 'counter',
    sellerName: data.vendedor_balcao,
    sellerContact: data.contato_vendedor_balcao,
    counterCostPerThousand: parseBRNumber(data.custo_mil_milhas_balcao || '0'),
    counterAirlineProgram: data.programa_milhas,
  };
}
