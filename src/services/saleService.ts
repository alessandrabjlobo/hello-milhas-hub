import { supabase } from "@/integrations/supabase/client";
import type { SaleFormData } from "@/schemas/saleSchema";

/**
 * SERVIÇO DE CRIAÇÃO DE VENDAS
 *
 * Ver comentários no topo do arquivo original – mantidos.
 */

export interface CreateSaleResult {
  saleId: string;
  error?: string;
}

export async function createSaleWithSegments(
  formData: SaleFormData,
  supplierId: string
): Promise<CreateSaleResult> {
  try {
    // ✅ 0) Validação explícita do supplierId
    if (!supplierId || supplierId.trim() === "") {
      throw new Error(
        "ID do fornecedor (agency_id) não fornecido. Aguarde o carregamento dos dados da agência antes de salvar."
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Usuário não autenticado");
    }

    console.log("[createSaleWithSegments] supplierId:", supplierId);
    console.log("[createSaleWithSegments] formData recebido:", formData);

    // -------------------------------------------------
    // 1) Normalizar e validar canal (internal / counter / legacy)
    // -------------------------------------------------
    const channel = (formData as any).channel as
      | "internal"
      | "counter"
      | "legacy"
      | undefined;

    if (!channel) {
      throw new Error("Canal da venda (channel) não informado.");
    }

    if (channel === "legacy") {
      console.log("[createSaleWithSegments] Importação legada (modo simplificado)");
    }

    if (channel === "internal") {
      const programId = (formData as any).programId;
      const accountId = (formData as any).accountId;

      if (!programId || !accountId) {
        throw new Error(
          "Selecione a conta e o programa de milhagem para vendas com conta interna."
        );
      }
    }

    if (channel === "counter") {
      const sellerName = (formData as any).sellerName;
      const sellerContact = (formData as any).sellerContact;
      const counterCostPerThousand = (formData as any).counterCostPerThousand;
      const counterAirlineProgram = (formData as any).counterAirlineProgram;

      if (
        !sellerName ||
        !sellerContact ||
        !counterCostPerThousand ||
        !counterAirlineProgram
      ) {
        throw new Error(
          "Informações do vendedor, programa e custo por mil milhas são obrigatórias para vendas de balcão."
        );
      }
    }

    // -------------------------------------------------
    // 2) Mapear channel para valor aceito pelo banco
    // -------------------------------------------------
    const dbChannel =
      channel === "internal"
        ? "internal"
        : channel === "counter"
        ? "balcao"
        : channel === "legacy"
        ? "internal" // usamos internal + sale_source = bulk_import
        : channel;

    console.log("[createSaleWithSegments] channel (form):", channel);
    console.log("[createSaleWithSegments] channel (db):", dbChannel);

    // -------------------------------------------------
    // 3) Normalizar segmentos de voo
    // -------------------------------------------------
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

    // 🔢 Milhas vindas do formulário (Nova Venda / Importação simples)
    const totalMilesFromForm =
      Number(
        (formData as any).totalMilesUsed ??
          (formData as any).totalMiles ??
          (formData as any).miles_used ??
          0
      ) || 0;

    // ✅ Total de milhas usadas: se tiver trechos, soma; senão usa o total do formulário
    const totalMilesUsed =
      flightSegments.length > 0
        ? flightSegments.reduce(
            (sum: number, s: any) => sum + (Number(s.miles) || 0),
            0
          )
        : totalMilesFromForm;

    if (flightSegments.length === 0) {
      console.warn(
        "[createSaleWithSegments] Nenhum trecho recebido em flightSegments. " +
          `Total de milhas será lido do formulário: ${totalMilesUsed}`
      );
    }

    // -------------------------------------------------
    // 4) Normalizar valores financeiros
    // -------------------------------------------------
    const totalCostRaw =
      (formData as any).totalCost ?? (formData as any).total_cost ?? 0;

    const totalCost = Number(totalCostRaw) || 0;

    const priceTotal =
      Number((formData as any).priceTotal ?? (formData as any).sale_price ?? 0) ||
      0;

    // profit / profitMargin podem ser negativos, mas nunca null na tabela
    const profitField = (formData as any).profit;
    const profit =
      profitField !== null && profitField !== undefined
        ? Number(profitField)
        : 0;

    const profitMarginField = (formData as any).profitMargin;
    const profitMargin =
      profitMarginField !== null && profitMarginField !== undefined
        ? Number(profitMarginField)
        : null;

    // -------------------------------------------------
    // 5) Montar payload da venda
    // -------------------------------------------------
    const salePayload: any = {
      supplier_id: supplierId,
      channel: dbChannel,
      client_name: formData.customerName,
      client_cpf_encrypted: formData.customerCpf,
      client_contact: formData.customerPhone || null,
      passengers: formData.passengers,
      trip_type: formData.tripType,
      payment_method: formData.paymentMethod || null,
      notes: formData.notes || null,
      created_by: user.id,
      user_id: user.id,

      // 🔹 Campos obrigatórios
      miles_used: totalMilesUsed,
      total_cost: totalCost,

      // 🔹 Receita e lucro
      sale_price: priceTotal,
      profit,
      profit_margin: profitMargin,

      // 🔹 Compatibilidade com campos antigos
      price_total: priceTotal,
      margin_value: profit,
      margin_percentage: profitMargin,

      // 🔹 Preço por passageiro (se vier)
      price_per_passenger: (formData as any).pricePerPassenger
        ? Number((formData as any).pricePerPassenger)
        : null,

      // 🔹 Taxa de embarque (se vier)
      boarding_fee: (formData as any).boardingFee
        ? Number((formData as any).boardingFee)
        : null,

      // 🔹 CPFs dos passageiros (JSONB)
      passenger_cpfs: (formData as any).passengerCpfs || [],

      // 🔹 Localizador (Nova venda + Importação simples)
      locator:
        (formData as any).locator ??
        (formData as any).localizador ??
        null,
    };

    // Se vier saleDate da importação, usar no lugar de now()
    if ((formData as any).saleDate) {
      salePayload.created_at = (formData as any).saleDate;
    }

    // Campos específicos por canal
    if (channel === "internal") {
      salePayload.program_id = (formData as any).programId;
      salePayload.mileage_account_id = (formData as any).accountId;
      salePayload.sale_source = "internal_account";
    } else if (channel === "legacy") {
      // Importação legada (faturamento)
      salePayload.sale_source = "bulk_import";
      salePayload.mileage_account_id = null;
      salePayload.program_id = null;

      // Guardar programa em counter_airline_program para exibir na tela
      salePayload.counter_airline_program =
        (formData as any).airlineProgram || null;
    } else if (channel === "counter") {
      salePayload.seller_name = (formData as any).sellerName;
      salePayload.seller_contact = (formData as any).sellerContact;
      salePayload.counter_cost_per_thousand =
        (formData as any).counterCostPerThousand ?? null;
      salePayload.sale_source = "mileage_counter";
      salePayload.counter_seller_name = (formData as any).sellerName;
      salePayload.counter_seller_contact = (formData as any).sellerContact;
      salePayload.counter_airline_program =
        (formData as any).counterAirlineProgram ?? null;
    }

    // JSONB com segmentos para histórico
    salePayload.flight_segments = flightSegments;

    // Texto de rota
    salePayload.route_text =
      flightSegments.length > 0
        ? flightSegments
            .map((s: any) => `${s.from ?? ""}-${s.to ?? ""}`)
            .join(", ")
        : null;

    console.log("[createSaleWithSegments] Payload para sales:", salePayload);

    // -------------------------------------------------
    // 6) Inserir na tabela sales
    // -------------------------------------------------
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

    // -------------------------------------------------
    // 7) Abater milhas da conta (apenas internal)
    // -------------------------------------------------
    if (channel === "internal") {
      const accountId = (formData as any).accountId;
      if (accountId && totalMilesUsed > 0) {
        console.log(
          `[createSaleWithSegments] Abatendo ${totalMilesUsed} milhas da conta ${accountId}`
        );

        const { error: balanceError } = await supabase.rpc(
          "update_account_balance",
          {
            account_id: accountId,
            miles_delta: -totalMilesUsed,
          }
        );

        if (balanceError) {
          console.error("Erro ao abater milhas:", balanceError);
        } else {
          console.log("[createSaleWithSegments] Milhas abatidas com sucesso");
        }
      }
    }

    // -------------------------------------------------
    // 8) Registrar CPFs em cpf_registry (somente internal)
    // -------------------------------------------------
    if (channel === "internal") {
      const accountId = (formData as any).accountId;
      const passengerCpfs = (formData as any).passengerCpfs || [];

      if (accountId && passengerCpfs.length > 0) {
        console.log(
          `[createSaleWithSegments] Registrando ${passengerCpfs.length} CPFs`
        );

        const { data: accountData, error: accountError } = await supabase
          .from("mileage_accounts")
          .select("airline_company_id")
          .eq("id", accountId)
          .single();

        if (accountError || !accountData) {
          console.error("Erro ao buscar airline_company_id:", accountError);
        } else {
          const airlineCompanyId = accountData.airline_company_id;

          for (const passengerCpf of passengerCpfs) {
            const cpfEncrypted = passengerCpf.cpf.replace(/\D/g, "");

            const { data: existingCpf } = await supabase
              .from("cpf_registry")
              .select("id, usage_count, first_use_date")
              .eq("airline_company_id", airlineCompanyId)
              .eq("cpf_encrypted", cpfEncrypted)
              .maybeSingle();

            if (existingCpf) {
              await supabase
                .from("cpf_registry")
                .update({
                  usage_count: existingCpf.usage_count + 1,
                  last_used_at: new Date().toISOString(),
                  first_use_date:
                    existingCpf.first_use_date ||
                    new Date().toISOString(),
                })
                .eq("id", existingCpf.id);

              console.log(
                `[createSaleWithSegments] CPF ${cpfEncrypted} atualizado (${existingCpf.usage_count + 1} usos)`
              );
            } else {
              await supabase.from("cpf_registry").insert({
                user_id: user.id,
                airline_company_id: airlineCompanyId,
                full_name: passengerCpf.name,
                cpf_encrypted: cpfEncrypted,
                usage_count: 1,
                first_use_date: new Date().toISOString(),
                last_used_at: new Date().toISOString(),
                status: "available",
              });

              console.log(
                `[createSaleWithSegments] CPF ${cpfEncrypted} registrado (1º uso)`
              );
            }
          }

          const { error: countError } = await supabase.rpc(
            "update_account_cpf_count",
            {
              p_account_id: accountId,
            }
          );

          if (countError) {
            console.error(
              "Erro ao atualizar contador de CPFs:",
              countError
            );
          } else {
            console.log(
              "[createSaleWithSegments] Contador de CPFs atualizado"
            );
          }
        }
      }
    }

    // -------------------------------------------------
    // 9) Inserir em sale_segments (se houver trechos)
    // -------------------------------------------------
    if (flightSegments.length > 0) {
      const direction =
        formData.tripType === "one_way"
          ? "oneway"
          : formData.tripType === "round_trip"
          ? "roundtrip"
          : "multicity";

      const segmentPayloads = flightSegments.map(
        (segment: any, index: number) => ({
          sale_id: saleData.id,
          direction,
          from_code: segment.from,
          to_code: segment.to,
          date: segment.date ? new Date(segment.date).toISOString() : null,
          flight_number: segment.airline || null,
          position: index,
        })
      );

      const { error: segmentsError } = await supabase
        .from("sale_segments")
        .insert(segmentPayloads);

      if (segmentsError) {
        console.error("Segments insert error:", segmentsError);
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
