import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useSales, type FlightSegment, type PassengerCPF } from "@/hooks/useSales";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupplierAirlines } from "@/hooks/useSupplierAirlines";
import { useCreditInterestConfig } from "@/hooks/useCreditInterestConfig";
import { maskCPF, maskPhone } from "@/lib/input-masks";
import { ArrowLeft, ArrowRight, Check, Plus, Users, Building2, AlertCircle } from "lucide-react";
import { SalesSummaryCard } from "@/components/sales/SaleSummaryCard";
import { SaleSuccessDialog } from "@/components/sales/SaleSuccessDialog";
import { MarginCalculator } from "@/components/calculator/MarginCalculator";
import { PassengerCPFDialog } from "@/components/sales/PassengerCPFDialog";
import { FlightSegmentForm } from "@/components/sales/FlightSegmentForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccountCombobox } from "@/components/sales/AccountCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator } from "lucide-react";
import { RegisterTicketDialog } from "@/components/tickets/RegisterTicketDialog";

const steps = ["Origem", "Cliente & Voo", "Cálculo", "Confirmar"];

export default function NewSaleWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const { createSale } = useSales();
  const { accounts } = useMileageAccounts();
  const { supplierId } = useUserRole();
  const { linkedAirlines } = useSupplierAirlines(supplierId);
  const { configs, calculateInstallmentValue } = useCreditInterestConfig();

  // Step 0 - Sale Source
  const [saleSource, setSaleSource] = useState<"internal_account" | "mileage_counter">("internal_account");
  const [counterSellerName, setCounterSellerName] = useState("");
  const [counterSellerContact, setCounterSellerContact] = useState("");
  const [counterAirlineProgram, setCounterAirlineProgram] = useState("");
  const [counterCostPerThousand, setCounterCostPerThousand] = useState("");

  // Step 1 - Client & Flight
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [tripType, setTripType] = useState<"one_way" | "round_trip" | "multi_city">("round_trip");
  const [passengers, setPassengers] = useState(1);
  const [passengerCpfs, setPassengerCpfs] = useState<PassengerCPF[]>([]);
  const [showPassengerDialog, setShowPassengerDialog] = useState(false);
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "" },
  ]);
  const [notes, setNotes] = useState("");

  // Step 2 - Calculation
  const [accountId, setAccountId] = useState<string>();
  const [milesNeeded, setMilesNeeded] = useState("");
  const [boardingFee, setBoardingFee] = useState("");
  const [pricingType, setPricingType] = useState<"per_passenger" | "total">("total");
  const [pricePerPassenger, setPricePerPassenger] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>();
  const [installments, setInstallments] = useState<number>();
  const [pnr, setPnr] = useState("");

  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [showCalculatorDialog, setShowCalculatorDialog] = useState(false);
  const [showRegisterTicket, setShowRegisterTicket] = useState(false);

  // Filter accounts - show all active accounts
  const filteredAccounts = accounts.filter(
    (acc) => acc.status === "active"
  );

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
      setFlightSegments([...flightSegments, { from: "", to: "", date: "" }]);
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

  const handleNext = () => {
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
    
    const selectedAccount = filteredAccounts.find(a => a.id === accountId);
    const airline = selectedAccount?.airline_companies?.name || counterAirlineProgram || "Companhia";

    // Calculate interest if applicable
    let finalPrice = parseFloat(priceTotal) || 0;
    let interestRate = 0;
    if (paymentMethod === "credit_card" && installments && installments > 1) {
      const result = calculateInstallmentValue(finalPrice, installments);
      finalPrice = result.finalPrice;
      interestRate = result.interestRate;
    }

    const success = await createSale({
      sale_source: saleSource,
      counter_seller_name: saleSource === "mileage_counter" ? counterSellerName : undefined,
      counter_seller_contact: saleSource === "mileage_counter" ? counterSellerContact : undefined,
      counter_airline_program: saleSource === "mileage_counter" ? counterAirlineProgram : undefined,
      counter_cost_per_thousand: saleSource === "mileage_counter" ? parseFloat(counterCostPerThousand) : undefined,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_cpf: customerCpf,
      trip_type: tripType,
      flight_segments: flightSegments,
      passenger_cpfs: passengerCpfs,
      passengers,
      notes,
      mileage_account_id: saleSource === "internal_account" ? accountId : undefined,
      miles_needed: parseFloat(milesNeeded) || 0,
      boarding_fee: parseFloat(boardingFee) || 0,
      price_per_passenger: parseFloat(pricePerPassenger) || 0,
      price_total: parseFloat(priceTotal) || 0,
      payment_method: paymentMethod,
      installments: paymentMethod === "credit_card" ? installments : undefined,
      interest_rate: paymentMethod === "credit_card" && installments ? interestRate : undefined,
      final_price_with_interest: paymentMethod === "credit_card" && installments ? finalPrice : undefined,
      status: "pending",
    } as any);

    setSaving(false);
    if (success) {
      setLastSaleData({
        customerName,
        routeText: flightSegments.map(s => `${s.from} → ${s.to}`).join(" / "),
        airline,
        milesNeeded,
        priceTotal: finalPrice.toFixed(2),
        boardingFee,
        passengers,
        paymentMethod,
        pnr: pnr || undefined,
      });
      setShowSuccessDialog(true);
    }
  };

  // Validation
  const canProceedStep0 =
    saleSource === "internal_account" ||
    (saleSource === "mileage_counter" && counterSellerName && counterAirlineProgram && counterCostPerThousand);

  const canProceedStep1 =
    customerName &&
    customerCpf &&
    passengers > 0 &&
    passengerCpfs.length === passengers &&
    flightSegments.length > 0 &&
    flightSegments.every((s) => s.from && s.to && s.date);

  const canProceedStep2 =
    (saleSource === "mileage_counter" || accountId) &&
    milesNeeded &&
    (pricePerPassenger || priceTotal) &&
    paymentMethod;

  // Calculate installment details
  const installmentDetails =
    paymentMethod === "credit_card" && installments && priceTotal
      ? calculateInstallmentValue(parseFloat(priceTotal), installments)
      : null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nova Venda</h1>
            <p className="text-muted-foreground">
              Etapa {currentStep + 1} de {steps.length}: {steps[currentStep]}
            </p>
          </div>
        </div>

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
              {/* STEP 0: Sale Source */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Origem da Venda</h2>
                  <RadioGroup
                    value={saleSource}
                    onValueChange={(v) => setSaleSource(v as typeof saleSource)}
                  >
                    <Card className={`p-4 cursor-pointer transition-all ${saleSource === "internal_account" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => setSaleSource("internal_account")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="internal_account" id="internal_account" />
                        <Label htmlFor="internal_account" className="cursor-pointer flex items-center gap-2 flex-1">
                          <Users className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">Conta Interna</p>
                            <p className="text-sm text-muted-foreground">Usar conta de milhagem própria</p>
                          </div>
                        </Label>
                      </div>
                    </Card>

                    <Card className={`p-4 cursor-pointer transition-all ${saleSource === "mileage_counter" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => setSaleSource("mileage_counter")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mileage_counter" id="mileage_counter" />
                        <Label htmlFor="mileage_counter" className="cursor-pointer flex items-center gap-2 flex-1">
                          <Building2 className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold">Balcão de Milhas</p>
                            <p className="text-sm text-muted-foreground">Comprar de fornecedor externo</p>
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
                              Nenhuma conta disponível. Cadastre em{" "}
                              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/settings/my-airlines")}>
                                Minhas Companhias
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
                          step="0.01"
                          value={counterCostPerThousand}
                          onChange={(e) => setCounterCostPerThousand(e.target.value)}
                          placeholder="Ex: 25.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: Client & Flight */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Cliente & Voo</h2>
                  
                  {/* Client Info */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <p className="font-medium">Dados do Cliente</p>
                    <div>
                      <Label htmlFor="customerName">Nome do Cliente *</Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
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
                      <div>
                        <Label htmlFor="customerCpf">CPF *</Label>
                        <Input
                          id="customerCpf"
                          value={customerCpf}
                          onChange={(e) => setCustomerCpf(maskCPF(e.target.value))}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trip Type & Passengers */}
                  <div className="space-y-4">
                    <div>
                      <Label>Tipo de Viagem *</Label>
                      <RadioGroup value={tripType} onValueChange={(v) => updateTripType(v as typeof tripType)}>
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
                    
                    <div>
                      <Label htmlFor="passengers">Número de Passageiros *</Label>
                      <Input
                        id="passengers"
                        type="number"
                        min="1"
                        value={passengers}
                        onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
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
                          É necessário adicionar o CPF de todos os {passengers} passageiro(s) para continuar.
                        </AlertDescription>
                      </Alert>
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
                        onRemove={tripType === "multi_city" && flightSegments.length > 1 ? removeFlightSegment : undefined}
                        canRemove={tripType === "multi_city" && flightSegments.length > 1}
                        title={
                          tripType === "round_trip"
                            ? index === 0
                              ? "Ida"
                              : "Volta"
                            : undefined
                        }
                      />
                    ))}

                    {tripType === "multi_city" && flightSegments.length < 6 && (
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
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Calculation */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Cálculo</h2>
                  
                  {/* Account Selection (only for internal) */}
                  {saleSource === "internal_account" && (
                    <div>
                      <Label htmlFor="account">Conta de Milhagem *</Label>
                      {filteredAccounts.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Nenhuma conta disponível. Configure suas companhias aéreas em{" "}
                            <Button
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() => navigate("/settings/my-airlines")}
                            >
                              Minhas Companhias
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

                  {/* Miles and Fees */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="milesNeeded">Milhagem Necessária *</Label>
                      <Input
                        id="milesNeeded"
                        type="number"
                        value={milesNeeded}
                        onChange={(e) => setMilesNeeded(e.target.value)}
                        placeholder="Ex: 50000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="boardingFee">Taxa de Embarque (por passageiro)</Label>
                      <Input
                        id="boardingFee"
                        type="number"
                        step="0.01"
                        value={boardingFee}
                        onChange={(e) => setBoardingFee(e.target.value)}
                        placeholder="Ex: 150.00"
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <Label>Tipo de Precificação</Label>
                    <RadioGroup
                      value={pricingType}
                      onValueChange={(v) => setPricingType(v as typeof pricingType)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="per_passenger" id="per_passenger" />
                        <Label htmlFor="per_passenger">Preço por Passageiro</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="total" id="total" />
                        <Label htmlFor="total">Preço Total</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {pricingType === "per_passenger" ? (
                    <div>
                      <Label htmlFor="pricePerPassenger">Preço por Passageiro (R$) *</Label>
                      <Input
                        id="pricePerPassenger"
                        type="number"
                        step="0.01"
                        value={pricePerPassenger}
                        onChange={(e) => {
                          setPricePerPassenger(e.target.value);
                          const total = parseFloat(e.target.value) * passengers;
                          setPriceTotal(total.toFixed(2));
                        }}
                        placeholder="Ex: 1500.00"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="priceTotal">Preço Total (R$) *</Label>
                      <Input
                        id="priceTotal"
                        type="number"
                        step="0.01"
                        value={priceTotal}
                        onChange={(e) => {
                          setPriceTotal(e.target.value);
                          const perPassenger = parseFloat(e.target.value) / passengers;
                          setPricePerPassenger(perPassenger.toFixed(2));
                        }}
                        placeholder="Ex: 3000.00"
                      />
                    </div>
                  )}

                  {/* Payment Method */}
                  <div>
                    <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                    <Select value={paymentMethod} onValueChange={(v) => {
                      setPaymentMethod(v);
                      if (v !== "credit_card") {
                        setInstallments(undefined);
                      }
                    }}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                        <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Installments (only for credit card) */}
                  {paymentMethod === "credit_card" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <Label htmlFor="installments">Parcelamento</Label>
                      {configs.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Configure as taxas de juros em{" "}
                            <Button
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() => navigate("/settings/credit")}
                            >
                              Configurações de Crédito
                            </Button>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Select
                            value={installments?.toString()}
                            onValueChange={(v) => setInstallments(parseInt(v))}
                          >
                            <SelectTrigger id="installments">
                              <SelectValue placeholder="Selecione o número de parcelas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">À vista (sem juros)</SelectItem>
                              {configs.map((config) => (
                                <SelectItem key={config.id} value={config.installments.toString()}>
                                  {config.installments}x - Taxa: {config.interest_rate}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {installmentDetails && installments && installments > 1 && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Valor original:</span>
                                <span>R$ {parseFloat(priceTotal).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Taxa de juros:</span>
                                <span>{installmentDetails.interestRate}%</span>
                              </div>
                              <div className="flex justify-between font-semibold text-primary">
                                <span>Valor final:</span>
                                <span>R$ {installmentDetails.finalPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>{installments}x de:</span>
                                <span>R$ {installmentDetails.installmentValue.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* PNR */}
                  <div>
                    <Label htmlFor="pnr">PNR / Localizador (opcional)</Label>
                    <Input
                      id="pnr"
                      value={pnr}
                      onChange={(e) => setPnr(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC123"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pode ser preenchido depois, se ainda não disponível
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: Confirmation */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Confirmar</h2>
                  <div className="space-y-4 text-sm">
                    {/* Sale Source */}
                    <div>
                      <p className="font-semibold">Origem da Venda</p>
                      <p>
                        {saleSource === "internal_account" ? "Conta Interna" : "Balcão de Milhas"}
                      </p>
                      {saleSource === "mileage_counter" && (
                        <>
                          <p className="text-muted-foreground">Vendedor: {counterSellerName}</p>
                          {counterSellerContact && (
                            <p className="text-muted-foreground">Contato: {counterSellerContact}</p>
                          )}
                          <p className="text-muted-foreground">Programa: {counterAirlineProgram}</p>
                        </>
                      )}
                    </div>

                    {/* Client */}
                    <div>
                      <p className="font-semibold">Cliente</p>
                      <p>{customerName}</p>
                      <p className="text-muted-foreground">{customerPhone} • {customerCpf}</p>
                    </div>

                    {/* Flight */}
                    <div>
                      <p className="font-semibold">Voo</p>
                      <p className="text-muted-foreground">
                        Tipo: {tripType === "one_way" ? "Só Ida" : tripType === "round_trip" ? "Ida e Volta" : "Múltiplos Trechos"}
                      </p>
                      {flightSegments.map((segment, idx) => (
                        <div key={idx} className="mt-2">
                          <p>
                            {tripType === "round_trip" && idx === 0 && "Ida: "}
                            {tripType === "round_trip" && idx === 1 && "Volta: "}
                            {segment.from} → {segment.to}
                          </p>
                          <p className="text-muted-foreground">
                            {segment.date}
                            {segment.time && ` às ${segment.time}`}
                            {segment.stops !== undefined && ` • ${segment.stops === 0 ? "Direto" : `${segment.stops} parada(s)`}`}
                            {segment.airline && ` • ${segment.airline}`}
                          </p>
                        </div>
                      ))}
                      <p className="text-muted-foreground mt-2">{passengers} passageiro(s)</p>
                    </div>

                    {/* Passengers */}
                    {passengerCpfs.length > 0 && (
                      <div>
                        <p className="font-semibold">Passageiros</p>
                        {passengerCpfs.map((p, idx) => (
                          <p key={idx} className="text-muted-foreground">
                            {p.name} - {p.cpf}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Account */}
                    {saleSource === "internal_account" && (
                      <div>
                        <p className="font-semibold">Conta</p>
                        <p>
                          {filteredAccounts.find((a) => a.id === accountId)?.airline_companies?.name} -{" "}
                          {filteredAccounts.find((a) => a.id === accountId)?.account_number}
                        </p>
                      </div>
                    )}

                    {/* Values */}
                    <div>
                      <p className="font-semibold">Valores</p>
                      <p>Milhagem: {milesNeeded} milhas</p>
                      {boardingFee && <p>Taxa de embarque: R$ {boardingFee} por passageiro</p>}
                      <p>Forma de pagamento: {paymentMethod}</p>
                      {installmentDetails && installments && installments > 1 ? (
                        <>
                          <p className="text-muted-foreground">Valor original: R$ {priceTotal}</p>
                          <p className="text-muted-foreground">Taxa de juros: {installmentDetails.interestRate}%</p>
                          <p className="text-muted-foreground">{installments}x de R$ {installmentDetails.installmentValue.toFixed(2)}</p>
                          <p className="text-lg font-bold mt-2 text-primary">
                            Total: R$ {installmentDetails.finalPrice.toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-lg font-bold mt-2">Total: R$ {priceTotal}</p>
                      )}
                    </div>

                    {/* Notes */}
                    {notes && (
                      <div>
                        <p className="font-semibold">Observações</p>
                        <p className="text-muted-foreground">{notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                {currentStep < steps.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={
                      (currentStep === 0 && !canProceedStep0) ||
                      (currentStep === 1 && !canProceedStep1) ||
                      (currentStep === 2 && !canProceedStep2)
                    }
                  >
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saving}>
                    <Check className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar Venda"}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1 space-y-6">
            <SalesSummaryCard
              customerName={customerName}
              routeText={flightSegments.map(s => `${s.from} → ${s.to}`).join(" / ")}
              departureDate={flightSegments[0]?.date}
              returnDate={flightSegments[1]?.date}
              passengers={passengers}
              milesNeeded={milesNeeded}
              priceTotal={installmentDetails?.finalPrice.toFixed(2) || priceTotal}
            />
            {currentStep === 2 && saleSource === "internal_account" && accountId && (
              <Dialog open={showCalculatorDialog} onOpenChange={setShowCalculatorDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Calculator className="h-4 w-4 mr-2" />
                    Simulador de Lucro
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Simulador de Margem de Lucro</DialogTitle>
                  </DialogHeader>
                  <MarginCalculator
                    costPerMile={
                      filteredAccounts.find(a => a.id === accountId)?.cost_per_mile
                        ? Number(filteredAccounts.find(a => a.id === accountId)?.cost_per_mile)
                        : 0.029
                    }
                  />
                </DialogContent>
              </Dialog>
            )}
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
          onRegisterTicket={() => {
            setShowSuccessDialog(false);
            setShowRegisterTicket(true);
          }}
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
      />
    </div>
  );
}
