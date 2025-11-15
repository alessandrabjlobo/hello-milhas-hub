import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type PassengerCPF as PassengerCPFType } from "@/hooks/useSales";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupplierAirlines } from "@/hooks/useSupplierAirlines";
import { usePaymentInterestConfig } from "@/hooks/usePaymentInterestConfig";
import { maskCPF, maskPhone } from "@/lib/input-masks";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Users,
  Building2,
  AlertCircle,
  FileUp,
  Edit3,
} from "lucide-react";
import { SalesSummaryCard } from "@/components/sales/SaleSummaryCard";
import { SaleSuccessDialog } from "@/components/sales/SaleSuccessDialog";
import { PassengerCPFDialog } from "@/components/sales/PassengerCPFDialog";
import { FlightSegmentForm } from "@/components/sales/FlightSegmentForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccountCombobox } from "@/components/sales/AccountCombobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calculator } from "lucide-react";
import { RegisterTicketDialog } from "@/components/tickets/RegisterTicketDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BilheteTicketExtractor } from "@/components/tickets/BilheteTicketExtractor";
import { AutoFilledInput } from "@/components/ui/auto-filled-input";
import { createSaleWithSegments } from "@/services/saleService";
import { formatMiles } from "@/lib/utils";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

// Type definitions
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

const steps = ["Dados da Venda", "Finalização"];

export default function NewSaleWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const { accounts } = useMileageAccounts();
  const { supplierId } = useUserRole();
  const { linkedAirlines } = useSupplierAirlines(supplierId);
  const { configs, calculateInstallmentValue } = usePaymentInterestConfig();
  const { activeMethods } = usePaymentMethods();

  // Step 0: Entry method
  const [entryMethod, setEntryMethod] = useState<"pdf" | "manual" | null>(null);
  const [pdfExtracted, setPdfExtracted] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set()
  );

  // Fase 2: Quote conversion
  const [isConvertingQuote, setIsConvertingQuote] = useState(false);
  const [sourceQuote, setSourceQuote] = useState<any>(null);

  // Fase 3: Auto ticket creation
  const [autoCreateTickets, setAutoCreateTickets] = useState(false);

  // Step 1 - Origem da venda (conta interna ou balcão de milhas)
  const [saleSource, setSaleSource] = useState<
    "internal_account" | "mileage_counter"
  >("internal_account");
  const [counterSellerName, setCounterSellerName] = useState("");
  const [counterSellerContact, setCounterSellerContact] = useState("");
  const [counterAirlineProgram, setCounterAirlineProgram] = useState("");
  const [counterCostPerThousand, setCounterCostPerThousand] = useState("");

  // Step 1 - Client & Flight
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [tripType, setTripType] = useState<
    "one_way" | "round_trip" | "multi_city"
  >("round_trip");
  const [passengers, setPassengers] = useState(1);
  const [passengerCpfs, setPassengerCpfs] = useState<PassengerCPF[]>([]);
  const [showPassengerDialog, setShowPassengerDialog] = useState(false);
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [boardingFeeMode, setBoardingFeeMode] = useState<
    "total" | "per_segment"
  >("total");
  const [totalBoardingFee, setTotalBoardingFee] = useState("");

  // Step 2 - Calculation (Internal channel only)
  const [programId, setProgramId] = useState<string>();
  const [accountId, setAccountId] = useState<string>();
  const [pricingType, setPricingType] = useState<
    "per_passenger" | "total"
  >("total");
  const [pricePerPassenger, setPricePerPassenger] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>();
  const [installments, setInstallments] = useState<number>();
  const [pnr, setPnr] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [showCalculatorDialog, setShowCalculatorDialog] = useState(false);
  const [showRegisterTicket, setShowRegisterTicket] = useState(false);

  // Fase 2: Fetch quote and prefill
  useEffect(() => {
    if (quoteId) {
      fetchAndPrefillQuote(quoteId);
    }
  }, [quoteId]);

  const fetchAndPrefillQuote = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setSourceQuote(data);
        setIsConvertingQuote(true);

        // Pré-preencher campos
        setCustomerName(data.client_name || "");
        setCustomerPhone(data.client_phone || "");
        setTripType(
          (data.trip_type as "one_way" | "round_trip" | "multi_city") ||
            "round_trip"
        );
        setPassengers(data.passengers || 1);

        if (data.flight_segments && Array.isArray(data.flight_segments)) {
          setFlightSegments(data.flight_segments as unknown as FlightSegment[]);
        }

        setPriceTotal(data.total_price?.toString() || "");

        if (data.installments) {
          setInstallments(data.installments);
        }

        toast({
          title: "Orçamento carregado!",
          description: `Pré-preenchendo com dados do orçamento de ${data.client_name}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar orçamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Fase 3: Create tickets for passengers
  const createTicketsForPassengers = async (saleId: string) => {
    try {
      const route = flightSegments
        .map((s) => `${s.from} → ${s.to}`)
        .join(" / ");
      const selectedAccount = filteredAccounts.find((a) => a.id === accountId);
      const airline =
        selectedAccount?.airline_companies?.name ||
        counterAirlineProgram ||
        "Companhia";

      const ticketsToInsert = passengerCpfs.map((passenger) => ({
        sale_id: saleId,
        passenger_name: passenger.name,
        passenger_cpf_encrypted: passenger.cpf,
        route,
        departure_date:
          flightSegments[0]?.date ||
          new Date().toISOString().split("T")[0],
        return_date: flightSegments[1]?.date || null,
        airline,
        status: "pending" as const,
        ticket_code: `TKT${Date.now()}${Math.random()
          .toString(36)
          .substr(2, 5)
          .toUpperCase()}`,
        pnr: pnr || null, // FASE 1: Adicionar PNR
        issued_at: pnr ? new Date().toISOString() : null, // FASE 1: Marcar como emitido se tem PNR
      }));

      const { error } = await supabase.from("tickets").insert(ticketsToInsert);

      if (error) throw error;

      toast({
        title: "Passagens criadas!",
        description: `${ticketsToInsert.length} passagem(ns) registrada(s) com sucesso.`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar passagens",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  // Filter accounts - show all active accounts
  const filteredAccounts = accounts.filter((acc) => acc.status === "active");

  // Update flight segments based on trip type
  const updateTripType = (type: typeof tripType) => {
    setTripType(type);
    if (type === "one_way") {
      setFlightSegments([{ from: "", to: "", date: "" }]);
    } else if (type === "round_trip") {
      setFlightSegments([
        { from: "", to: "", date: "" },
        { from: "", to: "", date: "" },
      ]);
    } else {
      // multi_city starts with 2 segments
      setFlightSegments([
        { from: "", to: "", date: "" },
        { from: "", to: "", date: "" },
      ]);
    }
  };

  const addFlightSegment = () => {
    if (flightSegments.length < 6) {
      setFlightSegments([
        ...flightSegments,
        { from: "", to: "", date: "" },
      ]);
    }
  };

  const removeFlightSegment = (index: number) => {
    setFlightSegments(flightSegments.filter((_, i) => i !== index));
  };

  const updateFlightSegment = (
    index: number,
    field: keyof FlightSegment,
    value: string | number
  ) => {
    const updated = [...flightSegments];
    updated[index] = { ...updated[index], [field]: value };
    setFlightSegments(updated);
  };

  const handlePDFDataExtracted = (data: any) => {
    setPdfExtracted(true);
    setExtractedData(data);

    const newAutoFilled = new Set<string>();

    if (data.passengerName) {
      setCustomerName(data.passengerName);
      newAutoFilled.add("customerName");
    }
    if (data.cpf) {
      setCustomerCpf(data.cpf);
      newAutoFilled.add("customerCpf");
    }
    if (data.pnr) {
      setPnr(data.pnr);
      newAutoFilled.add("pnr");
    }
    if (data.ticketNumber) {
      setTicketNumber(data.ticketNumber);
      newAutoFilled.add("ticketNumber");
    }
    if (data.departureDate) {
      setIssueDate(data.departureDate);
      newAutoFilled.add("issueDate");
    }
    if (data.route) {
      const [from, to] = data.route.split(/[-\/]/);
      if (from && to) {
        setFlightSegments([
          {
            from: from.trim(),
            to: to.trim(),
            date: data.departureDate || "",
          },
        ]);
        newAutoFilled.add("flightSegments");
      }
    }

    setAutoFilledFields(newAutoFilled);
  };

  const validateStep1 = () => {
    const missing: string[] = [];
    if (!customerName) missing.push("Nome do cliente");
    if (!customerCpf) missing.push("CPF do cliente");
    if (!saleSource) missing.push("Origem da venda");
    if (passengers === 0) missing.push("Número de passageiros");
    if (passengerCpfs.length !== passengers)
      missing.push("CPFs dos passageiros");
    if (
      flightSegments.length === 0 ||
      !flightSegments.every((s) => s.from && s.to && s.date)
    ) {
      missing.push("Trechos de voo completos");
    }

    if (missing.length > 0) {
      toast({
        title: "Campos obrigatórios faltando",
        description: missing.join(", "),
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!entryMethod) {
        toast({
          title: "Selecione um método",
          description: "Escolha entre Upload de PDF ou Entrada Manual",
          variant: "destructive",
        });
        return;
      }
      if (entryMethod === "pdf" && !pdfExtracted) {
        toast({
          title: "Aviso",
          description:
            "PDF não extraído. Você pode preencher os dados manualmente no próximo passo.",
        });
      }
    }

    if (currentStep === 1 && !validateStep1()) {
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const selectedAccount = filteredAccounts.find((a) => a.id === accountId);
    const airline =
      selectedAccount?.airline_companies?.name ||
      counterAirlineProgram ||
      "Companhia";

    // Calculate totals from segments
    const totalMiles = flightSegments.reduce(
      (sum, seg) => sum + (seg.miles || 0) * passengers,
      0
    );

    const getTotalBoardingFee = () => {
      if (boardingFeeMode === "total") {
        return parseFloat(totalBoardingFee || "0") * passengers;
      } else {
        return flightSegments.reduce(
          (sum, seg) => sum + (seg.boardingFee || 0) * passengers,
          0
        );
      }
    };

    const totalBoardingFeeAmount = getTotalBoardingFee();
    const boardingFeePerPassenger = totalBoardingFeeAmount / passengers;

    // Calculate interest if applicable
    let finalPrice = parseFloat(priceTotal) || 0;
    let interestRate = 0;
    if (paymentMethod === "credit_card" && installments && installments > 1) {
      const result = calculateInstallmentValue(finalPrice, installments);
      finalPrice = result.finalPrice;
      interestRate = result.interestRate;
    }

    // FASE 1: Buscar CPF disponível para vincular à venda usando a view com status computado
    let cpfUsedId = null;
    if (
      saleSource === "internal_account" &&
      accountId &&
      passengerCpfs.length > 0
    ) {
      // Primeiro buscar a airline_company_id da conta
      const { data: accountData } = await supabase
        .from("mileage_accounts")
        .select("airline_company_id")
        .eq("id", accountId)
        .single();

      if (accountData) {
        const { data: availableCPF } = await supabase
          .from("cpf_registry_with_status")
          .select("id")
          .eq("airline_company_id", accountData.airline_company_id)
          .eq("computed_status", "available")
          .order("usage_count", { ascending: true })
          .limit(1)
          .maybeSingle();

        cpfUsedId = availableCPF?.id || null;

        // Se não encontrou CPF disponível, criar um novo a partir do primeiro passageiro
        if (!cpfUsedId && passengerCpfs.length > 0) {
          const firstPassenger = passengerCpfs[0];
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const { data: newCPF } = await supabase
              .from("cpf_registry")
              .insert({
                airline_company_id: accountData.airline_company_id,
                full_name: firstPassenger.name,
                cpf_encrypted: firstPassenger.cpf,
                user_id: user.id,
                status: "available",
                usage_count: 0,
              })
              .select("id")
              .single();

            cpfUsedId = newCPF?.id || null;
          }
        }
      }
    }

    const formData = {
      channel: saleSource === "internal_account" ? "internal" as const : "balcao" as const,
      customerName,
      customerCpf,
      customerPhone,
      passengers,
      tripType,
      flightSegments,
      paymentMethod,
      notes,
      programId: saleSource === "internal_account" ? programId : undefined,
      accountId: saleSource === "internal_account" ? accountId : undefined,
      sellerName: saleSource === "mileage_counter" ? counterSellerName : undefined,
      sellerContact: saleSource === "mileage_counter" ? counterSellerContact : undefined,
      counterCostPerThousand: saleSource === "mileage_counter" ? Number(counterCostPerThousand) : undefined,
    };

    const result = await createSaleWithSegments(formData, supplierId!);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    const saleId = result.saleId;

    setSaving(false);

    // Fase 2: Atualizar quote como convertido
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

    // Fase 3: Criar passagens automaticamente se checkbox marcado
    if (saleId && typeof saleId === "string") {
      if (autoCreateTickets) {
        await createTicketsForPassengers(saleId);
      }

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
        ticketsCreated: autoCreateTickets,
        saleId: saleId,
        saleSource,
        accountInfo:
          saleSource === "internal_account" && selectedAccount
            ? {
                airlineName: selectedAccount.airline_companies?.name || "",
                accountNumber: selectedAccount.account_number || "",
                accountHolderName:
                  selectedAccount.account_holder_name || "Não informado",
                supplierName: "Fornecedor", // TODO: Buscar do suppliers se necessário
                costPerThousand:
                  (selectedAccount.cost_per_mile || 0.029) * 1000,
                cpfsUsed: passengerCpfs.length,
              }
            : undefined,
      });
      setShowSuccessDialog(true);
    }
  };

  // Validation
  const canProceedStep0 =
    !!entryMethod && (entryMethod === "manual" || pdfExtracted);

  const canProceedStep1 =
    customerName &&
    customerCpf &&
    passengers > 0 &&
    passengerCpfs.length === passengers &&
    flightSegments.length > 0 &&
    flightSegments.every((s) => s.from && s.to && s.date && s.miles) &&
    (boardingFeeMode === "total"
      ? totalBoardingFee
      : flightSegments.every((s) => s.boardingFee !== undefined)) &&
    (saleSource === "internal_account" ||
      (saleSource === "mileage_counter" &&
        counterSellerName &&
        counterAirlineProgram &&
        counterCostPerThousand));

  const canProceedStep2 =
    (saleSource === "mileage_counter" || accountId) &&
    (pricePerPassenger || priceTotal) &&
    paymentMethod;

  // Progress calculation
  const extractedFieldsStatus = {
    pnr: extractedData?.pnr ? "✓" : "⚠",
    passengerName: extractedData?.passengerName ? "✓" : "⚠",
    cpf: extractedData?.cpf ? "✓" : "⚠",
    route: extractedData?.route ? "✓" : "⚠",
    ticketNumber: extractedData?.ticketNumber ? "✓" : "⚠",
  };

  const extractedCount = Object.values(extractedFieldsStatus).filter(
    (v) => v === "✓"
  ).length;
  const totalFields = Object.keys(extractedFieldsStatus).length;
  const completionPercentage = Math.round(
    (extractedCount / totalFields) * 100
  );

  // Calculate installment details
  const installmentDetails =
    paymentMethod === "credit_card" && installments && priceTotal
      ? calculateInstallmentValue(parseFloat(priceTotal), installments)
      : null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/sales")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nova Venda</h1>
            <p className="text-muted-foreground">
              Etapa {currentStep + 1} de {steps.length}: {steps[currentStep]}
            </p>
          </div>
        </div>

        {/* Fase 2: Banner de conversão de orçamento */}
        {isConvertingQuote && sourceQuote && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              📋 Convertendo orçamento #{sourceQuote.id.slice(0, 8)} de{" "}
              {sourceQuote.client_name} criado em{" "}
              {new Date(sourceQuote.created_at).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((step, idx) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded ${
                idx <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              {/* STEP 0: Entry Method Selection */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">
                    Como deseja registrar a venda?
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card
                      className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                        entryMethod === "pdf"
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setEntryMethod("pdf")}
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 rounded-full bg-primary/10">
                          <FileUp className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            Upload de PDF
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Envie o bilhete em PDF e extraia automaticamente os
                            dados da passagem
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card
                      className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                        entryMethod === "manual"
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setEntryMethod("manual")}
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 rounded-full bg-primary/10">
                          <Edit3 className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            Entrada Manual
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Preencha manualmente todos os campos do formulário
                            de venda
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {entryMethod === "pdf" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <BilheteTicketExtractor
                        onDataExtracted={handlePDFDataExtracted}
                      />

                      {!pdfExtracted && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="flex items-center justify-between">
                            <span>
                              Extração ainda não realizada ou falhou
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEntryMethod("manual");
                                setExtractedData(null);
                                setPdfExtracted(false);
                              }}
                            >
                              Mudar para Manual
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      {pdfExtracted && extractedData && (
                        <Card className="p-4 border-primary bg-primary/5">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold flex items-center gap-2">
                                📊 Progresso da Extração
                              </h3>
                              <Badge variant="secondary">
                                {completionPercentage}% completo
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {extractedFieldsStatus.pnr}
                                </span>
                                <span className="text-muted-foreground">
                                  PNR
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {extractedFieldsStatus.passengerName}
                                </span>
                                <span className="text-muted-foreground">
                                  Passageiro
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {extractedFieldsStatus.cpf}
                                </span>
                                <span className="text-muted-foreground">
                                  CPF
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {extractedFieldsStatus.route}
                                </span>
                                <span className="text-muted-foreground">
                                  Rota
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {extractedFieldsStatus.ticketNumber}
                                </span>
                                <span className="text-muted-foreground">
                                  Bilhete
                                </span>
                              </div>
                            </div>

                            {completionPercentage < 100 && (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Alguns campos não foram extraídos
                                  automaticamente. Você poderá preenchê-los
                                  manualmente nas próximas etapas.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: SALES DATA */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Origem da Venda</h2>
                  <RadioGroup
                    value={saleSource}
                    onValueChange={(v) =>
                      setSaleSource(v as typeof saleSource)
                    }
                  >
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        saleSource === "internal_account"
                          ? "border-primary ring-2 ring-primary/20"
                          : ""
                      }`}
                      onClick={() => setSaleSource("internal_account")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="internal_account"
                          id="internal_account"
                        />
                        <Label
                          htmlFor="internal_account"
                          className="cursor-pointer flex items-center gap-2 flex-1"
                        >
                          <Users className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">Conta Interna</p>
                            <p className="text-sm text-muted-foreground">
                              Usar conta de milhagem própria
                            </p>
                          </div>
                        </Label>
                      </div>
                    </Card>

                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        saleSource === "mileage_counter"
                          ? "border-primary ring-2 ring-primary/20"
                          : ""
                      }`}
                      onClick={() => setSaleSource("mileage_counter")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="mileage_counter"
                          id="mileage_counter"
                        />
                        <Label
                          htmlFor="mileage_counter"
                          className="cursor-pointer flex items-center gap-2 flex-1"
                        >
                          <Building2 className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">Balcão de Milhas</p>
                            <p className="text-sm text-muted-foreground">
                              Comprar de fornecedor externo
                            </p>
                          </div>
                        </Label>
                      </div>
                    </Card>
                  </RadioGroup>

                  {saleSource === "internal_account" && (
                    <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm font-medium">Selecionar Conta</p>
                      <div>
                        <Label htmlFor="account">Conta de Milhagem *</Label>
                        {filteredAccounts.length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Nenhuma conta disponível. Configure seus programas
                              em{" "}
                              <Button
                                variant="link"
                                className="p-0 h-auto"
                                onClick={() =>
                                  navigate("/settings/programs")
                                }
                              >
                                Regras de Programas
                              </Button>
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <AccountCombobox
                            accounts={filteredAccounts}
                            value={accountId}
                            onChange={setAccountId}
                            placeholder="Busque por companhia ou número da conta..."
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {saleSource === "mileage_counter" && (
                    <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm font-medium">
                        Informações do Fornecedor
                      </p>
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
                          placeholder="Nome do vendedor"
                        />
                      </div>
                      <div>
                        <Label htmlFor="counterSellerContact">
                          Contato do Vendedor
                        </Label>
                        <Input
                          id="counterSellerContact"
                          value={counterSellerContact}
                          onChange={(e) =>
                            setCounterSellerContact(
                              maskPhone(e.target.value)
                            )
                          }
                          placeholder="(11) 99999-9999"
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
                          placeholder="Ex: LATAM Pass, Smiles, etc"
                        />
                      </div>
                      <div>
                        <Label htmlFor="counterCostPerThousand">
                          Custo do Milheiro (R$/1000 milhas) *
                          <span className="text-xs text-muted-foreground ml-2">
                            Quanto você pagou ao fornecedor
                          </span>
                        </Label>
                        <Input
                          id="counterCostPerThousand"
                          type="number"
                          step="0.01"
                          value={counterCostPerThousand}
                          onChange={(e) =>
                            setCounterCostPerThousand(e.target.value)
                          }
                          placeholder="Ex: 25.00"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cliente & voo (parte do Step 1 para você não perder contexto) */}
                  <h2 className="text-xl font-semibold">Cliente & Voo</h2>

                  {/* Client Info */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <p className="font-medium">Dados do Cliente</p>
                    <AutoFilledInput
                      id="customerName"
                      label="Nome do Cliente"
                      value={customerName}
                      onChange={(e) =>
                        setCustomerName(e.target.value)
                      }
                      placeholder="Nome completo"
                      autoFilled={autoFilledFields.has("customerName")}
                      isRequired={true}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerPhone">Telefone</Label>
                        <Input
                          id="customerPhone"
                          value={customerPhone}
                          onChange={(e) =>
                            setCustomerPhone(
                              maskPhone(e.target.value)
                            )
                          }
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <AutoFilledInput
                        id="customerCpf"
                        label="CPF"
                        value={customerCpf}
                        onChange={(e) =>
                          setCustomerCpf(maskCPF(e.target.value))
                        }
                        placeholder="000.000.000-00"
                        maxLength={14}
                        autoFilled={autoFilledFields.has("customerCpf")}
                        isRequired={true}
                      />
                    </div>
                  </div>

                  {/* Trip Type & Passengers */}
                  <div className="space-y-4">
                    <div>
                      <Label>Tipo de Viagem *</Label>
                      <RadioGroup
                        value={tripType}
                        onValueChange={(v) =>
                          updateTripType(v as typeof tripType)
                        }
                      >
                        <div className="flex gap-4 flex-wrap">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="one_way"
                              id="one_way"
                            />
                            <Label htmlFor="one_way">Só Ida</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="round_trip"
                              id="round_trip"
                            />
                            <Label htmlFor="round_trip">
                              Ida e Volta
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="multi_city"
                              id="multi_city"
                            />
                            <Label htmlFor="multi_city">
                              Múltiplos Trechos
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="passengers">
                        Número de Passageiros *
                      </Label>
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

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPassengerDialog(true)}
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {passengerCpfs.length === 0
                        ? "Adicionar CPFs dos Passageiros"
                        : `${passengerCpfs.length} de ${passengers} passageiro(s) adicionado(s)`}
                    </Button>

                    {passengerCpfs.length !== passengers && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          É necessário adicionar o CPF de todos os{" "}
                          {passengers} passageiro(s) para continuar.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Boarding Fee Mode */}
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <Label className="font-semibold">
                      Taxas de Embarque
                    </Label>
                    <RadioGroup
                      value={boardingFeeMode}
                      onValueChange={(value: "total" | "per_segment") =>
                        setBoardingFeeMode(value)
                      }
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2 border rounded p-3 cursor-pointer hover:bg-accent">
                        <RadioGroupItem value="total" id="fee-total" />
                        <Label
                          htmlFor="fee-total"
                          className="cursor-pointer flex-1"
                        >
                          <div>
                            <p className="font-semibold">
                              Taxa Total
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Valor único para toda viagem (mais comum)
                            </p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded p-3 cursor-pointer hover:bg-accent">
                        <RadioGroupItem
                          value="per_segment"
                          id="fee-segment"
                        />
                        <Label
                          htmlFor="fee-segment"
                          className="cursor-pointer flex-1"
                        >
                          <div>
                            <p className="font-semibold">
                              Taxa por Trecho
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Valores individuais por segmento
                            </p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>

                    {boardingFeeMode === "total" && (
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="total-boarding-fee">
                          Taxa de Embarque Total (por passageiro) *
                        </Label>
                        <Input
                          id="total-boarding-fee"
                          type="number"
                          step="0.01"
                          placeholder="Ex: 70.00"
                          value={totalBoardingFee}
                          onChange={(e) =>
                            setTotalBoardingFee(e.target.value)
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Total de taxas para 1 passageiro em todos os
                          trechos
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Flight Segments */}
                  <div className="space-y-4">
                    <Label>Trechos do Voo *</Label>
                    {flightSegments.map((segment, index) => (
                      <FlightSegmentForm
                        key={index}
                        segment={segment}
                        index={index}
                        onUpdate={updateFlightSegment}
                        onRemove={
                          tripType === "multi_city" &&
                          flightSegments.length > 1
                            ? removeFlightSegment
                            : undefined
                        }
                        canRemove={
                          tripType === "multi_city" &&
                          flightSegments.length > 1
                        }
                        showBoardingFee={
                          boardingFeeMode === "per_segment"
                        }
                        title={
                          tripType === "round_trip"
                            ? index === 0
                              ? "Ida"
                              : "Volta"
                            : undefined
                        }
                      />
                    ))}

                    {tripType === "multi_city" &&
                      flightSegments.length < 6 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addFlightSegment}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Trecho
                        </Button>
                      )}
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) =>
                        setNotes(e.target.value)
                      }
                      placeholder="Observações adicionais..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Calculation & Finalização */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Cálculo</h2>

                  {/* Calculate totals automatically */}
                  {(() => {
                    const totalMiles = flightSegments.reduce(
                      (sum, seg) =>
                        sum + (seg.miles || 0) * passengers,
                      0
                    );

                    const getTotalBoardingFee = () => {
                      if (boardingFeeMode === "total") {
                        return (
                          parseFloat(totalBoardingFee || "0") *
                          passengers
                        );
                      } else {
                        return flightSegments.reduce(
                          (sum, seg) =>
                            sum +
                            (seg.boardingFee || 0) * passengers,
                          0
                        );
                      }
                    };

                    const totalBoardingFeeAmount =
                      getTotalBoardingFee();

                    const getCostPerThousand = () => {
                      if (
                        saleSource === "internal_account" &&
                        accountId
                      ) {
                        const account = filteredAccounts.find(
                          (a) => a.id === accountId
                        );
                        return (
                          (account?.cost_per_mile || 0.029) * 1000
                        );
                      } else if (
                        saleSource === "mileage_counter" &&
                        counterCostPerThousand
                      ) {
                        return parseFloat(counterCostPerThousand);
                      }
                      return 0;
                    };

                    const milesCost =
                      (totalMiles / 1000) * getCostPerThousand();
                    const totalCost = milesCost + totalBoardingFeeAmount;

                    return (
                      <>
                        {/* Account Selection (only for internal) */}
                        {saleSource === "internal_account" && (
                          <div>
                            <Label htmlFor="account">
                              Conta de Milhagem *
                            </Label>
                            {filteredAccounts.length === 0 ? (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Nenhuma conta disponível. Configure
                                  seus programas em{" "}
                                  <Button
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={() =>
                                      navigate("/settings/programs")
                                    }
                                  >
                                    Regras de Programas
                                  </Button>
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <AccountCombobox
                                accounts={filteredAccounts}
                                value={accountId}
                                onChange={setAccountId}
                                placeholder="Busque por companhia ou número da conta..."
                              />
                            )}
                          </div>
                        )}

                        {/* Resumo Automático dos Trechos */}
                        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                          <div className="space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                              ✈️ Resumo da Viagem
                            </h3>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  Total Milhas
                                </p>
                                <p className="font-bold text-lg">
                                  {formatMiles(totalMiles)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatMiles(flightSegments.reduce(
                                    (s, seg) => s + (seg.miles || 0),
                                    0
                                  ))}{" "}
                                  × {passengers} pax
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  Total Taxas
                                </p>
                                <p className="font-bold text-lg">
                                  R${" "}
                                  {totalBoardingFeeAmount.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {boardingFeeMode === "total"
                                    ? `R$ ${parseFloat(
                                        totalBoardingFee || "0"
                                      ).toFixed(2)} × ${passengers} pax`
                                    : `Soma dos ${flightSegments.length} trechos`}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  Custo Estimado
                                </p>
                                <p className="font-bold text-lg text-orange-600">
                                  R$ {totalCost.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Milhas + Taxas
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>

                        {/* Pricing */}
                        <div>
                          <Label>Tipo de Precificação</Label>
                          <RadioGroup
                            value={pricingType}
                            onValueChange={(v) =>
                              setPricingType(
                                v as typeof pricingType
                              )
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="per_passenger"
                                id="per_passenger"
                              />
                              <Label htmlFor="per_passenger">
                                Preço por Passageiro
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="total"
                                id="total"
                              />
                              <Label htmlFor="total">
                                Preço Total
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {pricingType === "per_passenger" ? (
                          <div>
                            <Label htmlFor="pricePerPassenger">
                              Preço por Passageiro (R$) *
                            </Label>
                            <Input
                              id="pricePerPassenger"
                              type="number"
                              step="0.01"
                              value={pricePerPassenger}
                              onChange={(e) => {
                                setPricePerPassenger(
                                  e.target.value
                                );
                                const total =
                                  parseFloat(e.target.value) *
                                  passengers;
                                setPriceTotal(total.toFixed(2));
                              }}
                              placeholder="Ex: 1500.00"
                            />
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="priceTotal">
                              Preço Total (R$) *
                            </Label>
                            <Input
                              id="priceTotal"
                              type="number"
                              step="0.01"
                              value={priceTotal}
                              onChange={(e) => {
                                setPriceTotal(e.target.value);
                                const perPassenger =
                                  parseFloat(e.target.value) /
                                  passengers;
                                setPricePerPassenger(
                                  perPassenger.toFixed(2)
                                );
                              }}
                              placeholder="Ex: 3000.00"
                            />
                          </div>
                        )}

                        {/* Análise de Lucro Compacta */}
                        {priceTotal &&
                          totalMiles > 0 &&
                          ((saleSource === "internal_account" &&
                            accountId) ||
                            saleSource === "mileage_counter") && (
                            <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200">
                              <h3 className="font-semibold text-xs text-green-900 dark:text-green-100 mb-2">
                                💰 Análise de Lucro
                              </h3>
                              <div className="grid grid-cols-4 gap-3 text-xs">
                                <div>
                                  <p className="text-muted-foreground">
                                    Custo/pax
                                  </p>
                                  <p className="font-bold">
                                    R${" "}
                                    {(
                                      totalCost / passengers
                                    ).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Custo Total
                                  </p>
                                  <p className="font-bold text-orange-600">
                                    R$ {totalCost.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Lucro
                                  </p>
                                  <p className="font-bold text-green-600">
                                    R${" "}
                                    {(
                                      parseFloat(priceTotal) -
                                      totalCost
                                    ).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Margem
                                  </p>
                                  <p className="font-bold text-blue-600">
                                    {(
                                      ((parseFloat(priceTotal) -
                                        totalCost) /
                                        parseFloat(
                                          priceTotal
                                        )) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </p>
                                </div>
                              </div>
                            </Card>
                          )}
                      </>
                    );
                  })()}

                  {/* Payment Method */}
                  <div>
                    <Label htmlFor="paymentMethod">
                      Forma de Pagamento *
                    </Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) => {
                        setPaymentMethod(v);
                        if (v !== "credit_card") {
                          setInstallments(undefined);
                        }
                      }}
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.method_name}
                            {method.method_type === 'pix' && method.additional_info?.pix_holder && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({method.additional_info.pix_holder})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Info PIX quando selecionado */}
                    {paymentMethod && (() => {
                      const selectedMethod = activeMethods.find(m => m.id === paymentMethod);
                      if (selectedMethod?.method_type === 'pix' && selectedMethod.additional_info) {
                        return (
                          <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                            <div className="space-y-1 text-sm">
                              {selectedMethod.additional_info.pix_key && (
                                <div>
                                  <span className="font-semibold">Chave PIX:</span>{" "}
                                  <span className="text-muted-foreground">
                                    {selectedMethod.additional_info.pix_key}
                                  </span>
                                </div>
                              )}
                              {selectedMethod.additional_info.pix_holder && (
                                <div>
                                  <span className="font-semibold">Titular:</span>{" "}
                                  <span className="text-muted-foreground">
                                    {selectedMethod.additional_info.pix_holder}
                                  </span>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      }
                    })()}
                  </div>

                  {/* Installments (only for credit card) */}
                  {paymentMethod === "credit_card" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <Label htmlFor="installments">
                        Parcelamento
                      </Label>
                      {configs.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Configure as taxas de juros em{" "}
                            <Button
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() =>
                                navigate("/settings/credit")
                              }
                            >
                              Configurações de Crédito
                            </Button>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Select
                            value={installments?.toString()}
                            onValueChange={(v) =>
                              setInstallments(parseInt(v))
                            }
                          >
                            <SelectTrigger id="installments">
                              <SelectValue placeholder="Selecione o número de parcelas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">
                                À vista (sem juros)
                              </SelectItem>
                              {configs.map((config) => (
                                <SelectItem
                                  key={config.id}
                                  value={config.installments.toString()}
                                >
                                  {config.installments}x - Taxa:{" "}
                                  {config.interest_rate}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {installmentDetails &&
                            installments &&
                            installments > 1 && (
                              <div className="space-y-2 text-sm p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                                <div className="flex justify-between font-semibold text-green-600">
                                  <span>💰 Você recebe:</span>
                                  <span>
                                    R${" "}
                                    {parseFloat(
                                      priceTotal
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1 border-t pt-2 mt-2">
                                  <div className="flex justify-between">
                                    <span>
                                      Cliente paga (
                                      {installments}x):
                                    </span>
                                    <span>
                                      R${" "}
                                      {installmentDetails.installmentValue.toFixed(
                                        2
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>
                                      Total cliente (com juros):
                                    </span>
                                    <span>
                                      R${" "}
                                      {installmentDetails.finalPrice.toFixed(
                                        2
                                      )}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-2">
                                    💡 Juros de{" "}
                                    {
                                      installmentDetails.interestRate
                                    }
                                    % ficam com a operadora do cartão
                                  </div>
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  )}

                  {/* PNR */}
                  <AutoFilledInput
                    id="pnr"
                    label="PNR / Localizador"
                    value={pnr}
                    onChange={(e) =>
                      setPnr(e.target.value.toUpperCase())
                    }
                    placeholder="Ex: ABC123"
                    maxLength={10}
                    autoFilled={
                      autoFilledFields.has("pnr") ||
                      (extractedData?.pnr ? true : false)
                    }
                    isRequired={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pode ser preenchido depois, se ainda não
                    disponível
                  </p>

                  {/* Ticket Number */}
                  <AutoFilledInput
                    id="ticketNumber"
                    label="Número do Bilhete"
                    value={ticketNumber}
                    onChange={(e) =>
                      setTicketNumber(e.target.value)
                    }
                    placeholder="Ex: 000-0000000000"
                    autoFilled={
                      autoFilledFields.has("ticketNumber") ||
                      (extractedData?.ticketNumber ? true : false)
                    }
                    isRequired={false}
                  />

                  {/* Issue Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Data de Emissão
                    </label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) =>
                        setIssueDate(e.target.value)
                      }
                      className={
                        autoFilledFields.has("issueDate")
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : ""
                      }
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                {currentStep < steps.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={
                      (currentStep === 0 && !canProceedStep0) ||
                      (currentStep === 1 && !canProceedStep1)
                    }
                  >
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={async () => {
                      setAutoCreateTickets(true);
                      await handleSave();
                    }}
                    disabled={saving || !canProceedStep2}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {saving
                      ? "Salvando e Emitindo..."
                      : "Finalizar e Emitir Passagens"}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1 space-y-6">
            <SalesSummaryCard
              customerName={customerName}
              routeText={flightSegments
                .map((s) => `${s.from} → ${s.to}`)
                .join(" / ")}
              departureDate={flightSegments[0]?.date}
              returnDate={flightSegments[1]?.date}
              passengers={passengers}
              milesNeeded={flightSegments
                .reduce(
                  (sum, seg) => sum + (seg.miles || 0) * passengers,
                  0
                )
                .toString()}
              priceTotal={
                installmentDetails?.finalPrice.toFixed(2) ||
                priceTotal
              }
            />
          </div>
        </div>
      </div>

      {/* Passenger CPF Dialog */}
      <PassengerCPFDialog
        open={showPassengerDialog}
        onOpenChange={setShowPassengerDialog}
        passengers={passengerCpfs}
        onSave={setPassengerCpfs}
        expectedCount={passengers}
      />

      {/* Success Dialog */}
      {lastSaleData && (
        <SaleSuccessDialog
          open={showSuccessDialog}
          onClose={() => {
            setShowSuccessDialog(false);
            navigate("/sales");
          }}
          onRegisterTicket={
            lastSaleData?.ticketsCreated
              ? undefined
              : () => {
                  setShowSuccessDialog(false);
                  setShowRegisterTicket(true);
                }
          }
          saleData={lastSaleData}
        />
      )}

      {/* Register Ticket Dialog */}
      <RegisterTicketDialog
        open={showRegisterTicket}
        onOpenChange={(open) => {
          setShowRegisterTicket(open);
          if (!open) {
            navigate("/sales");
          }
        }}
        saleId={lastSaleData?.saleId}
      />
    </div>
  );
}
