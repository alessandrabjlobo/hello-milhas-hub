import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { SalesImportTemplate } from "./bulk-import-generator";
import { parseBRNumber } from "./bulk-import-helpers";

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
  const fileExtension = file.name.split(".").pop()?.toLowerCase();

  if (fileExtension === "csv") {
    return parseCSV(file);
  } else if (fileExtension === "xlsx" || fileExtension === "xls") {
    return parseXLSX(file);
  } else {
    throw new Error("Formato de arquivo não suportado. Use .csv ou .xlsx");
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
          const dv = String(row.data_venda || "").toUpperCase();
          return dv !== "OBRIGATÓRIO";
        });

        const rows: ParsedSaleRow[] = filtered.map((row: any, index: number) => ({
          // CSV geralmente tem: linha 1 = cabeçalho, então primeira linha de dados é linha 2
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
        const workbook = XLSX.read(data, { type: "array" });

        // Pegar primeira aba
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
          raw: false, // deixa o XLSX já formatar datas
          defval: "", // células vazias viram string vazia
        });

        // 🔹 Remove a linha de instruções (onde data_venda = "OBRIGATÓRIO")
        const filtered = jsonData.filter((row) => {
          const dv = String(row.data_venda || "").toUpperCase();
          return dv !== "OBRIGATÓRIO";
        });

        const rows: ParsedSaleRow[] = filtered.map((row: any, index: number) => ({
          // Excel: 1 = cabeçalho, 2 = instruções, 3 = primeira linha de exemplo/dados
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

/**
 * Normaliza uma célula de data do Excel para string "DD/MM/YYYY"
 * Aceita:
 *  - "21/11/2025"
 *  - "21/11/2025 00:00:00"
 *  - "2025-11-21"
 *  - "2025-11-21T00:00:00.000Z"
 *  - número serial (45876)
 */
function normalizeDateCell(value: any): string {
  if (value === null || value === undefined || value === "") return "";

  // Se vier como string, tenta detectar formatos conhecidos
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "";

    // Já no formato BR
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

    // BR com hora -> pega só a parte antes do espaço
    const firstPart = raw.split(" ")[0];
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(firstPart)) return firstPart;

    // ISO (YYYY-MM-DD ou com tempo)
    const isoMatch = firstPart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d}/${m}/${y}`;
    }

    return raw; // fallback: devolve como está
  }

  // Se vier como Date
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    const d = value.getDate().toString().padStart(2, "0");
    const m = (value.getMonth() + 1).toString().padStart(2, "0");
    const y = value.getFullYear().toString();
    return `${d}/${m}/${y}`;
  }

  // Possível número serial do Excel
  const num = Number(value);
  if (!isNaN(num) && isFinite(num) && num > 30000 && num < 60000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + num * 24 * 60 * 60 * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    const day = d.getUTCDate().toString().padStart(2, "0");
    const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = d.getUTCFullYear().toString();
    return `${day}/${month}/${year}`;
  }

  // Último fallback
  return String(value);
}

function normalizeRowData(row: any): SalesImportTemplate {
  // ✨ Detectar se é planilha SIMPLES (tem quantidade_milhas + custo_milheiro)
  const isSimpleTemplate = "quantidade_milhas" in row && "custo_milheiro" in row;

  if (isSimpleTemplate) {
    // PLANILHA SIMPLES (Faturamento)
    return {
      data_venda: normalizeDateCell(row.data_venda),
      nome_cliente: String(row.nome_cliente || "").trim(),
      quantidade_milhas: String(parseBRNumber(row.quantidade_milhas || "0")),
      custo_milheiro: String(parseBRNumber(row.custo_milheiro || "0")),
      taxa_embarque_total: String(parseBRNumber(row.taxa_embarque_total || "0")),
      valor_total: String(parseBRNumber(row.valor_total || "0")),
      forma_pagamento: String(row.forma_pagamento || "").trim().toLowerCase(),
      status_pagamento: String(row.status_pagamento || "").trim().toLowerCase(),
      programa_milhas: String(row.programa_milhas || "").trim().toUpperCase(),
      localizador: String(row.localizador || "").trim().toUpperCase(),
      observacoes: String(row.observacoes || "").trim(),

      // Campos não presentes na planilha simples
      cpf_cliente: "",
      telefone_cliente: "",
      numero_conta: "",
      tipo_viagem: "one_way",
      origem: "",
      destino: "",
      data_ida: "",
      data_volta: "",
      milhas_ida: "",
      milhas_volta: "",
      numero_passageiros: "1",
      custo_mil_milhas_balcao: "",
      vendedor_balcao: "",
      contato_vendedor_balcao: "",
    };
  }

  // PLANILHA COMPLETA (estrutura original)
  // Compatibilidade: se não tiver quantidade_milhas mas tiver milhas_ida/volta
  let quantidadeMilhas = String(row.quantidade_milhas || "").trim();
  if (!quantidadeMilhas && (row.milhas_ida || row.milhas_volta)) {
    const ida = parseBRNumber(row.milhas_ida || "0");
    const volta = parseBRNumber(row.milhas_volta || "0");
    quantidadeMilhas = String(ida + volta);
  } else if (quantidadeMilhas) {
    quantidadeMilhas = String(parseBRNumber(quantidadeMilhas));
  }

  let custoMilheiro = String(row.custo_milheiro || "").trim();
  if (!custoMilheiro && row.custo_mil_milhas_balcao) {
    custoMilheiro = String(parseBRNumber(row.custo_mil_milhas_balcao));
  } else if (custoMilheiro) {
    custoMilheiro = String(parseBRNumber(custoMilheiro));
  }

  return {
    data_venda: normalizeDateCell(row.data_venda),
    nome_cliente: String(row.nome_cliente || "").trim(),
    cpf_cliente: String(row.cpf_cliente || "").trim(),
    telefone_cliente: String(row.telefone_cliente || "").trim(),
    programa_milhas: String(row.programa_milhas || "").trim().toUpperCase(),
    numero_conta: String(row.numero_conta || "").trim(),
    tipo_viagem: String(row.tipo_viagem || "").trim().toLowerCase(),
    origem: String(row.origem || "").trim().toUpperCase(),
    destino: String(row.destino || "").trim().toUpperCase(),
    data_ida: normalizeDateCell(row.data_ida),
    data_volta: normalizeDateCell(row.data_volta),
    milhas_ida: String(parseBRNumber(row.milhas_ida || "0")),
    milhas_volta: String(parseBRNumber(row.milhas_volta || "0")),
    numero_passageiros: String(row.numero_passageiros || "").trim(),
    taxa_embarque_total: String(parseBRNumber(row.taxa_embarque_total || "0")),
    valor_total: String(parseBRNumber(row.valor_total || "0")),
    forma_pagamento: String(row.forma_pagamento || "").trim().toLowerCase(),
    status_pagamento: String(row.status_pagamento || "").trim().toLowerCase(),
    localizador: String(row.localizador || "").trim().toUpperCase(),
    observacoes: String(row.observacoes || "").trim(),
    custo_mil_milhas_balcao: String(parseBRNumber(row.custo_mil_milhas_balcao || "0")),
    vendedor_balcao: String(row.vendedor_balcao || "").trim(),
    contato_vendedor_balcao: String(row.contato_vendedor_balcao || "").trim(),

    // Campos calculados/mapeados
    quantidade_milhas: quantidadeMilhas,
    custo_milheiro: custoMilheiro,
  };
}
