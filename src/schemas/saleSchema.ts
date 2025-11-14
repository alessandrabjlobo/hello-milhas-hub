import { z } from 'zod';

export const flightSegmentSchema = z.object({
  from: z.string().min(3, "Código de origem obrigatório").max(3),
  to: z.string().min(3, "Código de destino obrigatório").max(3),
  date: z.string().min(1, "Data obrigatória"),
  miles: z.number().optional(),
  boardingFee: z.number().optional(),
  time: z.string().optional(),
  stops: z.number().optional(),
  airline: z.string().optional()
});

export const saleSchemaBase = z.object({
  channel: z.enum(['internal', 'balcao'], {
    required_error: "Canal é obrigatório"
  }),
  customerName: z.string().min(1, "Nome do cliente obrigatório"),
  customerPhone: z.string().optional(),
  customerCpf: z.string().min(11, "CPF inválido"),
  passengers: z.number().min(1, "Mínimo 1 passageiro"),
  tripType: z.enum(['one_way', 'round_trip', 'multi_city']),
  flightSegments: z.array(flightSegmentSchema).min(1, "Adicione pelo menos um trecho"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional()
});

export const internalSaleSchema = saleSchemaBase.extend({
  channel: z.literal('internal'),
  programId: z.string().uuid("Selecione um programa"),
  accountId: z.string().uuid("Selecione uma conta")
});

export const balcaoSaleSchema = saleSchemaBase.extend({
  channel: z.literal('balcao'),
  sellerName: z.string().min(1, "Nome do vendedor obrigatório"),
  sellerContact: z.string().min(1, "Contato do vendedor obrigatório"),
  counterCostPerThousand: z.number().min(0, "Custo por milheiro obrigatório")
});

export const saleSchema = z.discriminatedUnion('channel', [
  internalSaleSchema,
  balcaoSaleSchema
]);

export type SaleFormData = z.infer<typeof saleSchema>;
export type InternalSaleData = z.infer<typeof internalSaleSchema>;
export type BalcaoSaleData = z.infer<typeof balcaoSaleSchema>;
