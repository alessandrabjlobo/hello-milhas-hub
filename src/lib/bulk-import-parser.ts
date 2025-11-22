import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { SalesImportTemplate } from './bulk-import-generator';

export interface ParsedSaleRow {
  rowNumber: number;
  data: SalesImportTemplate;
  rawData: any;
}

export interface ParseResult {
  success: boolean;
  rows: ParsedSaleRow[];
  totalRows: number;
  errors: Array<{ row: number; message: string }>;
}

export async function parseSalesFile(file: File): Promise<ParseResult> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (fileExtension === 'csv') {
    return parseCSV(file);
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    return parseXLSX(file);
  } else {
    throw new Error('Formato de arquivo não suportado. Use .csv ou .xlsx');
  }
}

async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data as any[];

        // 🔹 Filtra fora a linha de instruções, caso exista em CSV
        const filtered = rawRows.filter((row) => {
          const dv = String(row.data_venda || '').toUpperCase();
          return dv !== 'OBRIGATÓRIO';
        });

        const rows: ParsedSaleRow[] = filtered.map((row: any, index: number) => ({
          // CSV geralmente tem: linha 1 = cabeçalho
          // então primeira linha de dados é linha 2
          rowNumber: index + 2,
          data: normalizeRowData(row),
          rawData: row,
        }));

        resolve({
          success: true,
          rows,
          totalRows: rows.length,
          errors: [],
        });
      },
      error: (error) => {
        resolve({
          success: false,
          rows: [],
          totalRows: 0,
          errors: [{ row: 0, message: error.message }],
        });
      },
    });
  });
}

async function parseXLSX(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Pegar primeira aba
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converter para JSON (cada objeto = uma linha após o cabeçalho)
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false });

        // 🔹 Remove a linha de instruções (onde data_venda = "OBRIGATÓRIO")
        const filtered = jsonData.filter((row) => {
          const dv = String(row.data_venda || '').toUpperCase();
          return dv !== 'OBRIGATÓRIO';
        });

        const rows: ParsedSaleRow[] = filtered.map((row: any, index: number) => ({
          // Excel:
          // 1 = cabeçalho
          // 2 = instruções ("OBRIGATÓRIO"/"Opcional")
          // 3 = primeira linha de exemplo/dados
          rowNumber: index + 3,
          data: normalizeRowData(row),
          rawData: row,
        }));

        resolve({
          success: true,
          rows,
          totalRows: rows.length,
          errors: [],
        });
      } catch (error: any) {
        resolve({
          success: false,
          rows: [],
          totalRows: 0,
          errors: [{ row: 0, message: error.message }],
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
}

function normalizeRowData(row: any): SalesImportTemplate {
  // ✨ Detectar se é planilha SIMPLES (tem quantidade_milhas + custo_milheiro)
  const isSimpleTemplate = 'quantidade_milhas' in row && 'custo_milheiro' in row;
  
  if (isSimpleTemplate) {
    // PLANILHA SIMPLES (Faturamento)
    return {
      data_venda: String(row.data_venda || '').trim(),
      nome_cliente: String(row.nome_cliente || '').trim(),
      quantidade_milhas: String(row.quantidade_milhas || '').trim(),
      custo_milheiro: String(row.custo_milheiro || '').trim(),
      taxa_embarque_total: String(row.taxa_embarque_total || '').trim(),
      valor_total: String(row.valor_total || '').trim(),
      forma_pagamento: String(row.forma_pagamento || '').trim().toLowerCase(),
      status_pagamento: String(row.status_pagamento || '').trim().toLowerCase(),
      programa_milhas: String(row.programa_milhas || '').trim().toUpperCase(),
      localizador: String(row.localizador || '').trim().toUpperCase(),
      observacoes: String(row.observacoes || '').trim(),
      
      // Campos não presentes na planilha simples
      cpf_cliente: '',
      telefone_cliente: '',
      numero_conta: '',
      tipo_viagem: 'one_way',
      origem: '',
      destino: '',
      data_ida: '',
      data_volta: '',
      milhas_ida: '',
      milhas_volta: '',
      numero_passageiros: '1',
      custo_mil_milhas_balcao: '',
      vendedor_balcao: '',
      contato_vendedor_balcao: '',
    };
  }
  
  // PLANILHA COMPLETA (estrutura original)
  // Compatibilidade: se não tiver quantidade_milhas mas tiver milhas_ida/volta
  let quantidadeMilhas = String(row.quantidade_milhas || '').trim();
  if (!quantidadeMilhas && (row.milhas_ida || row.milhas_volta)) {
    const ida = parseFloat(String(row.milhas_ida || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const volta = parseFloat(String(row.milhas_volta || '0').replace(/\./g, '').replace(',', '.')) || 0;
    quantidadeMilhas = String(ida + volta);
  }
  
  let custoMilheiro = String(row.custo_milheiro || '').trim();
  if (!custoMilheiro && row.custo_mil_milhas_balcao) {
    custoMilheiro = String(row.custo_mil_milhas_balcao).trim();
  }
  
  return {
    data_venda: String(row.data_venda || '').trim(),
    nome_cliente: String(row.nome_cliente || '').trim(),
    cpf_cliente: String(row.cpf_cliente || '').trim(),
    telefone_cliente: String(row.telefone_cliente || '').trim(),
    programa_milhas: String(row.programa_milhas || '').trim().toUpperCase(),
    numero_conta: String(row.numero_conta || '').trim(),
    tipo_viagem: String(row.tipo_viagem || '').trim().toLowerCase(),
    origem: String(row.origem || '').trim().toUpperCase(),
    destino: String(row.destino || '').trim().toUpperCase(),
    data_ida: String(row.data_ida || '').trim(),
    data_volta: String(row.data_volta || '').trim(),
    milhas_ida: String(row.milhas_ida || '').trim(),
    milhas_volta: String(row.milhas_volta || '').trim(),
    numero_passageiros: String(row.numero_passageiros || '').trim(),
    taxa_embarque_total: String(row.taxa_embarque_total || '').trim(),
    valor_total: String(row.valor_total || '').trim(),
    forma_pagamento: String(row.forma_pagamento || '').trim().toLowerCase(),
    status_pagamento: String(row.status_pagamento || '').trim().toLowerCase(),
    localizador: String(row.localizador || '').trim().toUpperCase(),
    observacoes: String(row.observacoes || '').trim(),
    custo_mil_milhas_balcao: String(row.custo_mil_milhas_balcao || '').trim(),
    vendedor_balcao: String(row.vendedor_balcao || '').trim(),
    contato_vendedor_balcao: String(row.contato_vendedor_balcao || '').trim(),
    
    // Campos calculados/mapeados
    quantidade_milhas: quantidadeMilhas,
    custo_milheiro: custoMilheiro,
  };
}
