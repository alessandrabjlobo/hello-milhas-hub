import { useState } from 'react';
import { parseSalesFile, type ParsedSaleRow } from '@/lib/bulk-import-parser';
import {
  validateSaleRow,
  type ValidationResult,
} from '@/lib/bulk-import-validator';
import { createSaleWithSegments } from '@/services/saleService';
import { useMileageAccounts } from './useMileageAccounts';
import { useSupplierAirlines } from './useSupplierAirlines';
import { useUserRole } from './useUserRole';
import { useToast } from './use-toast';
import {
  parseBRNumber,
  parseBRDate,
  formatDateToISO,
} from '@/lib/bulk-import-helpers';
import { supabase } from '@/integrations/supabase/client';

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
  const [mode, setMode] = useState<'simple' | 'full'>('simple');

  const { accounts } = useMileageAccounts();
  const { supplierId } = useUserRole();
  const { linkedAirlines } = useSupplierAirlines(supplierId);
  const { toast } = useToast();

  const handleFileUpload = async (uploadedFile: File) => {
    try {
      setParsing(true);
      setFile(uploadedFile);

      const parseResult = await parseSalesFile(uploadedFile);

      if (!parseResult.success) {
        toast({
          title: 'Erro ao processar arquivo',
          description:
            parseResult.errors[0]?.message || 'Erro desconhecido ao ler arquivo',
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

  const ensureAirlineExists = async (
    airlineCode: string,
    supplierId: string
  ): Promise<string | null> => {
    if (!airlineCode) return null;

    const code = airlineCode.trim().toUpperCase();

    const { data: existing } = await supabase
      .from('airline_companies')
      .select('id')
      .eq('code', code)
      .eq('supplier_id', supplierId)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newAirline, error } = await supabase
      .from('airline_companies')
      .insert({
        supplier_id: supplierId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        code,
        name: code,
        cpf_limit: 25,
        renewal_type: 'annual',
        cost_per_mile: 0.029,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Erro ao criar companhia ${code}:`, error);
      return null;
    }

    await supabase.from('suppliers_airlines').insert({
      supplier_id: supplierId,
      airline_company_id: newAirline.id,
    });

    console.log(`✅ Companhia ${code} cadastrada automaticamente`);
    return newAirline.id;
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
    const newAirlines = new Set<string>();
    const salesWithLocalizador: Array<{
      saleId: string;
      customerName: string;
      localizador: string;
    }> = [];

    for (const row of validRows) {
      try {
        if (row.data.programa_milhas) {
          const airlineId = await ensureAirlineExists(
            row.data.programa_milhas,
            supplierId
          );

          if (airlineId && !row.validation.resolvedData.airlineCompanyId) {
            row.validation.resolvedData.airlineCompanyId = airlineId;
            row.validation.resolvedData.airlineName = row.data.programa_milhas;
            newAirlines.add(row.data.programa_milhas);
          }
        }

        const saleData = convertRowToSaleData(row);

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

          if (row.data.localizador && result.saleId) {
            salesWithLocalizador.push({
              saleId: result.saleId,
              customerName: row.data.nome_cliente,
              localizador: row.data.localizador,
            });
          }
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

    if (newAirlines.size > 0) {
      toast({
        title: 'Companhias cadastradas automaticamente',
        description: `${Array.from(
          newAirlines
        ).join(', ')}. Configure limites e regras em "Minhas Companhias".`,
      });
    }

    if (salesWithLocalizador.length > 0) {
      toast({
        title: `${salesWithLocalizador.length} venda(s) com localizador`,
        description:
          'Você pode criar as passagens automaticamente. Confira na tela de revisão.',
      });
    }

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

// ==========================================================
// Conversão da linha da planilha para o formato do saleService
// ==========================================================

function convertRowToSaleData(row: ProcessedSaleRow): any {
  const data = row.data;
  const resolved = row.validation.resolvedData;

  // 🔹 NOVO: só considera "simples" quando NÃO há dados de rota/segmento
  const hasRouteInfo =
    !!data.origem ||
    !!data.destino ||
    !!data.data_ida ||
    !!data.data_volta ||
    !!data.milhas_ida ||
    !!data.milhas_volta;

  const isSimpleImport =
    !!(data.quantidade_milhas && data.custo_milheiro) && !hasRouteInfo;

  if (isSimpleImport) {
    const qtdMilhas = parseBRNumber(data.quantidade_milhas || '0');
    const custoMilheiro = parseBRNumber(data.custo_milheiro || '0');
    const taxa = data.taxa_embarque_total
      ? parseBRNumber(data.taxa_embarque_total)
      : 0;
    const valorTotal = parseBRNumber(data.valor_total || '0');

    const custoMilhas = (qtdMilhas / 1000) * custoMilheiro;
    const custoTotal = custoMilhas + taxa;
    const lucro = valorTotal - custoTotal;

    let margem = 0;
    if (valorTotal > 0 && isFinite(lucro)) {
      margem = (lucro / valorTotal) * 100;
    }

    const vendaDate = data.data_venda ? parseBRDate(data.data_venda) : null;

    console.log('[Importação Simples] Cálculo financeiro:', {
      quantidade_milhas: qtdMilhas,
      custo_milheiro: custoMilheiro,
      custo_milhas: custoMilhas.toFixed(2),
      taxa_embarque: taxa.toFixed(2),
      custo_total: custoTotal.toFixed(2),
      valor_total: valorTotal.toFixed(2),
      lucro: lucro.toFixed(2),
      margem: margem.toFixed(2) + '%',
    });

    return {
      channel: 'legacy',
      customerName: data.nome_cliente,
      customerCpf: '',
      customerPhone: '',
      passengers: 1,
      tripType: 'one_way' as const,
      flightSegments: [],

      priceTotal: valorTotal,
      boardingFee: taxa,
      totalMilesUsed: qtdMilhas,
      costPerThousand: custoMilheiro,
      totalCost: custoTotal,
      profit: lucro,
      profitMargin: margem,
      saleDate: vendaDate ? formatDateToISO(vendaDate) : undefined,

      paymentMethod: data.forma_pagamento,
      paymentStatus: data.status_pagamento,
      notes: data.observacoes || '',
      airlineProgram: data.programa_milhas || '',
      localizador: data.localizador || '',
    };
  }

  // Importação completa (detalhada)
  const hasCounterData = !!(data.custo_mil_milhas_balcao || data.vendedor_balcao);
  const isCounter = hasCounterData || resolved.isCounter;
  const isLegacy = resolved.isLegacyImport;

  const channel: 'internal' | 'counter' | 'legacy' = isCounter
    ? 'counter'
    : isLegacy
    ? 'legacy'
    : 'internal';

  const flightSegments: any[] = [];

  if (data.origem && data.destino && data.data_ida && data.milhas_ida) {
    const dataIdaDate = parseBRDate(data.data_ida);
    flightSegments.push({
      from: data.origem,
      to: data.destino,
      date: dataIdaDate ? formatDateToISO(dataIdaDate) : data.data_ida,
      miles: parseBRNumber(data.milhas_ida),
    });
  }

  if (
    data.tipo_viagem === 'round_trip' &&
    data.destino &&
    data.origem &&
    data.data_volta &&
    data.milhas_volta
  ) {
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
    passengers: data.numero_passageiros
      ? parseBRNumber(data.numero_passageiros)
      : 1,
    tripType: (data.tipo_viagem || 'one_way') as 'one_way' | 'round_trip',
    flightSegments,
    boardingFee: data.taxa_embarque_total
      ? parseBRNumber(data.taxa_embarque_total)
      : 0,
    priceTotal: parseBRNumber(data.valor_total || '0'),
    paymentMethod: data.forma_pagamento,
    paymentStatus: data.status_pagamento,
    notes: data.observacoes || '',
    airlineProgram: data.programa_milhas || '',
    localizador: data.localizador || '',
  };

  if (channel === 'legacy') {
    return {
      ...baseData,
      channel: 'legacy',
    };
  }

  if (channel === 'internal') {
    return {
      ...baseData,
      channel: 'internal',
      accountId: resolved.mileageAccountId || '',
      programId: resolved.airlineCompanyId || '',
    };
  }

  // Balcão (counter)
  return {
    ...baseData,
    channel: 'counter',
    sellerName: data.vendedor_balcao || 'Vendedor Externo',
    sellerContact: data.contato_vendedor_balcao || '',
    counterCostPerThousand: parseBRNumber(data.custo_mil_milhas_balcao || '0'),
    counterAirlineProgram: data.programa_milhas || '',
  };
}
