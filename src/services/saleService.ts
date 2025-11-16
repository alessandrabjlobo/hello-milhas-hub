import { supabase } from "@/integrations/supabase/client";
import type { SaleFormData } from "@/schemas/saleSchema";

export interface CreateSaleResult {
  saleId: string;
  error?: string;
}

export async function createSaleWithSegments(
  formData: SaleFormData,
  supplierId: string
): Promise<CreateSaleResult> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Usuário não autenticado");
    }

    // 🔍 Log para debug
    console.log("[createSaleWithSegments] formData recebido:", formData);

    // ✅ Tenta pegar os segmentos em diferentes formatos (defensivo)
    const rawSegments: any =
      (formData as any).flightSegments ??
      (formData as any).flight_segments ??
      [];

    const flightSegments = Array.isArray(rawSegments) ? rawSegments : [];

    if (!Array.isArray(rawSegments)) {
      console.warn(
        "[createSaleWithSegments] flightSegments não é array. Valor recebido:",
        rawSegments
      );
    }

    if (flightSegments.length === 0) {
      console.warn(
        "[createSaleWithSegments] Nenhum trecho recebido em flightSegments. " +
          "A venda será criada sem registros em sale_segments."
      );
      // 🚨 Importante: NÃO vamos mais dar throw aqui.
      // Se tiver algo errado no front, a venda ainda é criada, só sem segmentos.
    }

    // --------- STEP 1: Inserir na tabela sales ---------
    const salePayload: any = {
      supplier_id: supplierId,
      channel: formData.channel,
      client_name: formData.customerName,
      client_cpf_encrypted: formData.customerCpf,
      client_contact: formData.customerPhone || null,
      passengers: formData.passengers,
      trip_type: formData.tripType,
      payment_method: formData.paymentMethod || null,
      notes: formData.notes || null,
      status: "draft",
      created_by: user.id,
      user_id: user.id,
    };

    // Campos específicos por canal
    if (formData.channel === "internal") {
      salePayload.program_id = formData.programId;
      salePayload.mileage_account_id = formData.accountId;
      // compat com estrutura antiga
      salePayload.sale_source = "internal_account";
    } else {
      salePayload.seller_name = formData.sellerName;
      salePayload.seller_contact = formData.sellerContact;
      salePayload.counter_cost_per_thousand =
        formData.counterCostPerThousand ?? null;
      // compat com estrutura antiga
      salePayload.sale_source = "mileage_counter";
      salePayload.counter_seller_name = formData.sellerName;
      salePayload.counter_seller_contact = formData.sellerContact;
    }

    // Guarda JSONB dos segmentos (compatibilidade)
    salePayload.flight_segments = flightSegments;

    // Texto de rota (se tiver trechos)
    salePayload.route_text =
      flightSegments.length > 0
        ? flightSegments
            .map((s: any) => `${s.from ?? ""}-${s.to ?? ""}`)
            .join(", ")
        : null;

    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert(salePayload)
      .select("id")
      .single();

    if (saleError) {
      console.error("Sale insert error:", saleError);
      throw new Error(`Erro ao criar venda: ${saleError.message}`);
    }

    if (!saleData?.id) {
      throw new Error("ID da venda não retornado");
    }

    // --------- STEP 2: Inserir na tabela sale_segments (se houver trechos) ---------
    if (flightSegments.length > 0) {
      const direction =
        formData.tripType === "one_way"
          ? "oneway"
          : formData.tripType === "round_trip"
          ? "roundtrip"
          : "multicity";

      const segmentPayloads = flightSegments.map((segment: any, index: number) => ({
        sale_id: saleData.id,
        direction,
        from_code: segment.from,
        to_code: segment.to,
        date: segment.date ? new Date(segment.date).toISOString() : null,
        flight_number: segment.airline || null,
        position: index,
      }));

      const { error: segmentsError } = await supabase
        .from("sale_segments")
        .insert(segmentPayloads);

      if (segmentsError) {
        console.error("Segments insert error:", segmentsError);
        // Não derruba a venda, só loga
        console.warn("Falha ao criar segmentos, mas venda foi criada.");
      }
    } else {
      console.log(
        "[createSaleWithSegments] Nenhum segmentPayload gerado, pulando inserção em sale_segments."
      );
    }

    return { saleId: saleData.id };
  } catch (error: any) {
    console.error("Create sale error:", error);
    return {
      saleId: "",
      error: error.message || "Erro desconhecido ao criar venda",
    };
  }
}
