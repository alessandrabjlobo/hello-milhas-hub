import { supabase } from "@/integrations/supabase/client";
import type { SaleFormData } from "@/schemas/saleSchema";

/**
 * SERVIÇO DE CRIAÇÃO DE VENDAS
 * 
 * Este arquivo contém a lógica principal de criação de vendas do sistema.
 * 
 * FLUXO DE CONTROLE DE CPF (Vendas Internas):
 * 1. CPFs dos passageiros são registrados em `cpf_registry` por companhia aérea
 * 2. Se CPF já existe: incrementa `usage_count` e atualiza `last_used_at`
 * 3. Se CPF é novo: cria registro com `usage_count = 1`
 * 4. Após registro, chama `update_account_cpf_count()` para atualizar contador da conta
 * 
 * BLOQUEIO FUTURO DE CPF:
 * Para implementar bloqueio por limite de uso, adicione verificação antes da linha 279:
 * 
 * if (existingCpf.usage_count >= LIMITE_MAX) {
 *   await supabase.from("cpf_registry")
 *     .update({ status: "blocked", blocked_until: calcularDataBloqueio() })
 *     .eq("id", existingCpf.id);
 *   throw new Error(`CPF ${cpfEncrypted} atingiu limite de uso`);
 * }
 * 
 * CÁLCULOS FINANCEIROS:
 * - price_total: Preço base SEM juros (usado para calcular margem)
 * - final_price_with_interest: Preço FINAL COM juros (valor que cliente paga)
 * - total_cost: Custo total (milhas + taxas de embarque)
 * - profit/margin_value: price_total - total_cost (NÃO usa final_price_with_interest)
 * - profit_margin/margin_percentage: (profit / price_total) * 100
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

    // 🔍 Logs para debug
    console.log("[createSaleWithSegments] supplierId:", supplierId);
    console.log("[createSaleWithSegments] formData recebido:", formData);

    // -------------------------------------------------
    // 1) Normalizar e validar canal (internal vs counter vs legacy)
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
    // 2) Mapear channel para os valores aceitos pelo banco
    // -------------------------------------------------
    const dbChannel =
      channel === "internal"
        ? "internal"
        : channel === "counter"
        ? "balcao"
        : channel === "legacy"
        ? "internal" // Usar "internal" mas marcar como legacy no sale_source
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

    // 🔹 Milhas vindas do formulário (importação simples) OU calculadas dos trechos
    const formMilesRaw =
      (formData as any).totalMilesUsed ??
      (formData as any).total_miles_used ??
      (formData as any).totalMiles ??
      null;

    const milesFromSegments =
      flightSegments.length > 0
        ? flightSegments.reduce(
            (sum: number, s: any) => sum + (Number(s.miles) || 0),
            0
          )
        : 0;

    const totalMilesUsed =
      formMilesRaw !== null && formMilesRaw !== undefined
        ? Number(formMilesRaw) || 0
        : milesFromSegments;

    if (flightSegments.length === 0) {
      console.warn(
        "[createSaleWithSegments] Nenhum trecho recebido em flightSegments. " +
          "A venda será criada sem registros em sale_segments."
      );
    }

    // -------------------------------------------------
    // 4) Normalizar valores financeiros vindos da tela
    // -------------------------------------------------
    // CUSTO TOTAL (obrigatório p/ coluna total_cost NOT NULL)
    const totalCostRaw =
      (formData as any).totalCost ??
      (formData as any).total_cost ??
      0;

    const totalCost = Number(totalCostRaw) || 0;

    // Preço total (valor do cliente)
    const priceTotalRaw =
      (formData as any).priceTotal ??
      (formData as any).sale_price ??
      (formData as any).price_total ??
      0;
    const priceTotal = Number(priceTotalRaw) || 0;

    // Lucro e margem
    const profitRaw =
      (formData as any).profit ??
      (formData as any).margin_value ??
      null;

    const marginRaw =
      (formData as any).profitMargin ??
      (formData as any).margin_percentage ??
      null;

    const profit =
      profitRaw !== null && profitRaw !== undefined
        ? Number(profitRaw)
        : priceTotal - totalCost;

    const profitMargin =
      marginRaw !== null && marginRaw !== undefined
        ? Number(marginRaw)
        : priceTotal > 0
        ? (profit / priceTotal) * 100
        : 0;

    // Custo por milheiro (se vier na importação simples)
    const costPerThousandRaw =
      (formData as any).costPerThousand ??
      (formData as any).cost_per_thousand ??
      null;

    const costPerThousand =
      costPerThousandRaw !== null && costPerThousandRaw !== undefined
        ? Number(costPerThousandRaw)
        : null;

    // -------------------------------------------------
    // 5) Montar payload da venda (tabela sales)
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

      // 🔹 Campos de milhagem / custo
      miles_used: totalMilesUsed,
      total_cost: totalCost,

      // 🔹 Receita / lucro (NOT NULL no banco)
      sale_price: priceTotal,
      profit,
      profit_margin: profitMargin ?? 0,

      // 🔹 Compatibilidade com campos antigos
      price_total: priceTotal,
      margin_value: profit,
      margin_percentage: profitMargin ?? 0,

      // 🔹 Campos opcionais relacionados a preço
      price_per_passenger: (formData as any).pricePerPassenger
        ? Number((formData as any).pricePerPassenger)
        : null,
      boarding_fee: (formData as any).boardingFee
        ? Number((formData as any).boardingFee)
        : null,

      // 🔹 Campos novos/financeiros adicionais
      cost_per_thousand: costPerThousand,

      // 🔹 Info de programa / localizador (para telas de detalhes)
      airline_program:
        (formData as any).airlineProgram ??
        (formData as any).programa_milhas ??
        null,
      locator_code:
        (formData as any).localizador ??
        (formData as any).locator ??
        null,

      // 🔹 CPFs dos passageiros (JSONB)
      passenger_cpfs: (formData as any).passengerCpfs || [],
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
      // Importação legada (modo simplificado)
      salePayload.sale_source = "bulk_import";
      salePayload.mileage_account_id = null;
      salePayload.program_id = null;
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

    // Guarda JSONB dos segmentos (compatibilidade)
    salePayload.flight_segments = flightSegments;

    // Texto de rota (se tiver trechos)
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
    // 7) Abater milhas da conta (apenas para vendas internas, NÃO legacy)
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
    // 8) Registrar CPFs dos passageiros no cpf_registry (só conta interna, NÃO legacy)
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
    // 9) Inserir na tabela sale_segments (se houver trechos)
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
