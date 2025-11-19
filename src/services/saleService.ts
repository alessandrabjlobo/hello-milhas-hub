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
    // ✅ Validação explícita do supplierId
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

    // 🔍 Logs para debug
    console.log("[createSaleWithSegments] supplierId:", supplierId);
    console.log("[createSaleWithSegments] formData recebido:", formData);

    // -------------------------------------------------
    // 1) Normalizar e validar canal (internal vs counter)
    // -------------------------------------------------
    const channel = (formData as any).channel as
      | "internal"
      | "counter"
      | undefined;

    if (!channel) {
      throw new Error("Canal da venda (channel) não informado.");
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

      if (!sellerName || !sellerContact || !counterCostPerThousand) {
        throw new Error(
          "Informações do vendedor e custo por mil milhas são obrigatórias para vendas de balcão."
        );
      }
    }

    // -------------------------------------------------
    // 2) Normalizar segmentos de voo
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

    // ✅ Total de milhas usadas
    const totalMilesUsed =
      flightSegments.length > 0
        ? flightSegments.reduce(
            (sum: number, s: any) => sum + (Number(s.miles) || 0),
            0
          )
        : 0;

    if (flightSegments.length === 0) {
      console.warn(
        "[createSaleWithSegments] Nenhum trecho recebido em flightSegments. " +
          "A venda será criada sem registros em sale_segments."
      );
      // não damos erro, só deixamos miles_used = 0
    }

    // -------------------------------------------------
    // 3) Normalizar valores financeiros vindos da tela
    // -------------------------------------------------
    // CUSTO TOTAL (obrigatório p/ coluna total_cost NOT NULL)
    const totalCostRaw =
      (formData as any).totalCost ?? (formData as any).total_cost ?? 0;

    const totalCost = Number(totalCostRaw) || 0;

    // (RECEITA total_price NÃO será enviada, pois a coluna não existe no banco)

    // -------------------------------------------------
    // 4) Montar payload da venda (tabela sales)
    // -------------------------------------------------
    const salePayload: any = {
      supplier_id: supplierId,
      channel, // "internal" ou "counter"
      client_name: formData.customerName,
      client_cpf_encrypted: formData.customerCpf,
      client_contact: formData.customerPhone || null,
      passengers: formData.passengers,
      trip_type: formData.tripType,
      payment_method: formData.paymentMethod || null,
      notes: formData.notes || null,
      created_by: user.id,
      user_id: user.id,

      // 🔹 Campos exigidos pelo banco (NOT NULL)
      miles_used: totalMilesUsed,
      total_cost: totalCost,

      // ✅ Campos de receita e lucro (NOT NULL)
      sale_price: Number((formData as any).priceTotal ?? 0) || 0,
      profit: Number((formData as any).profit ?? 0) || 0,
      profit_margin: Number((formData as any).profitMargin ?? 0) || 0,

      // ✅ Campos para compatibilidade com telas existentes
      price_total: Number((formData as any).priceTotal ?? 0) || 0,
      margin_value: Number((formData as any).profit ?? 0) || 0,
      margin_percentage: Number((formData as any).profitMargin ?? 0) || 0,

      // Campos opcionais relacionados a preço
      price_per_passenger: (formData as any).pricePerPassenger
        ? Number((formData as any).pricePerPassenger)
        : null,
      boarding_fee: (formData as any).boardingFee
        ? Number((formData as any).boardingFee)
        : null,

      // ✅ CPFs dos passageiros
      passenger_cpfs: (formData as any).passengerCpfs || [],
    };

    // Campos específicos por canal
    if (channel === "internal") {
      salePayload.program_id = (formData as any).programId;
      salePayload.mileage_account_id = (formData as any).accountId;
      salePayload.sale_source = "internal_account";
    } else if (channel === "counter") {
      salePayload.seller_name = (formData as any).sellerName;
      salePayload.seller_contact = (formData as any).sellerContact;
      salePayload.counter_cost_per_thousand =
        (formData as any).counterCostPerThousand ?? null;
      salePayload.sale_source = "mileage_counter";
      salePayload.counter_seller_name = (formData as any).sellerName;
      salePayload.counter_seller_contact = (formData as any).sellerContact;
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

    // -------------------------------------------------
    // 5) Inserir na tabela sales
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
    // 6) Abater milhas da conta (apenas para vendas internas)
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
          // Não falha a venda, apenas registra o erro
        } else {
          console.log("[createSaleWithSegments] Milhas abatidas com sucesso");
        }
      }
    }

    // -------------------------------------------------
    // 7) Registrar CPFs dos passageiros no cpf_registry
    // -------------------------------------------------
    if (channel === "internal") {
      const accountId = (formData as any).accountId;
      const passengerCpfs = (formData as any).passengerCpfs || [];

      if (accountId && passengerCpfs.length > 0) {
        console.log(
          `[createSaleWithSegments] Registrando ${passengerCpfs.length} CPFs`
        );

        // Buscar airline_company_id da conta
        const { data: accountData, error: accountError } = await supabase
          .from("mileage_accounts")
          .select("airline_company_id")
          .eq("id", accountId)
          .single();

        if (accountError || !accountData) {
          console.error(
            "Erro ao buscar airline_company_id:",
            accountError
          );
        } else {
          const airlineCompanyId = accountData.airline_company_id;

          // Processar cada CPF
          for (const passengerCpf of passengerCpfs) {
            const cpfEncrypted = passengerCpf.cpf.replace(/\D/g, "");

            // Verificar se CPF já existe
            const { data: existingCpf } = await supabase
              .from("cpf_registry")
              .select("id, usage_count, first_use_date")
              .eq("airline_company_id", airlineCompanyId)
              .eq("cpf_encrypted", cpfEncrypted)
              .maybeSingle();

            if (existingCpf) {
              // Atualizar CPF existente
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
                `[createSaleWithSegments] CPF ${cpfEncrypted} atualizado (` +
                  `${existingCpf.usage_count + 1} usos)`
              );
            } else {
              // Inserir novo CPF
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

          // Atualizar contador de CPFs da conta
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
    // 8) Inserir na tabela sale_segments (se houver trechos)
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
