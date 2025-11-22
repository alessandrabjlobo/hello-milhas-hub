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
            supplierId || ''
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

function convertRowToSaleData(row: ProcessedSaleRow): SaleFormData {
  const data = row.data;
  const resolved = row.validation.resolvedData;
  
  // Determinar canal (interno ou balcão)
  const channel = resolved.isCounter ? 'balcao' : 'internal';
  
  // Montar segmentos de voo
  const flightSegments: any[] = [];
  
  // Ida
  const dataIdaDate = parseBRDate(data.data_ida);
  flightSegments.push({
    from: data.origem,
    to: data.destino,
    date: dataIdaDate ? formatDateToISO(dataIdaDate) : data.data_ida,
    miles: parseBRNumber(data.milhas_ida),
  });
  
  // Volta (se round_trip)
  if (data.tipo_viagem === 'round_trip' && data.data_volta && data.milhas_volta) {
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
    customerCpf: data.cpf_cliente.replace(/\D/g, ''),
    customerPhone: data.telefone_cliente,
    passengers: parseBRNumber(data.numero_passageiros),
    tripType: data.tipo_viagem as 'one_way' | 'round_trip',
    flightSegments,
    paymentMethod: data.forma_pagamento,
    notes: data.observacoes,
  };

  if (channel === 'internal') {
    return {
      ...baseData,
      channel: 'internal',
      accountId: resolved.mileageAccountId || '',
      programId: resolved.airlineCompanyId || '',
    };
  } else {
    return {
      ...baseData,
      channel: 'balcao',
      sellerName: data.vendedor_balcao,
      sellerContact: data.contato_vendedor_balcao,
      counterCostPerThousand: parseBRNumber(data.custo_mil_milhas_balcao),
    };
  }
}
