import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';

interface BulkImportInstructionsProps {
  mode: "simple" | "full";
}

export function BulkImportInstructions({ mode }: BulkImportInstructionsProps) {
  const fields = [
    {
      name: "data_venda",
      description: "Data em que a venda foi fechada",
      required: { simple: true, full: true },
      format: "DD/MM/YYYY",
      example: "15/11/2024",
    },
    {
      name: "nome_cliente",
      description: "Nome completo do cliente principal da reserva",
      required: { simple: true, full: true },
      format: "Texto",
      example: "João da Silva",
    },
    {
      name: "cpf_cliente",
      description: "CPF do cliente (usado para criar/atualizar cadastro)",
      required: { simple: false, full: true },
      format: "999.999.999-99 ou 99999999999",
      example: "123.456.789-00",
      notes: "No modo simplificado, se CPF for inválido, apenas avisa mas não bloqueia",
    },
    {
      name: "telefone_cliente",
      description: "Telefone/WhatsApp do cliente",
      required: { simple: false, full: false },
      format: "(99) 99999-9999",
      example: "(11) 98765-4321",
    },
    {
      name: "email_cliente",
      description: "E-mail do cliente",
      required: { simple: false, full: false },
      format: "email@exemplo.com",
      example: "joao@email.com",
    },
    {
      name: "programa_milhas",
      description: "Programa de milhas utilizado na emissão",
      required: { simple: false, full: true },
      format: "LATAM, SMILES, AZUL, TAP, GOL, etc.",
      example: "LATAM",
      notes: "Use o código ou nome da companhia aérea",
    },
    {
      name: "numero_conta",
      description: "Número da conta de milhagem (se usar conta cadastrada)",
      required: { simple: false, full: false },
      format: "Texto ou número",
      example: "123456789",
      notes: "Deixe vazio para o sistema escolher automaticamente",
    },
    {
      name: "tipo_viagem",
      description: "Tipo da viagem",
      required: { simple: false, full: true },
      format: "one_way ou round_trip",
      example: "round_trip",
      notes: "one_way = somente ida | round_trip = ida e volta",
    },
    {
      name: "origem",
      description: "Aeroporto de origem (código IATA)",
      required: { simple: false, full: true },
      format: "Código de 3 letras",
      example: "GRU, GIG, FOR, SSA",
    },
    {
      name: "destino",
      description: "Aeroporto de destino (código IATA)",
      required: { simple: false, full: true },
      format: "Código de 3 letras",
      example: "GRU, GIG, FOR, SSA",
    },
    {
      name: "data_ida",
      description: "Data do voo de ida",
      required: { simple: false, full: true },
      format: "DD/MM/YYYY",
      example: "01/12/2024",
    },
    {
      name: "data_volta",
      description: "Data do voo de volta",
      required: { simple: false, full: false },
      format: "DD/MM/YYYY",
      example: "10/12/2024",
      notes: "Obrigatório SOMENTE se tipo_viagem = round_trip",
    },
    {
      name: "milhas_ida",
      description: "Quantidade de milhas usadas no trecho de ida",
      required: { simple: false, full: true },
      format: "Número (pode usar . ou , para separar milhares)",
      example: "12.500 ou 12500",
    },
    {
      name: "milhas_volta",
      description: "Quantidade de milhas usadas no trecho de volta",
      required: { simple: false, full: false },
      format: "Número",
      example: "12.500",
      notes: "Obrigatório SOMENTE se tipo_viagem = round_trip",
    },
    {
      name: "numero_passageiros",
      description: "Quantidade total de passageiros na reserva",
      required: { simple: false, full: true },
      format: "Número inteiro",
      example: "2",
      notes: "Se não preencher no modo simples, assume 1 passageiro",
    },
    {
      name: "taxa_embarque_total",
      description: "Valor total de taxas de embarque cobradas",
      required: { simple: false, full: false },
      format: "Número decimal (use vírgula: 320,00)",
      example: "320,00",
      notes: "Recomendável preencher para separar receita de taxa",
    },
    {
      name: "valor_total",
      description: "Valor TOTAL cobrado do cliente",
      required: { simple: true, full: true },
      format: "Número decimal (use vírgula: 1.850,00)",
      example: "1.850,00",
    },
    {
      name: "forma_pagamento",
      description: "Forma de pagamento utilizada",
      required: { simple: true, full: true },
      format: "pix, credit_card, debit_card, boleto",
      example: "pix",
    },
    {
      name: "status_pagamento",
      description: "Situação do pagamento",
      required: { simple: true, full: true },
      format: "pending, partial, paid",
      example: "paid",
      notes: "pending = pendente | partial = parcial | paid = pago",
    },
    {
      name: "localizador",
      description: "Código localizador da reserva (PNR)",
      required: { simple: false, full: false },
      format: "Texto (geralmente 6 caracteres)",
      example: "ABC123",
      notes: "Sistema verifica duplicidade se informado",
    },
    {
      name: "origem_venda",
      description: "Canal de origem da venda",
      required: { simple: false, full: false },
      format: "agencia, whatsapp, site, telefone",
      example: "whatsapp",
    },
    {
      name: "observacoes",
      description: "Observações adicionais sobre a venda",
      required: { simple: false, full: false },
      format: "Texto livre",
      example: "Cliente preferencial",
    },
    {
      name: "custo_mil_milhas_balcao",
      description: "Custo por mil milhas (apenas vendas de balcão)",
      required: { simple: false, full: false },
      format: "Número decimal",
      example: "18,50",
      notes: "Obrigatório SOMENTE se for venda de balcão",
    },
    {
      name: "vendedor_balcao",
      description: "Nome do vendedor de balcão",
      required: { simple: false, full: false },
      format: "Texto",
      example: "Maria Vendedora",
      notes: "Usado apenas para vendas de balcão",
    },
    {
      name: "contato_vendedor_balcao",
      description: "Contato do vendedor de balcão",
      required: { simple: false, full: false },
      format: "Telefone ou e-mail",
      example: "(11) 99999-9999",
      notes: "Usado apenas para vendas de balcão",
    },
  ];

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
            ? " (Modo Simplificado - apenas campos financeiros são obrigatórios)" 
            : " (Modo Completo - validações completas de milhas e rotas)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {fields.map((field) => {
            const isRequired = mode === "simple" ? field.required.simple : field.required.full;
            
            return (
              <div key={field.name} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono text-sm font-semibold text-primary">
                    {field.name}
                  </div>
                  <Badge variant={isRequired ? "default" : "secondary"}>
                    {isRequired ? "Obrigatório" : "Opcional"}
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
