import * as XLSX from 'xlsx';

export interface SalesImportTemplate {
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

// 🔹 Campos obrigatórios no modo simplificado
const REQUIRED_FIELDS_SIMPLE: (keyof SalesImportTemplate)[] = [
  "data_venda",
  "nome_cliente",
  "valor_total",
  "forma_pagamento",
  "status_pagamento",
];

// 🔹 Ordem das colunas (deve bater com a interface e com o JSON gerado)
const HEADER_KEYS: (keyof SalesImportTemplate)[] = [
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

// 🔹 Converte índice de coluna (0-based) para letra Excel (A, B, C... AA, AB...)
function colIndexToLetter(index: number): string {
  let s = "";
  let n = index + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function generateSalesImportTemplate(format: 'csv' | 'xlsx' = 'xlsx') {
  // Exemplo de linha preenchida (para referência)
  const exampleRow: SalesImportTemplate = {
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

  // Linhas vazias para preenchimento
  const emptyRow: SalesImportTemplate = {
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

  const data = [exampleRow, emptyRow, emptyRow, emptyRow];

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Configurar larguras das colunas
    worksheet['!cols'] = [
      { wch: 15 }, // data_venda
      { wch: 25 }, // nome_cliente
      { wch: 20 }, // cpf_cliente
      { wch: 20 }, // telefone_cliente
      { wch: 20 }, // programa_milhas
      { wch: 15 }, // numero_conta
      { wch: 15 }, // tipo_viagem
      { wch: 10 }, // origem
      { wch: 10 }, // destino
      { wch: 15 }, // data_ida
      { wch: 15 }, // data_volta
      { wch: 12 }, // milhas_ida
      { wch: 12 }, // milhas_volta
      { wch: 15 }, // numero_passageiros
      { wch: 18 }, // taxa_embarque_total
      { wch: 15 }, // valor_total
      { wch: 18 }, // forma_pagamento
      { wch: 18 }, // status_pagamento
      { wch: 15 }, // localizador
      { wch: 30 }, // observacoes
      { wch: 22 }, // custo_mil_milhas_balcao
      { wch: 20 }, // vendedor_balcao
      { wch: 25 }, // contato_vendedor_balcao
    ];

    // 🔴 Destacar com cor os campos obrigatórios (modo simplificado)
    HEADER_KEYS.forEach((key, index) => {
      const colLetter = colIndexToLetter(index);
      const cellRef = `${colLetter}1`; // linha 1 = cabeçalho
      const cell = worksheet[cellRef];

      if (!cell) return;

      // Garante que existe o objeto de estilo
      (cell as any).s = (cell as any).s || {};

      // Header sempre em negrito
      (cell as any).s.font = {
        ...(cell as any).s.font,
        bold: true,
      };

      // Se for campo obrigatório no modo simplificado, aplica cor de destaque
      if (REQUIRED_FIELDS_SIMPLE.includes(key)) {
        (cell as any).s.fill = {
          patternType: "solid",
          fgColor: { rgb: "FFFDE9E9" }, // fundo levemente rosado
        };
        (cell as any).s.font = {
          ...(cell as any).s.font,
          color: { rgb: "FFB00000" }, // texto vermelho escuro
          bold: true,
        };
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');

    XLSX.writeFile(workbook, `modelo-importacao-vendas.xlsx`);
  } else {
    // CSV (sem estilos)
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo-importacao-vendas.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
