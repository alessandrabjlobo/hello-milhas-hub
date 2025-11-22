import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';

interface BulkImportInstructionsProps {
  mode: "simple" | "full";
}

export function BulkImportInstructions({ mode }: BulkImportInstructionsProps) {
  const fieldsSimple = [
    {
      name: "data_venda",
      description: "Data em que a venda foi fechada",
      required: true,
      format: "DD/MM/YYYY",
      example: "21/11/2025",
      notes: "",
    },
    {
      name: "nome_cliente",
      description: "Nome do cliente principal da venda",
      required: true,
      format: "Texto",
      example: "João da Silva",
      notes: "",
    },
    {
      name: "quantidade_milhas",
      description: "Total de milhas usadas na emissão (somando ida, volta e trechos)",
      required: true,
      format: "Número (pode usar ponto ou vírgula)",
      example: "25.000 ou 25000",
      notes: "Se a viagem tem ida 12.500 + volta 12.500, coloque 25.000 aqui",
    },
    {
      name: "custo_milheiro",
      description: "Custo de 1.000 milhas para a agência, em reais",
      required: true,
      format: "Número decimal (use vírgula: 18,50)",
      example: "18,50",
      notes: "Este é o valor que você PAGA por cada 1.000 milhas",
    },
    {
      name: "taxa_embarque_total",
      description: "Valor TOTAL das taxas de embarque de todos os passageiros",
      required: false,
      format: "Número decimal (use vírgula)",
      example: "320,00",
      notes: "Recomendável preencher. Se vazio, sistema considera R$ 0,00",
    },
    {
      name: "valor_total",
      description: "Valor total cobrado do cliente (milhas + taxas)",
      required: true,
      format: "Número decimal (use vírgula)",
      example: "1.850,00",
      notes: "",
    },
    {
      name: "forma_pagamento",
      description: "Forma de pagamento utilizada",
      required: true,
      format: "pix, credit_card, debit_card, boleto",
      example: "pix",
      notes: "",
    },
    {
      name: "status_pagamento",
      description: "Status do pagamento da venda",
      required: true,
      format: "pending, partial, paid",
      example: "paid",
      notes: "pending = pendente | partial = parcial | paid = pago",
    },
    {
      name: "programa_milhas",
      description: "Programa de milhagem usado (apenas referência)",
      required: false,
      format: "Texto (código ou nome)",
      example: "LATAM, SMILES, AZUL, TAP",
      notes: "Opcional. Não precisa de conta cadastrada no modo simplificado",
    },
    {
      name: "localizador",
      description: "Código localizador da reserva (PNR)",
      required: false,
      format: "Texto",
      example: "ABC123",
      notes: "Pode ser usado para detectar duplicidades",
    },
    {
      name: "observacoes",
      description: "Observações adicionais sobre a venda",
      required: false,
      format: "Texto livre",
      example: "Cliente preferencial",
      notes: "",
    },
  ];
  
  const fieldsComplete = [
    {
      name: "data_venda",
      description: "Data em que a venda foi fechada",
      required: true,
      format: "DD/MM/YYYY",
      example: "21/11/2025",
      notes: "",
    },
    {
      name: "nome_cliente",
      description: "Nome do cliente principal da venda",
      required: true,
      format: "Texto",
      example: "João da Silva",
      notes: "",
    },
    {
      name: "cpf_cliente",
      description: "CPF do cliente",
      required: true,
      format: "Apenas números ou com formatação (123.456.789-00)",
      example: "12345678900 ou 123.456.789-00",
      notes: "Obrigatório no modo completo",
    },
    {
      name: "telefone_cliente",
      description: "Telefone de contato do cliente",
      required: false,
      format: "Qualquer formato",
      example: "(11) 98765-4321",
      notes: "",
    },
    {
      name: "programa_milhas",
      description: "Programa de milhagem cadastrado no sistema",
      required: true,
      format: "Nome ou código do programa",
      example: "LATAM, SMILES, AZUL, TAP",
      notes: "Deve existir no cadastro de programas",
    },
    {
      name: "numero_conta",
      description: "Número da conta de milhas no sistema",
      required: false,
      format: "Número da conta",
      example: "123456789",
      notes: "Se preenchido, deve existir cadastrada",
    },
    {
      name: "tipo_viagem",
      description: "Tipo de viagem: somente ida ou ida e volta",
      required: true,
      format: "one_way ou round_trip",
      example: "round_trip",
      notes: "one_way = somente ida | round_trip = ida e volta",
    },
    {
      name: "origem",
      description: "Código do aeroporto de origem",
      required: true,
      format: "Código IATA de 3 letras",
      example: "GRU",
      notes: "",
    },
    {
      name: "destino",
      description: "Código do aeroporto de destino",
      required: true,
      format: "Código IATA de 3 letras",
      example: "GIG",
      notes: "",
    },
    {
      name: "data_ida",
      description: "Data do voo de ida",
      required: true,
      format: "DD/MM/YYYY",
      example: "01/12/2024",
      notes: "",
    },
    {
      name: "data_volta",
      description: "Data do voo de volta",
      required: false,
      format: "DD/MM/YYYY",
      example: "10/12/2024",
      notes: "Obrigatório se tipo_viagem = round_trip",
    },
    {
      name: "milhas_ida",
      description: "Quantidade de milhas do voo de ida",
      required: true,
      format: "Número",
      example: "12.500 ou 12500",
      notes: "",
    },
    {
      name: "milhas_volta",
      description: "Quantidade de milhas do voo de volta",
      required: false,
      format: "Número",
      example: "12.500 ou 12500",
      notes: "Obrigatório se tipo_viagem = round_trip",
    },
    {
      name: "numero_passageiros",
      description: "Quantidade de passageiros",
      required: true,
      format: "Número inteiro",
      example: "2",
      notes: "",
    },
    {
      name: "taxa_embarque_total",
      description: "Valor total das taxas de embarque",
      required: false,
      format: "Número decimal",
      example: "320,00",
      notes: "",
    },
    {
      name: "valor_total",
      description: "Valor total cobrado do cliente",
      required: true,
      format: "Número decimal",
      example: "1.850,00",
      notes: "",
    },
    {
      name: "forma_pagamento",
      description: "Forma de pagamento",
      required: true,
      format: "pix, credit_card, debit_card, boleto",
      example: "pix",
      notes: "",
    },
    {
      name: "status_pagamento",
      description: "Status do pagamento",
      required: true,
      format: "pending, partial, paid",
      example: "paid",
      notes: "pending = pendente | partial = parcial | paid = pago",
    },
    {
      name: "localizador",
      description: "Código localizador (PNR)",
      required: false,
      format: "Texto",
      example: "ABC123",
      notes: "",
    },
    {
      name: "observacoes",
      description: "Observações sobre a venda",
      required: false,
      format: "Texto livre",
      example: "Cliente preferencial",
      notes: "",
    },
    {
      name: "custo_mil_milhas_balcao",
      description: "⚠️ CAMPO LEGADO - Custo por mil milhas do balcão",
      required: false,
      format: "Número decimal",
      example: "22,00",
      notes: "Apenas para vendas de balcão",
    },
    {
      name: "vendedor_balcao",
      description: "Nome do vendedor do balcão",
      required: false,
      format: "Texto",
      example: "Maria Silva",
      notes: "Apenas para vendas de balcão",
    },
    {
      name: "contato_vendedor_balcao",
      description: "Contato do vendedor do balcão",
      required: false,
      format: "Telefone ou email",
      example: "(11) 99999-8888",
      notes: "Apenas para vendas de balcão",
    },
  ];
  
  const fields = mode === "simple" ? fieldsSimple : fieldsComplete;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Instruções dos Campos
        </CardTitle>
        <CardDescription>
          Entenda o que significa cada coluna da planilha
          {mode === "simple" 
            ? " (Modo Simplificado - foco em faturamento)" 
            : " (Modo Completo - validações completas de milhas e rotas)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {fields.map((field) => {
            return (
              <div key={field.name} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono text-sm font-semibold text-primary">
                    {field.name}
                  </div>
                  <Badge variant={field.required ? "default" : "secondary"}>
                    {field.required ? "Obrigatório" : "Opcional"}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {field.description}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-semibold">Formato:</span> {field.format}
                  </div>
                  <div>
                    <span className="font-semibold">Exemplo:</span> {field.example}
                  </div>
                </div>
                
                {field.notes && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    💡 {field.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
