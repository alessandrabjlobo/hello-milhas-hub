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

    // ✅ Garante que sempre temos um array
    const flightSegments = formData.flightSegments ?? [];

    if (!Array.isArray(flightSegments)) {
      console.error(
        "[createSaleWithSegments] flightSegments não é array:",
        flightSegments
      );
      throw new Error(
        "Dados dos trechos da viagem inválidos (flightSegments não é um array)"
      );
    }

    if (flightSegments.length === 0) {
      console.warn(
        "[createSaleWithSegments] Nenhum trecho recebido em flightSegments"
      );
      // Se quiser travar a criação sem trechos:
      throw new Error("Adicione ao menos um trecho de voo antes de salvar.");
    }

    // Step 1: Insert into sales table
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

    // Channel-specific fields
    if (formData.channel === "internal") {
      salePayload.program_id = formData.programId;
      salePayload.mileage_account_id = formData.accountId;
      // compat
      salePayload.sale_source = "internal_account";
    } else {
      salePayload.seller_name = formData.sellerName;
      salePayload.seller_contact = formData.sellerContact;
      salePayload.counter_cost_per_thousand =
        formData.counterCostPerThousand ?? null;
      // compat
      salePayload.sale_source = "mileage_counter";
      salePayload.counter_seller_name = formData.sellerName;
      salePayload.counter_seller_contact = formData.sellerContact;
    }

    // Também guarda JSONB (compatibilidade)
    salePayload.flight_segments = flightSegments;

    // Create route text (caso haja trechos)
    salePayload.route_text =
      flightSegments.length > 0
        ? flightSegments
            .map((s) => `${s.from ?? ""}-${s.to ?? ""}`)
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

    // Step 2: Insert into sale_segments table
    const direction =
      formData.tripType === "one_way"
        ? "oneway"
        : formData.tripType === "round_trip"
        ? "roundtrip"
        : "multicity";

    const segmentPayloads = flightSegments.map((segment, index) => ({
      sale_id: saleData.id,
      direction,
      from_code: segment.from,
      to_code: segment.to,
      date: segment.date ? new Date(segment.date).toISOString() : null,
      flight_number: segment.airline || null,
      position: index,
    }));

    if (segmentPayloads.length > 0) {
      const { error: segmentsError } = await supabase
        .from("sale_segments")
        .insert(segmentPayloads);

      if (segmentsError) {
        console.error("Segments insert error:", segmentsError);
        // Não derruba a venda, só loga
        console.warn("Falha ao criar segmentos, mas venda foi criada.");
      }
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
