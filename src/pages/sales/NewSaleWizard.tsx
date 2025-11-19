import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupplierAirlines } from "@/hooks/useSupplierAirlines";
import { usePaymentInterestConfig } from "@/hooks/usePaymentInterestConfig";
import { maskCPF, maskPhone } from "@/lib/input-masks";
import {
  ArrowLeft,
  Check,
  Plus,
  Users,
  Building2,
  AlertCircle,
  FileUp,
  CheckCircle2,
} from "lucide-react";
import { SalesSummaryCard } from "@/components/sales/SaleSummaryCard";
import { SaleSuccessDialog } from "@/components/sales/SaleSuccessDialog";
import { PassengerCPFDialog } from "@/components/sales/PassengerCPFDialog";
import { FlightSegmentForm } from "@/components/sales/FlightSegmentForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccountCombobox } from "@/components/sales/AccountCombobox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BilheteTicketExtractor } from "@/components/tickets/BilheteTicketExtractor";
import { AutoFilledInput } from "@/components/ui/auto-filled-input";
import { createSaleWithSegments } from "@/services/saleService";
import { formatMiles } from "@/lib/utils";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

export type FlightSegment = {
  from: string;
  to: string;
  date: string;
  miles?: number;
  boardingFee?: number;
  time?: string;
  stops?: number;
  airline?: string;
};

export type PassengerCPF = {
  name: string;
  cpf: string;
};

export default function NewSaleWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  const { toast } = useToast();

  // Loading guard para prevenir erros de inicialização
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // --- STATES PRINCIPAIS ---
  const [extractedData, setExtractedData] = useState<any>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set()
  );
  const [isConvertingQuote, setIsConvertingQuote] = useState(false);
  const [sourceQuote, setSourceQuote] = useState<any>(null);

  // Origem da venda
  const [saleSource, setSaleSource] = useState<
    "internal_account" | "mileage_counter"
  >("internal_account");
  const [counterSellerName, setCounterSellerName] = useState("");
  const [counterSellerContact, setCounterSellerContact] = useState("");
  const [counterAirlineProgram, setCounterAirlineProgram] = useState("");
  const [counterCostPerThousand, setCounterCostPerThousand] = useState("");

  // Cliente
  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Viagem e passageiros
  const [tripType, setTripType] = useState<
    "one_way" | "round_trip" | "multi_city"
  >("one_way");
  const [passengers, setPassengers] = useState(1);
  const [passengerCpfs, setPassengerCpfs] = useState<PassengerCPF[]>([]);
  const [showPassengerDialog, setShowPassengerDialog] = useState(false);

  // Segmentos de voo
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "", miles: 0 },
  ]);

  // Taxa de embarque
  const [boardingFeeMode, setBoardingFeeMode] = useState<
    "total" | "per_segment"
  >("total");
  const [totalBoardingFee, setTotalBoardingFee] = useState("");

  // Conta e programa
  const [accountId, setAccountId] = useState("");
  const [programId, setProgramId] = useState("");

  // Preços e detalhes
  const [pricePerPassenger, setPricePerPassenger] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [airline, setAirline] = useState("");
  const [pnr, setPnr] = useState("");
  const [notes, setNotes] = useState("");

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState("");
  const [installments, setInstallments] = useState(1);
  const [interestRate, setInterestRate] = useState(0);

  // Salvamento e diálogo de sucesso
  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // --- CUSTOM HOOKS ---
  const { accounts, loading: accountsLoading } = useMileageAccounts();
  const { supplierId, loading: roleLoading } = useUserRole();
  const { linkedAirlines, loading: airlinesLoading } =
    useSupplierAirlines(supplierId);
  const {
    configs,
    loading: configsLoading,
    calculateInstallmentValue,
  } = usePaymentInterestConfig();
  const { activeMethods, loading: methodsLoading } = usePaymentMethods();

  const selectedAccount =
    accounts.find((acc) => acc.id === accountId) || undefined;

  const filteredAccounts = accounts.filter((acc) => acc.status === "active");

  const updateTripType = (type: typeof tripType) => {
    setTripType(type);
    if (type === "one_way") {
      setFlightSegments([{ from: "", to: "", date: "", miles: 0 }]);
    } else if (type === "round_trip") {
      setFlightSegments([
        { from: "", to: "", date: "", miles: 0 },
        { from: "", to: "", date: "", miles: 0 },
      ]);
    } else if (type === "multi_city") {
      if (flightSegments.length < 2) {
        setFlightSegments([
          { from: "", to: "", date: "", miles: 0 },
          { from: "", to: "", date: "", miles: 0 },
        ]);
      }
    }
  };

  // --- CÁLCULOS FINANCEIROS MEMOIZADOS ---
  const financialData = useMemo(() => {
    const totalMiles = flightSegments.reduce(
      (sum, seg) => sum + (seg.miles || 0),
      0
    );

    const boardingFeePerPassenger =
      boardingFeeMode === "total"
        ? parseFloat(totalBoardingFee || "0")
        : flightSegments.reduce(
            (sum, seg) => sum + (seg.boardingFee || 0),
            0
          );

    const boardingFeeTotal =
      boardingFeePerPassenger * (passengers || 1);

    let costPerThousand: number | null = null;

    if (saleSource === "internal_account" && selectedAccount) {
      if (selectedAccount.cost_per_mile) {
        costPerThousand = (selectedAccount.cost_per_mile || 0) * 1000;
      }
    } else if (saleSource === "mileage_counter" && counterCostPerThousand) {
      costPerThousand = parseFloat(counterCostPerThousand) || 0;
    }

    const costPerMile =
      costPerThousand && costPerThousand > 0
        ? costPerThousand / 1000
        : 0;

    const milesCostTotal = totalMiles * costPerMile;

    const revenueTotal = parseFloat(priceTotal || "0") || 0;

    const estimatedTotalCost = milesCostTotal + boardingFeeTotal;

    const estimatedProfit = revenueTotal - estimatedTotalCost;

    const profitMarginPct =
      revenueTotal > 0 ? (estimatedProfit / revenueTotal) * 100 : 0;

    return {
      totalMiles,
      boardingFeePerPassenger,
      boardingFeeTotal,
      milesCostTotal,
      revenueTotal,
      estimatedTotalCost,
      estimatedProfit,
      profitMarginPct,
    };
  }, [
    flightSegments,
    boardingFeeMode,
    totalBoardingFee,
    passengers,
    saleSource,
    selectedAccount,
    counterCostPerThousand,
    priceTotal,
  ]);

  const {
    totalMiles,
    boardingFeePerPassenger,
    boardingFeeTotal,
    milesCostTotal,
    revenueTotal,
    estimatedTotalCost,
    estimatedProfit,
    profitMarginPct,
  } = financialData;

  // --- useEffect: sincronizar passageiro principal com cliente ---
  useEffect(() => {
    if (customerName && customerCpf) {
      const firstPassenger: PassengerCPF = {
        name: customerName,
        cpf: customerCpf.replace(/\D/g, ""),
      };

      if (passengers === 1) {
        setPassengerCpfs([firstPassenger]);
      } else if (passengers > 1) {
        setPassengerCpfs((prev) => {
          const updated = [...prev];
          updated[0] = firstPassenger;

          while (updated.length < passengers) {
            updated.push({ name: "", cpf: "" });
          }

          return updated.slice(0, passengers);
        });
      }
    }
  }, [customerName, customerCpf, passengers]);

  // --- Buscar e preencher orçamento, com useCallback ---
  const fetchAndPrefillQuote = useCallback(
    async (qId: string) => {
      console.log("[QuoteToSale] Loading quote:", qId);
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("*")
          .eq("id", qId)
          .single();

        if (error) throw error;

        console.log("[QuoteToSale] Loaded quote:", data);

        setSourceQuote(data);
        setIsConvertingQuote(true);

        // 🔁 AJUSTE CONVERSÃO DE ORÇAMENTO – campos básicos
        setCustomerName(data.client_name || "");
        setCustomerPhone(data.client_phone || "");
        setAirline(data.company_name || "");
        setPriceTotal(data.total_price?.toString() || "");

        const paxCount =
          (typeof data.passengers === "number" && data.passengers > 0
            ? data.passengers
            : 1) as number;

        if (data.total_price && paxCount) {
          const per = data.total_price / paxCount;
          setPricePerPassenger(per.toFixed(2));
        }

        if (data.passengers) {
          setPassengers(data.passengers);
        }

        if (data.boarding_fee) {
          // boarding_fee no orçamento é por passageiro
          setTotalBoardingFee(data.boarding_fee.toString());
          setBoardingFeeMode("total");
        }

        // 🔁 AJUSTE CONVERSÃO DE ORÇAMENTO – tripType
        if (data.trip_type) {
          setTripType(data.trip_type as typeof tripType);
        }

        // 🔁 AJUSTE CONVERSÃO DE ORÇAMENTO – flight_segments
        if (data.flight_segments && Array.isArray(data.flight_segments)) {
          const rawSegments = data.flight_segments as any[];

          let segments: FlightSegment[] = [];

          // round_trip salvo no orçamento como UM objeto com origin/destination + milesOutbound/milesReturn
          if (data.trip_type === "round_trip" && rawSegments.length > 0) {
            const seg = rawSegments[0];

            const origin = seg.origin || seg.from || "";
            const destination = seg.destination || seg.to || "";
            const departureDate =
              seg.departureDate || seg.departure_date || seg.date || "";
            const returnDate =
              seg.returnDate || seg.return_date || "";

            const milesOutboundPerPax =
              seg.milesOutbound ?? seg.miles_ida ?? 0;
            const milesReturnPerPax =
              seg.milesReturn ?? seg.miles_volta ?? 0;

            const milesOutboundTotal = milesOutboundPerPax * paxCount;
            const milesReturnTotal = milesReturnPerPax * paxCount;

            segments = [
              {
                from: origin,
                to: destination,
                date: departureDate,
                miles: milesOutboundTotal,
              },
              {
                from: destination,
                to: origin,
                date: returnDate,
                miles: milesReturnTotal,
              },
            ];

            setTripType("round_trip");
          } else if (data.trip_type === "one_way" && rawSegments.length > 0) {
            // one_way salvo como um objeto com origin/destination + miles (pax)
            const seg = rawSegments[0];

            const origin = seg.origin || seg.from || "";
            const destination = seg.destination || seg.to || "";
            const departureDate =
              seg.departureDate || seg.departure_date || seg.date || "";

            const milesPerPax =
              seg.miles ??
              seg.milesOutbound ??
              seg.miles_ida ??
              data.miles_needed ??
              0;

            const milesTotal = milesPerPax * paxCount;

            segments = [
              {
                from: origin,
                to: destination,
                date: departureDate,
                miles: milesTotal,
              },
            ];

            setTripType("one_way");
          } else if (data.trip_type === "multi_city") {
            // multi_city: cada trecho no orçamento é milhas/pax, aqui convertemos para milhas totais
            segments = rawSegments.map((seg: any) => {
              const milesPerPax = seg.miles || 0;
              return {
                from: seg.from || seg.origin || "",
                to: seg.to || seg.destination || "",
                date:
                  seg.date ||
                  seg.departureDate ||
                  seg.departure_date ||
                  "",
                miles: milesPerPax * paxCount,
                boardingFee: seg.boardingFee,
              };
            });

            setTripType("multi_city");
          } else {
            // Fallback genérico (caso venha em formato inesperado)
            const fallbackSegments = rawSegments.map((seg: any) => ({
              from: seg.from || seg.origin || "",
              to: seg.to || seg.destination || "",
              date:
                seg.date ||
                seg.departureDate ||
                seg.departure_date ||
                "",
              miles: seg.miles || 0,
              boardingFee: seg.boardingFee,
            }));

            segments = fallbackSegments;
          }

          if (segments.length > 0) {
            setFlightSegments(segments);
          }
        }

        toast({
          title: "Orçamento carregado",
          description:
            "Dados do orçamento foram importados. Revise antes de salvar.",
        });
      } catch (error: any) {
        console.error("[QuoteToSale] Error loading quote:", error);
        toast({
          title: "Erro ao carregar orçamento",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [toast, tripType]
  );

  // --- useEffect: carregar orçamento quando tiver quoteId ---
  useEffect(() => {
    if (quoteId) {
      console.log(
        "[QuoteToSale] Opening NewSaleWizard with quoteId:",
        quoteId
      );
      fetchAndPrefillQuote(quoteId);
    }
  }, [quoteId, fetchAndPrefillQuote]);

  // --- LOADING CHECK ÚNICO (após todos os hooks) ---
  if (
    !isInitialized ||
    accountsLoading ||
    roleLoading ||
    airlinesLoading ||
    configsLoading ||
    methodsLoading
  ) {
    return (
      <div className="container py-8">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Carregando formulário...</p>
          </div>
        </Card>
      </div>
    );
  }

  // --- VARIÁVEIS DERIVADAS ---
  const selectedPaymentMethod =
    activeMethods?.find((m) => m.id === paymentMethod) || null;

  // --- LÓGICA ---

  const handlePDFDataExtracted = (data: any) => {
    setExtractedData(data);
    const newAutoFilledFields = new Set<string>();

    if (data.customerName) {
      setCustomerName(data.customerName);
      newAutoFilledFields.add("customerName");
    }

    if (data.customerCpf) {
      setCustomerCpf(data.customerCpf);
      newAutoFilledFields.add("customerCpf");
    }

    if (data.airline) {
      setAirline(data.airline);
      newAutoFilledFields.add("airline");
    }

    if (data.pnr) {
      setPnr(data.pnr);
      newAutoFilledFields.add("pnr");
    }

    if (data.segments && data.segments.length > 0) {
      setFlightSegments(data.segments);
      newAutoFilledFields.add("flightSegments");

      if (data.segments.length === 1) {
        setTripType("one_way");
      } else if (data.segments.length === 2) {
        setTripType("round_trip");
      } else {
        setTripType("multi_city");
      }
    }

    setAutoFilledFields(newAutoFilledFields);

    toast({
      title: "Dados extraídos!",
      description: `${newAutoFilledFields.size} campo(s) preenchido(s) automaticamente.`,
    });
  };

  const createTicketsForPassengers = async (saleId: string) => {
    try {
      const departureDate = flightSegments[0]?.date;
      const returnDate =
        tripType === "round_trip" && flightSegments[1]?.date
          ? flightSegments[1].date
          : null;

      const routeText = flightSegments
        .map((s) => `${s.from} → ${s.to}`)
        .join(" / ");

      const ticketsToCreate = passengerCpfs.map((pax) => ({
        sale_id: saleId,
        passenger_name: pax.name,
        passenger_cpf_encrypted: pax.cpf,
        airline: airline || "Não informado",
        route: routeText,
        departure_date:
          departureDate || new Date().toISOString().split("T")[0],
        return_date: returnDate,
        ticket_code: `TKT-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        pnr: pnr || null,
        status: "pending" as const,
      }));

      const { error } = await supabase.from("tickets").insert(ticketsToCreate);

      if (error) throw error;

      console.log(
        `✅ ${ticketsToCreate.length} passagens criadas automaticamente`
      );
    } catch (error: any) {
      console.error("Erro ao criar passagens:", error);
      toast({
        title: "Aviso",
        description:
          "Venda salva, mas houve erro ao criar as passagens automaticamente.",
        variant: "destructive",
      });
    }
  };

  // --- Validação ---
  const hasOrigin =
    saleSource === "internal_account"
      ? !!accountId
      : !!(
          counterSellerName &&
          counterSellerContact &&
          counterAirlineProgram &&
          counterCostPerThousand
        );

  const hasCustomer = !!(customerName && customerCpf);

  const hasPassengers =
    passengers > 0 && passengerCpfs.length === passengers;

  const hasValidSegments =
    flightSegments.length > 0 &&
    flightSegments.every((s) => s.from && s.to && s.date && s.miles);

  const hasBoardingFee =
    boardingFeeMode === "total"
      ? !!totalBoardingFee
      : flightSegments.every((s) => s.boardingFee !== undefined);

  const hasPriceAndPayment =
    !!priceTotal && parseFloat(priceTotal) > 0 && !!paymentMethod;

  const canSave =
    hasOrigin &&
    hasCustomer &&
    hasPassengers &&
    hasValidSegments &&
    hasBoardingFee &&
    hasPriceAndPayment;

  const handleSave = async () => {
    if (!canSave) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    // ✅ Garante que supplierId existe antes de salvar
    if (!supplierId) {
      toast({
        title: "Erro de configuração",
        description:
          "Aguarde o carregamento dos dados da agência antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const channel =
        saleSource === "internal_account" ? "internal" : "counter";

      // 🔹 Encontrar método de pagamento selecionado
      const selectedMethod = (activeMethods || []).find(
        (m) => m.id === paymentMethod
      );

      // 🔹 Dados enviados para o backend (incluindo custo / milhas)
      const saleFormData: any = {
        channel,
        customerName,
        customerCpf: customerCpf.replace(/\D/g, ""),
        customerPhone: customerPhone || null,
        passengers,
        tripType,
        paymentMethod: selectedMethod?.method_type || null, // ✅ method_type (pix, credit_card, etc)
        notes: notes || null,
        flightSegments,
        passengerCpfs, // ✅ CPFs dos passageiros

        // financeiros
        priceTotal: revenueTotal, // número já parseado
        boardingFeePerPassenger,
        totalBoardingFee: boardingFeeTotal,
        milesUsed: totalMiles,
        totalCost: estimatedTotalCost,

        // ✅ Campos de lucro (obrigatórios no banco)
        profit: estimatedProfit || 0,
        profitMargin: profitMarginPct || 0,
        pricePerPassenger: pricePerPassenger || null,
        boardingFee: boardingFeeTotal || 0,
      };

      if (channel === "internal") {
        saleFormData.programId = programId;
        saleFormData.accountId = accountId;
      } else {
        // 🔹 Venda via Balcão de Milhas (fornecedor externo)
        saleFormData.sellerName = counterSellerName.trim();
        saleFormData.sellerContact = counterSellerContact.trim();
        saleFormData.counterAirlineProgram = counterAirlineProgram.trim(); // << ADICIONADO
        saleFormData.counterCostPerThousand = counterCostPerThousand
          ? parseFloat(counterCostPerThousand)
          : null;
      }


      console.log(
        "[QuoteToSale] Creating sale from quoteId:",
        quoteId || "new sale"
      );

      const result = await createSaleWithSegments(saleFormData, supplierId);

      if (!result.saleId || result.error) {
        throw new Error(result.error || "Falha ao criar venda");
      }

      const saleId = result.saleId;
      setSaving(false);

      if (saleId && typeof saleId === "string" && quoteId) {
        try {
          await supabase
            .from("quotes")
            .update({
              converted_to_sale_id: saleId,
              converted_at: new Date().toISOString(),
            })
            .eq("id", quoteId);
        } catch (error) {
          console.error("Failed to update quote:", error);
        }
      }

      if (saleId && typeof saleId === "string") {
        await createTicketsForPassengers(saleId);

        setLastSaleData({
          customerName,
          routeText: flightSegments
            .map((s) => `${s.from} → ${s.to}`)
            .join(" / "),
          tripType,
          flightSegments,
          airline,
          milesNeeded: totalMiles.toString(),
          priceTotal: priceTotal,
          boardingFee: boardingFeePerPassenger.toString(),
          passengers,
          paymentMethod,
          pnr: pnr || undefined,
          ticketsCreated: true,
          saleId: saleId,
          saleSource,
          estimatedProfit,
          profitMarginPct,
          accountInfo:
            saleSource === "internal_account" && selectedAccount
              ? {
                  airlineName: selectedAccount.airline_companies?.name || "",
                  accountNumber: selectedAccount.account_number || "",
                  accountHolderName:
                    selectedAccount.account_holder_name || "Não informado",
                  supplierName: "Fornecedor",
                  costPerThousand:
                    (selectedAccount.cost_per_mile || 0.029) * 1000,
                  cpfsUsed: passengerCpfs.length,
                }
              : saleSource === "mileage_counter"
              ? {
                  airlineName: counterAirlineProgram || "",
                  accountNumber: "",
                  accountHolderName: counterSellerName || "",
                  supplierName: "Balcão",
                  costPerThousand: parseFloat(
                    counterCostPerThousand || "0"
                  ),
                  cpfsUsed: passengerCpfs.length,
                }
              : undefined,
        });

        setShowSuccessDialog(true);
      }
    } catch (error: any) {
      setSaving(false);
      toast({
        title: "Erro ao salvar venda",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // --- JSX ---
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/sales")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nova Venda</h1>
            <p className="text-muted-foreground">
              Preencha os dados abaixo para registrar a venda
            </p>
          </div>
        </div>

        {isConvertingQuote && sourceQuote && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Convertendo orçamento de {sourceQuote.client_name} criado em{" "}
              {new Date(sourceQuote.created_at).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
          {/* Formulário */}
          <Card className="p-6">
            <div className="space-y-6">
              {/* Upload do Bilhete */}
              <Card className="p-4 bg-primary/5 border-primary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileUp className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">
                        Extrair dados do bilhete (PDF/IMG)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Preenche automaticamente os campos abaixo
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <BilheteTicketExtractor
                    onDataExtracted={handlePDFDataExtracted}
                  />
                </div>
              </Card>

              {/* Origem da Venda */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Origem da Venda</h2>
                <div className="space-y-4">
                  <RadioGroup
                    value={saleSource}
                    onValueChange={(v) =>
                      setSaleSource(v as typeof saleSource)
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card
                        className={`p-4 cursor-pointer transition ${
                          saleSource === "internal_account"
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setSaleSource("internal_account")}
                      >
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem
                            value="internal_account"
                            id="internal_account"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="internal_account"
                              className="cursor-pointer text-base font-semibold flex items-center gap-2"
                            >
                              <Users className="h-4 w-4" />
                              Conta Interna
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Usar conta de milhagem própria
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card
                        className={`p-4 cursor-pointer transition ${
                          saleSource === "mileage_counter"
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setSaleSource("mileage_counter")}
                      >
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem
                            value="mileage_counter"
                            id="mileage_counter"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="mileage_counter"
                              className="cursor-pointer text-base font-semibold flex items-center gap-2"
                            >
                              <Building2 className="h-4 w-4" />
                              Balcão de Milhas
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Comprar de fornecedor externo
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </RadioGroup>

                  {saleSource === "internal_account" && (
                    <div>
                      <Label>Selecione a Conta *</Label>
                      <AccountCombobox
                        accounts={filteredAccounts}
                        value={accountId}
                        onChange={(id) => {
                          setAccountId(id);
                          const account = accounts.find((a) => a.id === id);
                          if (account) {
                            setProgramId(account.airline_company_id);
                          }
                        }}
                        placeholder="Buscar conta..."
                      />
                    </div>
                  )}

                  {saleSource === "mileage_counter" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="counterSellerName">
                          Nome do Vendedor *
                        </Label>
                        <Input
                          id="counterSellerName"
                          value={counterSellerName}
                          onChange={(e) =>
                            setCounterSellerName(e.target.value)
                          }
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="counterSellerContact">
                          Contato do Vendedor *
                        </Label>
                        <Input
                          id="counterSellerContact"
                          value={counterSellerContact}
                          onChange={(e) =>
                            setCounterSellerContact(e.target.value)
                          }
                          placeholder="Telefone ou e-mail"
                        />
                      </div>
                      <div>
                        <Label htmlFor="counterAirlineProgram">
                          Programa de Milhas *
                        </Label>
                        <Input
                          id="counterAirlineProgram"
                          value={counterAirlineProgram}
                          onChange={(e) =>
                            setCounterAirlineProgram(e.target.value)
                          }
                          placeholder="Ex: LATAM Pass"
                        />
                      </div>
                      <div>
                        <Label htmlFor="counterCostPerThousand">
                          Custo por Mil Milhas (R$) *
                        </Label>
                        <Input
                          id="counterCostPerThousand"
                          type="number"
                          value={counterCostPerThousand}
                          onChange={(e) =>
                            setCounterCostPerThousand(e.target.value)
                          }
                          placeholder="Ex: 29.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Dados do Cliente */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Dados do Cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Nome Completo *</Label>
                    <AutoFilledInput
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nome do cliente"
                      autoFilled={autoFilledFields.has("customerName")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerCpf">CPF *</Label>
                    <AutoFilledInput
                      id="customerCpf"
                      value={customerCpf}
                      onChange={(e) =>
                        setCustomerCpf(maskCPF(e.target.value))
                      }
                      placeholder="000.000.000-00"
                      autoFilled={autoFilledFields.has("customerCpf")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="customerPhone">Telefone</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) =>
                        setCustomerPhone(maskPhone(e.target.value))
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalhes da Viagem */}
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Detalhes da Viagem
                </h2>
                <div className="space-y-4">
                  {/* Tipo de Viagem */}
                  <div>
                    <Label className="text-base font-medium">
                      Tipo de Viagem *
                    </Label>
                    <RadioGroup
                      value={tripType}
                      onValueChange={(v) =>
                        updateTripType(v as typeof tripType)
                      }
                    >
                      <div className="flex gap-4 flex-wrap mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="one_way" id="one_way" />
                          <Label htmlFor="one_way">Só Ida</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="round_trip" id="round_trip" />
                          <Label htmlFor="round_trip">Ida e Volta</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="multi_city" id="multi_city" />
                          <Label htmlFor="multi_city">
                            Múltiplos Trechos
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Trechos */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-medium">
                        Trechos da Viagem *
                      </Label>
                      {tripType === "multi_city" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFlightSegments([
                              ...flightSegments,
                              {
                                from: "",
                                to: "",
                                date: "",
                                miles: 0,
                              },
                            ])
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Trecho
                        </Button>
                      )}
                    </div>

                    {flightSegments.map((segment, index) => (
                      <FlightSegmentForm
                        key={index}
                        index={index}
                        segment={segment}
                        showBoardingFee={boardingFeeMode === "per_segment"}
                        onUpdate={(idx, field, value) => {
                          const newSegments = [...flightSegments];
                          newSegments[idx] = {
                            ...newSegments[idx],
                            [field]: value,
                          };
                          setFlightSegments(newSegments);
                        }}
                        onRemove={(indexToRemove) => {
                          if (flightSegments.length > 1) {
                            setFlightSegments(
                              flightSegments.filter(
                                (_, i) => i !== indexToRemove
                              )
                            );
                          }
                        }}
                        canRemove={flightSegments.length > 1}
                      />
                    ))}

                    <div className="p-4 bg-muted rounded-lg mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">
                          Total de Milhas:
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {formatMiles(totalMiles)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Taxa de Embarque e Passageiros */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                    <div>
                      <Label htmlFor="passengers">Nº Passageiros *</Label>
                      <Input
                        id="passengers"
                        type="number"
                        min="1"
                        value={passengers}
                        onChange={(e) =>
                          setPassengers(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>

                    <div>
                      <Label>Taxa de Embarque *</Label>
                      <RadioGroup
                        value={boardingFeeMode}
                        onValueChange={(
                          value: "total" | "per_segment"
                        ) => setBoardingFeeMode(value)}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="total" id="total" />
                          <Label htmlFor="total" className="cursor-pointer">
                            Total
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="per_segment"
                            id="per_segment"
                          />
                          <Label
                            htmlFor="per_segment"
                            className="cursor-pointer"
                          >
                            Por Trecho
                          </Label>
                        </div>
                      </RadioGroup>

                      {boardingFeeMode === "total" && (
                        <Input
                          type="number"
                          placeholder="R$ 0,00 (por passageiro)"
                          value={totalBoardingFee}
                          onChange={(e) =>
                            setTotalBoardingFee(e.target.value)
                          }
                          className="mt-2"
                          step="0.01"
                        />
                      )}
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="p-4 border rounded-lg bg-primary/5">
                    <Label className="font-semibold text-base mb-3 block">
                      Valores
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pricePerPassenger">
                          Preço por Passageiro
                        </Label>
                        <Input
                          id="pricePerPassenger"
                          type="number"
                          value={pricePerPassenger}
                          onChange={(e) => {
                            setPricePerPassenger(e.target.value);
                            const perPassenger =
                              parseFloat(e.target.value) || 0;
                            setPriceTotal(
                              (perPassenger * passengers).toFixed(2)
                            );
                          }}
                          placeholder="R$ 0,00"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="priceTotal">Preço Total *</Label>
                        <Input
                          id="priceTotal"
                          type="number"
                          value={priceTotal}
                          onChange={(e) => setPriceTotal(e.target.value)}
                          placeholder="R$ 0,00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumo Financeiro */}
                  <Card className="mt-4 p-4 border-dashed border-primary/50 bg-muted/40">
                    <h3 className="font-semibold mb-2">
                      Resumo Financeiro (estimado)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Receita total:</span>
                        <span className="font-semibold">
                          R$ {revenueTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo estimado das milhas:</span>
                        <span>R$ {milesCostTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxas de embarque (total):</span>
                        <span>R$ {boardingFeeTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lucro estimado:</span>
                        <span
                          className={
                            estimatedProfit >= 0
                              ? "font-semibold text-emerald-600"
                              : "font-semibold text-red-600"
                          }
                        >
                          R$ {estimatedProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between md:col-span-2">
                        <span>Margem de lucro estimada:</span>
                        <span
                          className={
                            estimatedProfit >= 0
                              ? "font-semibold text-emerald-600"
                              : "font-semibold text-red-600"
                          }
                        >
                          {profitMarginPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Forma de Pagamento */}
                  <div>
                    <Label
                      htmlFor="paymentMethod"
                      className="text-base font-medium"
                    >
                      Forma de Pagamento *
                    </Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {(activeMethods || []).map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.method_name}
                            {method.method_type === "pix" &&
                              method.additional_info?.pix_holder && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({method.additional_info.pix_holder})
                                </span>
                              )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {paymentMethod &&
                      (() => {
                        const selectedMethod = (activeMethods || []).find(
                          (m) => m.id === paymentMethod
                        );
                        if (
                          selectedMethod?.method_type === "pix" &&
                          selectedMethod.additional_info
                        ) {
                          return (
                            <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 mt-3">
                              <div className="space-y-1 text-sm">
                                {selectedMethod.additional_info.pix_key && (
                                  <div>
                                    <span className="font-semibold">
                                      Chave PIX:
                                    </span>{" "}
                                    {selectedMethod.additional_info.pix_key}
                                  </div>
                                )}
                                {selectedMethod.additional_info.pix_holder && (
                                  <div>
                                    <span className="font-semibold">
                                      Titular:
                                    </span>{" "}
                                    {
                                      selectedMethod.additional_info
                                        .pix_holder
                                    }
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        }
                        return null;
                      })()}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Passageiros */}
              <div>
                <Label className="text-base font-medium">Passageiros</Label>
                {passengers > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPassengerDialog(true)}
                      className="w-full mt-2"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {passengerCpfs.length === 0
                        ? "Adicionar CPFs dos Passageiros"
                        : `${passengerCpfs.length} de ${passengers} passageiro(s) adicionado(s)`}
                    </Button>

                    {passengerCpfs.length !== passengers && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          É necessário adicionar o CPF de todos os{" "}
                          {passengers} passageiro(s) para continuar.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  passengerCpfs.length === 1 && (
                    <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800 mt-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-400">
                        ✅ Passageiro preenchido automaticamente:{" "}
                        <strong>{passengerCpfs[0].name}</strong>
                      </AlertDescription>
                    </Alert>
                  )
                )}
              </div>

              <Separator />

              {/* Observações */}
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais sobre a venda..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end pt-4">
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="w-full md:w-auto min-w-[200px]"
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Salvar Venda
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Resumo lateral */}
          <div className="lg:sticky lg:top-6 h-fit">
            <SalesSummaryCard
              customerName={customerName}
              routeText={flightSegments
                .map((s) =>
                  s.from && s.to ? `${s.from} → ${s.to}` : ""
                )
                .filter(Boolean)
                .join(" / ")}
              departureDate={flightSegments[0]?.date || ""}
              returnDate={
                tripType === "round_trip" && flightSegments[1]?.date
                  ? flightSegments[1].date
                  : undefined
              }
              passengers={passengers}
              milesNeeded={totalMiles.toString()}
              priceTotal={priceTotal}
              boardingFee={boardingFeePerPassenger.toFixed(2)}
              paymentMethod={selectedPaymentMethod?.method_name || ""}
              saleSource={
                saleSource === "internal_account"
                  ? "Conta Interna"
                  : "Balcão de Milhas"
              }
            />
          </div>
        </div>

        {/* Diálogos */}
        <PassengerCPFDialog
          open={showPassengerDialog}
          onOpenChange={setShowPassengerDialog}
          passengers={passengerCpfs}
          expectedCount={passengers || 1}
          onSave={(cpfs) => setPassengerCpfs(cpfs)}
        />

        {lastSaleData && (
          <SaleSuccessDialog
            open={showSuccessDialog}
            onClose={() => setShowSuccessDialog(false)}
            saleData={lastSaleData}
          />
        )}
      </div>
    </div>
  );
}
