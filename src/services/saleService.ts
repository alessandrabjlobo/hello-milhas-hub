import { supabase } from "@/integrations/supabase/client";
import type { SaleFormData } from "@/schemas/saleSchema";

/**
 * SERVIÇO DE CRIAÇÃO DE VENDAS
 *
 * FLUXO DE CPF (vendas internas):
 *  - Registra CPFs em `cpf_registry` por companhia aérea
 *  - Atualiza uso / datas e depois chama `update_account_cpf_count`
 *
 * CÁLCULOS FINANCEIROS:
 *  - price_total / sale_price: preço base (sem juros) que será usado para margem
 *  - total_cost: custo total (milhas + taxa de embarque)
 *  - profit / margin_value: price_total - total_cost
 *  - profit_margin / margin_percentage: (profit / price_total) * 100
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
    // -------------------------------------------------
    // 0) Validação básica
    // -------------------------------------------------
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
    // 1) Canal (internal / counter / legacy)
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

    // Mapeia para valor aceito no banco
    const dbChannel =
      channel === "internal"
        ? "internal"
        : channel === "counter"
        ? "balcao"
        : channel === "legacy"
        ? "internal" // usa "internal" mas marca sale_source = bulk_import
        : channel;

    console.log("[createSaleWithSegments] channel (form):", channel);
    console.log("[createSaleWithSegments] channel (db):", dbChannel);

    // -------------------------------------------------
    // 2) Segments de voo (JSONB) + milhas usadas
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

    // Milhas vindas direto do formulário (simples) OU calculadas dos trechos
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
    // 3) Valores financeiros unificados (custo, preço, lucro, margem)
    // -------------------------------------------------
    
    // Preço total (valor cobrado do cliente)
    const priceTotalRaw =
      (formData as any).priceTotal ??
      (formData as any).sale_price ??
      (formData as any).price_total ??
      0;
    const priceTotal = Number(priceTotalRaw) || 0;

    // Taxa de embarque
    const boardingFeeRaw = (formData as any).boardingFee ?? 0;
    const boardingFee = Number(boardingFeeRaw) || 0;

    // Custo por milheiro - determinar de acordo com o canal
    let costPerThousand = 0;
    
    if (channel === "internal") {
      // Conta interna: buscar cost_per_mile da conta e multiplicar por 1000
      const accountId = (formData as any).accountId;
      if (accountId) {
        const { data: accountData } = await supabase
          .from("mileage_accounts")
          .select("cost_per_mile")
          .eq("id", accountId)
          .single();
        
        if (accountData?.cost_per_mile) {
          costPerThousand = Number(accountData.cost_per_mile) * 1000;
        }
      }
    } else if (channel === "counter") {
      // Balcão: usar o valor informado
      const counterCostRaw = (formData as any).counterCostPerThousand ?? 0;
      costPerThousand = Number(counterCostRaw) || 0;
    } else if (channel === "legacy") {
      // Legado: usar o valor já calculado que vem do formulário
      const legacyCostRaw = 
        (formData as any).costPerThousand ??
        (formData as any).cost_per_thousand ??
        0;
      costPerThousand = Number(legacyCostRaw) || 0;
    }

    // Calcular custo de milhas e custo total
    const milesCost = totalMilesUsed > 0 
      ? (totalMilesUsed / 1000) * costPerThousand 
      : 0;
    
    const totalCost = milesCost + boardingFee;

    // Calcular lucro e margem
    const profit = priceTotal - totalCost;
    const profitMargin = priceTotal > 0 ? (profit / priceTotal) * 100 : 0;

    // -------------------------------------------------
    // 4) Montar payload para tabela sales
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

      // Milhas / custo
      miles_used: totalMilesUsed,
      total_cost: totalCost,

      // Receita / lucro (colunas novas)
      sale_price: priceTotal,
      profit,
      profit_margin: profitMargin ?? 0,

      // Compatibilidade com colunas antigas
      price_total: priceTotal,
      margin_value: profit,
      margin_percentage: profitMargin ?? 0,

      // Extras de preço
      price_per_passenger: (formData as any).pricePerPassenger
        ? Number((formData as any).pricePerPassenger)
        : null,
      boarding_fee: boardingFee,

      // Financeiro adicional
      cost_per_thousand: costPerThousand > 0 ? costPerThousand : null,

      // Programa / localizador para tela de detalhes
      airline_program:
        (formData as any).airlineProgram ??
        (formData as any).programa_milhas ??
        null,
      locator_code:
        (formData as any).localizador ??
        (formData as any).locator ??
        null,

      // CPFs de passageiros (JSONB)
      passenger_cpfs: (formData as any).passengerCpfs || [],
    };

    // Se vier saleDate (importação), usar no created_at
    if ((formData as any).saleDate) {
      salePayload.created_at = (formData as any).saleDate;
    }

    // Campos específicos por canal
    if (channel === "internal") {
      salePayload.program_id = (formData as any).programId;
      salePayload.mileage_account_id = (formData as any).accountId;
      salePayload.sale_source = "internal_account";
    } else if (channel === "legacy") {
      // Importação simples
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

    // JSONB de segmentos
    salePayload.flight_segments = flightSegments;

    // Texto de rota (ex: FOR–GRU, GRU–GIG)
    salePayload.route_text =
      flightSegments.length > 0
        ? flightSegments
            .map((s: any) => `${s.from ?? ""}-${s.to ?? ""}`)
            .join(", ")
        : null;

    console.log("[createSaleWithSegments] Payload para sales:", salePayload);

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
    // 6) Abater milhas da conta (somente internal)
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
    // 7) Registrar CPFs (somente internal)
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
          console.error(
            "Erro ao buscar airline_company_id:",
            accountError
          );
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
    // 8) Inserir em sale_segments (se houver trechos)
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
