import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowRight,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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

  const [extractedData, setExtractedData] = useState<any>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [isConvertingQuote, setIsConvertingQuote] = useState(false);
  const [sourceQuote, setSourceQuote] = useState<any>(null);
  const [autoCreateTickets, setAutoCreateTickets] = useState(false);

  const [saleSource, setSaleSource] = useState<"internal_account" | "mileage_counter">("internal_account");
  const [counterSellerName, setCounterSellerName] = useState("");
  const [counterSellerContact, setCounterSellerContact] = useState("");
  const [counterAirlineProgram, setCounterAirlineProgram] = useState("");
  const [counterCostPerThousand, setCounterCostPerThousand] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [tripType, setTripType] = useState<"one_way" | "round_trip" | "multi_city">("one_way");
  const [passengers, setPassengers] = useState(1);
  const [passengerCpfs, setPassengerCpfs] = useState<PassengerCPF[]>([]);
  const [showPassengerDialog, setShowPassengerDialog] = useState(false);

  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "", miles: 0 },
  ]);

  const [boardingFeeMode, setBoardingFeeMode] = useState<"total" | "per_segment">("total");
  const [totalBoardingFee, setTotalBoardingFee] = useState("");

  const [accountId, setAccountId] = useState("");
  const [programId, setProgramId] = useState("");

  const [pricePerPassenger, setPricePerPassenger] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [airline, setAirline] = useState("");
  const [pnr, setPnr] = useState("");
  const [notes, setNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("");
  const [installments, setInstallments] = useState(1);
  const [interestRate, setInterestRate] = useState(0);

  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // Auto-preencher passageiro quando há apenas 1
  useEffect(() => {
    if (passengers === 1 && customerName && customerCpf) {
      if (passengerCpfs.length === 1) {
        const current = passengerCpfs[0];
        if (current.name !== customerName || current.cpf !== customerCpf) {
          setPassengerCpfs([{ name: customerName, cpf: customerCpf }]);
        }
      } else if (passengerCpfs.length === 0) {
        setPassengerCpfs([{ name: customerName, cpf: customerCpf }]);
      }
    }
  }, [passengers, customerName, customerCpf]);

  const handlePDFDataExtracted = (data: any) => {
    const newAutoFilled = new Set<string>();
    
    if (data.passengerName) {
      setCustomerName(data.passengerName);
      newAutoFilled.add("customerName");
    }
    if (data.cpf) {
      setCustomerCpf(maskCPF(data.cpf));
      newAutoFilled.add("customerCpf");
    }
    if (data.airline) {
      setAirline(data.airline);
      newAutoFilled.add("airline");
    }
    if (data.pnr) {
      setPnr(data.pnr);
      newAutoFilled.add("pnr");
    }
    
    setExtractedData(data);
    setAutoFilledFields(newAutoFilled);
    
    toast({
      title: "✅ Dados extraídos do PDF",
      description: "Verifique os campos preenchidos automaticamente",
    });
  };

  // Filtrar contas ativas vinculadas aos programas do fornecedor
  const filteredAccounts = accounts.filter((acc) => {
    if (saleSource === "internal_account") {
      return (
        linkedAirlines.some((la: any) => la.airline_company_id === acc.airline_company_id) &&
        acc.status === "active"
      );
    }
    return false;
  });

  const selectedAccount = filteredAccounts.find((a) => a.id === accountId);

  const updateTripType = (type: typeof tripType) => {
    setTripType(type);
    if (type === "one_way") {
      setFlightSegments([{ from: "", to: "", date: "", miles: 0 }]);
    } else if (type === "round_trip") {
      setFlightSegments([
        { from: "", to: "", date: "", miles: 0 },
        { from: "", to: "", date: "", miles: 0 },
      ]);
    }
  };

  const totalMiles = flightSegments.reduce((sum, s) => sum + (s.miles || 0), 0);
  const boardingFeePerPassenger = boardingFeeMode === "total"
    ? parseFloat(totalBoardingFee) || 0
    : flightSegments.reduce((sum, s) => sum + (s.boardingFee || 0), 0);

  useEffect(() => {
    if (quoteId) {
      fetchAndPrefillQuote(quoteId);
    }
  }, [quoteId]);

  const fetchAndPrefillQuote = async (id: string) => {
    try {
      setIsConvertingQuote(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return;

      setSourceQuote(data);
      setCustomerName(data.client_name || "");
      setCustomerPhone(data.client_phone || "");
      setPriceTotal(data.total_price?.toString() || "");
      setPassengers(data.passengers || 1);
      
      if (data.flight_segments && Array.isArray(data.flight_segments)) {
        setFlightSegments(data.flight_segments as FlightSegment[]);
      }
      
      toast({
        title: "✅ Orçamento carregado",
        description: "Dados preenchidos automaticamente",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar orçamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsConvertingQuote(false);
    }
  };

  const createTicketsForPassengers = async (saleId: string) => {
    try {
      for (let i = 0; i < passengerCpfs.length; i++) {
        const passenger = passengerCpfs[i];
        await supabase.from("tickets").insert({
          sale_id: saleId,
          passenger_name: passenger.name,
          passenger_cpf_encrypted: passenger.cpf,
          airline: airline,
          route: flightSegments.map((s) => `${s.from} → ${s.to}`).join(" / "),
          departure_date: flightSegments[0]?.date || new Date().toISOString(),
          ticket_code: `TKT-${Date.now()}-${i + 1}`,
          status: "pending",
        });
      }
      
      toast({
        title: "✅ Passagens criadas",
        description: `${passengerCpfs.length} passagem(ns) criada(s)`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar passagens",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!supplierId) {
      toast({
        title: "Erro",
        description: "ID do fornecedor não encontrado",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const formData = {
        saleSource,
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
        counterAirlineProgram: saleSource === "mileage_counter" ? counterAirlineProgram : undefined,
        priceTotal: parseFloat(priceTotal) || 0,
        pricePerPassenger: parseFloat(pricePerPassenger) || 0,
        boardingFee: boardingFeePerPassenger,
        totalMiles,
        airline,
        pnr,
        passengerCpfs,
        installments,
        interestRate,
      };

      const result = await createSaleWithSegments(formData, supplierId);
      
      if (result.error) {
        throw new Error(result.error);
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
                  accountHolderName: selectedAccount.account_holder_name || "Não informado",
                  supplierName: "Fornecedor",
                  costPerThousand: (selectedAccount.cost_per_mile || 0.029) * 1000,
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

  const selectedPaymentMethod = activeMethods.find(m => m.id === paymentMethod);
  const canProceedStep2 =
    (saleSource === "mileage_counter" || accountId) &&
    (pricePerPassenger || priceTotal) &&
    selectedPaymentMethod;

  useEffect(() => {
    if (currentStep === steps.length - 1) {
      console.log("🔍 Validação Step Final:", {
        saleSource,
        accountId,
        pricePerPassenger,
        priceTotal,
        paymentMethod,
        selectedPaymentMethod: selectedPaymentMethod?.method_name,
        canProceed: canProceedStep2
      });
      
      if (!canProceedStep2) {
        if (saleSource === "internal_account" && !accountId) {
          console.warn("⚠️ Falta selecionar conta");
        }
        if (!pricePerPassenger && !priceTotal) {
          console.warn("⚠️ Falta informar preço");
        }
        if (!selectedPaymentMethod) {
          console.warn("⚠️ Falta selecionar método de pagamento válido");
        }
      }
    }
  }, [currentStep, saleSource, accountId, pricePerPassenger, priceTotal, paymentMethod, selectedPaymentMethod, canProceedStep2]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSave();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nova Venda</h1>
            <p className="text-muted-foreground">
              Passo {currentStep + 1} de {steps.length}: {steps[currentStep]}
            </p>
          </div>
        </div>

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
          <div className="lg:col-span-2">
            <Card className="p-6">
              {currentStep === 0 && (
                <div className="space-y-6">
                  <Card className="p-4 bg-primary/5 border-primary">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileUp className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold">Extrair dados do bilhete (PDF/IMG)</p>
                          <p className="text-xs text-muted-foreground">
                            Preencha automaticamente os campos a partir do arquivo
                          </p>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FileUp className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Extrair Dados do Bilhete</DialogTitle>
                          </DialogHeader>
                          <BilheteTicketExtractor onDataExtracted={handlePDFDataExtracted} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>

                  <h2 className="text-xl font-semibold">Origem da Venda</h2>
                  <div className="space-y-2">
                    <Label htmlFor="saleSource">Tipo de Origem *</Label>
                    <Select value={saleSource} onValueChange={(v) => setSaleSource(v as typeof saleSource)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a origem da venda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal_account">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <div>
                              <span className="font-medium">Conta Interna</span>
                              <p className="text-xs text-muted-foreground">Usar conta de milhagem própria</p>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="mileage_counter">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <div>
                              <span className="font-medium">Fornecedor (Balcão)</span>
                              <p className="text-xs text-muted-foreground">Comprar de um fornecedor externo</p>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {saleSource === "internal_account" && (
                    <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm font-medium">Selecionar Conta</p>
                      <div>
                        <Label htmlFor="account">Conta de Milhagem *</Label>
                        {filteredAccounts.length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Nenhuma conta disponível. Configure seus programas em{" "}
                              <Button
                                variant="link"
                                className="p-0 h-auto"
                                onClick={() => navigate("/settings/programs")}
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
                      <p className="text-sm font-medium">Informações do Fornecedor</p>
                      <div>
                        <Label htmlFor="counterSellerName">Nome do Vendedor *</Label>
                        <Input
                          id="counterSellerName"
                          value={counterSellerName}
                          onChange={(e) => setCounterSellerName(e.target.value)}
                          placeholder="Nome do vendedor"
                        />
                      </div>
                      <div>
                        <Label htmlFor="counterSellerContact">Contato do Vendedor</Label>
                        <Input
                          id="counterSellerContact"
                          value={counterSellerContact}
                          onChange={(e) => setCounterSellerContact(maskPhone(e.target.value))}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div>
                        <Label htmlFor="counterAirlineProgram">Programa de Milhas *</Label>
                        <Input
                          id="counterAirlineProgram"
                          value={counterAirlineProgram}
                          onChange={(e) => setCounterAirlineProgram(e.target.value)}
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
                          value={counterCostPerThousand}
                          onChange={(e) => setCounterCostPerThousand(e.target.value)}
                          placeholder="Ex: 32.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  )}

                  <h2 className="text-xl font-semibold">Cliente & Voo</h2>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <p className="font-medium">Dados do Cliente</p>
                    <AutoFilledInput
                      id="customerName"
                      label="Nome do Cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
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
                          onChange={(e) => setCustomerPhone(maskPhone(e.target.value))}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <AutoFilledInput
                        id="customerCpf"
                        label="CPF"
                        value={customerCpf}
                        onChange={(e) => setCustomerCpf(maskCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        autoFilled={autoFilledFields.has("customerCpf")}
                        isRequired={true}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Tipo de Viagem *</Label>
                      <RadioGroup
                        value={tripType}
                        onValueChange={(v) => updateTripType(v as typeof tripType)}
                      >
                        <div className="flex gap-4 flex-wrap">
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
                            <Label htmlFor="multi_city">Múltiplos Trechos</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="passengers">Nº Passageiros *</Label>
                        <Input
                          id="passengers"
                          type="number"
                          min="1"
                          value={passengers}
                          onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Taxa de Embarque *</Label>
                        <RadioGroup
                          value={boardingFeeMode}
                          onValueChange={(value: "total" | "per_segment") => setBoardingFeeMode(value)}
                          className="flex gap-4 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="total" id="total" />
                            <Label htmlFor="total" className="cursor-pointer">Total</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="per_segment" id="per_segment" />
                            <Label htmlFor="per_segment" className="cursor-pointer">Por Trecho</Label>
                          </div>
                        </RadioGroup>
                        
                        {boardingFeeMode === "total" && (
                          <Input
                            type="number"
                            placeholder="R$ 0,00 (por passageiro)"
                            value={totalBoardingFee}
                            onChange={(e) => setTotalBoardingFee(e.target.value)}
                            className="mt-2"
                            step="0.01"
                          />
                        )}
                      </div>
                    </div>

                    {passengers > 1 ? (
                      <>
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
                      </>
                    ) : (
                      passengerCpfs.length === 1 && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800 dark:text-green-400">
                            ✅ Passageiro preenchido automaticamente: <strong>{passengerCpfs[0].name}</strong>
                          </AlertDescription>
                        </Alert>
                      )
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Trechos da Viagem *</Label>
                      {tripType === "multi_city" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFlightSegments([
                              ...flightSegments,
                              { from: "", to: "", date: "", miles: 0 },
                            ])
                          }
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Trecho
                        </Button>
                      )}
                    </div>

                    {flightSegments.map((segment, idx) => (
                      <FlightSegmentForm
                        key={idx}
                        segment={segment}
                        index={idx}
                        showBoardingFee={boardingFeeMode === "per_segment"}
                        onUpdate={(index, field, value) => {
                          const newSegments = [...flightSegments];
                          newSegments[index] = { ...newSegments[index], [field]: value };
                          setFlightSegments(newSegments);
                        }}
                        onRemove={(index) => {
                          if (flightSegments.length > 1) {
                            setFlightSegments(flightSegments.filter((_, i) => i !== index));
                          }
                        }}
                        canRemove={flightSegments.length > 1}
                      />
                    ))}

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total de Milhas:</span>
                        <span className="text-lg font-bold text-primary">
                          {formatMiles(totalMiles)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pnr">PNR / Localizador</Label>
                      <AutoFilledInput
                        id="pnr"
                        value={pnr}
                        onChange={(e) => setPnr(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        autoFilled={autoFilledFields.has("pnr")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Informações adicionais sobre a venda..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Finalização</h2>

                  <div className="space-y-4 p-4 border rounded-lg">
                    <Label className="font-semibold">Preços</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pricePerPassenger">Preço por Passageiro</Label>
                        <Input
                          id="pricePerPassenger"
                          type="number"
                          value={pricePerPassenger}
                          onChange={(e) => {
                            setPricePerPassenger(e.target.value);
                            const perPassenger = parseFloat(e.target.value) || 0;
                            setPriceTotal((perPassenger * passengers).toFixed(2));
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

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
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
                      return null;
                    })()}
                  </div>

                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <Checkbox
                      id="autoCreateTickets"
                      checked={autoCreateTickets}
                      onCheckedChange={(checked) => setAutoCreateTickets(checked as boolean)}
                    />
                    <Label htmlFor="autoCreateTickets" className="cursor-pointer">
                      Criar automaticamente as passagens após salvar
                    </Label>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>

                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    (currentStep === 0 && !canProceedStep1) ||
                    (currentStep === 1 && !canProceedStep2) ||
                    saving
                  }
                >
                  {currentStep === steps.length - 1 ? (
                    saving ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Finalizar e Emitir Passagens
                      </>
                    )
                  ) : (
                    <>
                      Próximo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <SalesSummaryCard
              customerName={customerName}
              routeText={flightSegments.map((s) => `${s.from} → ${s.to}`).join(" / ")}
              departureDate={flightSegments[0]?.date || ""}
              returnDate={flightSegments[1]?.date}
              passengers={passengers}
              milesNeeded={totalMiles.toString()}
              priceTotal={priceTotal}
            />
          </div>
        </div>
      </div>

      <PassengerCPFDialog
        open={showPassengerDialog}
        onOpenChange={setShowPassengerDialog}
        passengers={passengerCpfs}
        onSave={setPassengerCpfs}
        expectedCount={passengers}
      />

      <SaleSuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        saleData={lastSaleData}
      />
    </div>
  );
}
