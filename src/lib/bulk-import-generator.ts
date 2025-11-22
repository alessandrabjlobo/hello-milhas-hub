import * as XLSX from 'xlsx';

// ============================================
// Interface SIMPLIFICADA (Faturamento)
// ============================================
export interface SalesImportSimple {
  data_venda: string;
  nome_cliente: string;
  quantidade_milhas: string;     // ✨ Total de milhas
  custo_milheiro: string;         // ✨ Custo por 1.000
  taxa_embarque_total: string;
  valor_total: string;
  forma_pagamento: string;
  status_pagamento: string;
  programa_milhas: string;
  localizador: string;
  observacoes: string;
}

// ============================================
// Interface COMPLETA (Detalhada)
// ============================================
export interface SalesImportComplete {
  data_venda: string;
  nome_cliente: string;
  cpf_cliente: string;
  telefone_cliente: string;
  programa_milhas: string;
  numero_conta: string;
  tipo_viagem: string;
  origem: string;
  destino: string;
  data_ida: string;
  data_volta: string;
  milhas_ida: string;
  milhas_volta: string;
  numero_passageiros: string;
  taxa_embarque_total: string;
  valor_total: string;
  forma_pagamento: string;
  status_pagamento: string;
  localizador: string;
  observacoes: string;
  custo_mil_milhas_balcao: string;
  vendedor_balcao: string;
  contato_vendedor_balcao: string;
}

// Type unificado para compatibilidade com parser/validator
export type SalesImportTemplate = SalesImportSimple & Partial<SalesImportComplete>;

// ============================================
// CAMPOS OBRIGATÓRIOS - MODO SIMPLES
// ============================================
const REQUIRED_FIELDS_SIMPLE: (keyof SalesImportSimple)[] = [
  "data_venda",
  "nome_cliente",
  "quantidade_milhas",
  "custo_milheiro",
  "valor_total",
  "forma_pagamento",
  "status_pagamento",
];

// ============================================
// ORDEM DAS COLUNAS - MODO SIMPLES
// ============================================
const HEADER_KEYS_SIMPLE: (keyof SalesImportSimple)[] = [
  "data_venda",
  "nome_cliente",
  "quantidade_milhas",
  "custo_milheiro",
  "taxa_embarque_total",
  "valor_total",
  "forma_pagamento",
  "status_pagamento",
  "programa_milhas",
  "localizador",
  "observacoes",
];

// ============================================
// ORDEM DAS COLUNAS - MODO COMPLETO
// ============================================
const HEADER_KEYS_COMPLETE: (keyof SalesImportComplete)[] = [
  "data_venda",
  "nome_cliente",
  "cpf_cliente",
  "telefone_cliente",
  "programa_milhas",
  "numero_conta",
  "tipo_viagem",
  "origem",
  "destino",
  "data_ida",
  "data_volta",
  "milhas_ida",
  "milhas_volta",
  "numero_passageiros",
  "taxa_embarque_total",
  "valor_total",
  "forma_pagamento",
  "status_pagamento",
  "localizador",
  "observacoes",
  "custo_mil_milhas_balcao",
  "vendedor_balcao",
  "contato_vendedor_balcao",
];

// ============================================
// GERADOR DE TEMPLATE SIMPLIFICADO
// ============================================
export function generateSimpleTemplate(format: 'csv' | 'xlsx' = 'xlsx') {
  const exampleRow: SalesImportSimple = {
    data_venda: new Date().toLocaleDateString('pt-BR'),
    nome_cliente: 'João da Silva',
    quantidade_milhas: '25.000',
    custo_milheiro: '18,50',
    taxa_embarque_total: '320,00',
    valor_total: '1.850,00',
    forma_pagamento: 'pix',
    status_pagamento: 'paid',
    programa_milhas: 'LATAM',
    localizador: 'ABC123',
    observacoes: 'Cliente preferencial',
  };

  const instructionsRow = {} as SalesImportSimple;
  HEADER_KEYS_SIMPLE.forEach((key) => {
    (instructionsRow as any)[key] = REQUIRED_FIELDS_SIMPLE.includes(key)
      ? "OBRIGATÓRIO"
      : "Opcional";
  });

  const emptyRow: SalesImportSimple = {
    data_venda: '',
    nome_cliente: '',
    quantidade_milhas: '',
    custo_milheiro: '',
    taxa_embarque_total: '',
    valor_total: '',
    forma_pagamento: '',
    status_pagamento: '',
    programa_milhas: '',
    localizador: '',
    observacoes: '',
  };

  const data: SalesImportSimple[] = [
    instructionsRow,
    exampleRow,
    emptyRow,
    emptyRow,
  ];

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(data, { header: HEADER_KEYS_SIMPLE as string[] });
    
    worksheet['!cols'] = [
      { wch: 15 }, // data_venda
      { wch: 25 }, // nome_cliente
      { wch: 18 }, // quantidade_milhas
      { wch: 15 }, // custo_milheiro
      { wch: 18 }, // taxa_embarque_total
      { wch: 15 }, // valor_total
      { wch: 18 }, // forma_pagamento
      { wch: 18 }, // status_pagamento
      { wch: 20 }, // programa_milhas
      { wch: 15 }, // localizador
      { wch: 30 }, // observacoes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');

    XLSX.writeFile(workbook, `modelo-importacao-faturamento.xlsx`);
  } else {
    const worksheet = XLSX.utils.json_to_sheet(data, { header: HEADER_KEYS_SIMPLE as string[] });
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo-importacao-faturamento.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// ============================================
// GERADOR DE TEMPLATE COMPLETO
// ============================================
export function generateCompleteTemplate(format: 'csv' | 'xlsx' = 'xlsx') {
  const exampleRow: SalesImportComplete = {
    data_venda: new Date().toLocaleDateString('pt-BR'),
    nome_cliente: 'João da Silva',
    cpf_cliente: '123.456.789-00',
    telefone_cliente: '(11) 98765-4321',
    programa_milhas: 'LATAM',
    numero_conta: '123456789',
    tipo_viagem: 'round_trip',
    origem: 'GRU',
    destino: 'GIG',
    data_ida: '01/12/2024',
    data_volta: '10/12/2024',
    milhas_ida: '12.500',
    milhas_volta: '12.500',
    numero_passageiros: '2',
    taxa_embarque_total: '320,00',
    valor_total: '1.850,00',
    forma_pagamento: 'pix',
    status_pagamento: 'paid',
    localizador: 'ABC123',
    observacoes: 'Cliente preferencial',
    custo_mil_milhas_balcao: '',
    vendedor_balcao: '',
    contato_vendedor_balcao: '',
  };

  const instructionsRow = {} as SalesImportComplete;
  HEADER_KEYS_COMPLETE.forEach((key) => {
    // No modo completo, mais campos são obrigatórios
    const isRequired = [
      "data_venda",
      "nome_cliente",
      "cpf_cliente",
      "programa_milhas",
      "tipo_viagem",
      "origem",
      "destino",
      "data_ida",
      "milhas_ida",
      "numero_passageiros",
      "valor_total",
      "forma_pagamento",
      "status_pagamento",
    ].includes(key);
    
    (instructionsRow as any)[key] = isRequired ? "OBRIGATÓRIO" : "Opcional";
  });

  const emptyRow: SalesImportComplete = {
    data_venda: '',
    nome_cliente: '',
    cpf_cliente: '',
    telefone_cliente: '',
    programa_milhas: '',
    numero_conta: '',
    tipo_viagem: '',
    origem: '',
    destino: '',
    data_ida: '',
    data_volta: '',
    milhas_ida: '',
    milhas_volta: '',
    numero_passageiros: '',
    taxa_embarque_total: '',
    valor_total: '',
    forma_pagamento: '',
    status_pagamento: '',
    localizador: '',
    observacoes: '',
    custo_mil_milhas_balcao: '',
    vendedor_balcao: '',
    contato_vendedor_balcao: '',
  };

  const data: SalesImportComplete[] = [
    instructionsRow,
    exampleRow,
    emptyRow,
    emptyRow,
  ];

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(data, { header: HEADER_KEYS_COMPLETE as string[] });
    
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 15 },
      { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 30 },
      { wch: 22 }, { wch: 20 }, { wch: 25 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');

    XLSX.writeFile(workbook, `modelo-importacao-completa.xlsx`);
  } else {
    const worksheet = XLSX.utils.json_to_sheet(data, { header: HEADER_KEYS_COMPLETE as string[] });
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo-importacao-completa.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
