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
import { useSales } from "@/hooks/useSales";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupplierAirlines } from "@/hooks/useSupplierAirlines";
import { maskCPF, maskPhone } from "@/lib/input-masks";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { SalesSummaryCard } from "@/components/sales/SaleSummaryCard";
import { SaleSuccessDialog } from "@/components/sales/SaleSuccessDialog";
import { MarginCalculator } from "@/components/calculator/MarginCalculator";

const steps = ["Cliente & Voo", "Cálculo", "Confirmar"];

export default function NewSaleWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const { createSale } = useSales();
  const { accounts } = useMileageAccounts();
  const { supplierId } = useUserRole();
  const { linkedAirlines } = useSupplierAirlines(supplierId);

  // Step 1 - Client & Flight
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [routeText, setRouteText] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [notes, setNotes] = useState("");

  // Step 2 - Calculation
  const [accountId, setAccountId] = useState<string>();
  const [milesNeeded, setMilesNeeded] = useState("");
  const [boardingFee, setBoardingFee] = useState("");
  const [pricingType, setPricingType] = useState<"per_passenger" | "total">("total");
  const [pricePerPassenger, setPricePerPassenger] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>();
  const [pnr, setPnr] = useState("");

  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // Filter accounts by linked airlines
  const linkedAirlineIds = linkedAirlines.map((a) => a.id);
  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.status === "active" &&
      linkedAirlineIds.includes(acc.airline_company_id)
  );

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
    const airline = selectedAccount?.airline_companies?.name || "Companhia";

    const success = await createSale({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_cpf: customerCpf,
      route_text: routeText,
      travel_dates: {
        departure: departureDate,
        return: returnDate,
      },
      passengers,
      notes,
      mileage_account_id: accountId,
      miles_needed: parseFloat(milesNeeded) || 0,
      boarding_fee: parseFloat(boardingFee) || 0,
      price_per_passenger: parseFloat(pricePerPassenger) || 0,
      price_total: parseFloat(priceTotal) || 0,
      payment_method: paymentMethod,
      status: "pending",
    });

    setSaving(false);
    if (success) {
      setLastSaleData({
        customerName,
        routeText,
        airline,
        milesNeeded,
        priceTotal,
        boardingFee,
        passengers,
        paymentMethod,
        pnr: pnr || undefined,
      });
      setShowSuccessDialog(true);
    }
  };

  const canProceedStep1 =
    customerName && customerCpf && routeText && departureDate && passengers > 0;
  const canProceedStep2 = accountId && milesNeeded && (pricePerPassenger || priceTotal);

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
              {currentStep === 0 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Cliente & Voo</h2>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="customerName">Nome do Cliente</Label>
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
                        <Label htmlFor="customerCpf">CPF</Label>
                        <Input
                          id="customerCpf"
                          value={customerCpf}
                          onChange={(e) => setCustomerCpf(maskCPF(e.target.value))}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="routeText">Rota</Label>
                      <Input
                        id="routeText"
                        value={routeText}
                        onChange={(e) => setRouteText(e.target.value)}
                        placeholder="Ex: São Paulo (GRU) → Lisboa (LIS)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="departureDate">Data de Ida</Label>
                        <Input
                          id="departureDate"
                          type="date"
                          value={departureDate}
                          onChange={(e) => setDepartureDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="returnDate">Data de Volta (opcional)</Label>
                        <Input
                          id="returnDate"
                          type="date"
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="passengers">Número de Passageiros</Label>
                      <Input
                        id="passengers"
                        type="number"
                        min="1"
                        value={passengers}
                        onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
                      />
                    </div>
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
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Cálculo</h2>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="account">Conta de Milhagem</Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger id="account">
                          <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.airline_companies?.name} - {acc.account_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="milesNeeded">Milhagem Necessária</Label>
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
                    <div>
                      <Label>Tipo de Precificação</Label>
                      <RadioGroup
                        value={pricingType}
                        onValueChange={(v) => setPricingType(v as "per_passenger" | "total")}
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
                        <Label htmlFor="pricePerPassenger">Preço por Passageiro (R$)</Label>
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
                        <Label htmlFor="priceTotal">Preço Total (R$)</Label>
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
                     <div>
                       <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                       <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Confirmar</h2>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-semibold">Cliente</p>
                      <p>{customerName}</p>
                      <p className="text-muted-foreground">{customerPhone} • {customerCpf}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Voo</p>
                      <p>{routeText}</p>
                      <p className="text-muted-foreground">
                        Ida: {departureDate} {returnDate && `• Volta: ${returnDate}`}
                      </p>
                      <p className="text-muted-foreground">{passengers} passageiro(s)</p>
                    </div>
                    <div>
                      <p className="font-semibold">Conta</p>
                      <p>
                        {filteredAccounts.find((a) => a.id === accountId)?.airline_companies?.name} -{" "}
                        {filteredAccounts.find((a) => a.id === accountId)?.account_number}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Valores</p>
                      <p>Milhagem: {milesNeeded} milhas</p>
                      <p>Taxa de embarque: R$ {boardingFee} por passageiro</p>
                      <p className="text-lg font-bold mt-2">Total: R$ {priceTotal}</p>
                    </div>
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
                      (currentStep === 0 && !canProceedStep1) ||
                      (currentStep === 1 && !canProceedStep2)
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
              routeText={routeText}
              departureDate={departureDate}
              returnDate={returnDate}
              passengers={passengers}
              milesNeeded={milesNeeded}
              priceTotal={priceTotal}
            />
            {currentStep === 1 && (
              <MarginCalculator
                costPerMile={
                  accountId && filteredAccounts.find(a => a.id === accountId)?.cost_per_mile
                    ? Number(filteredAccounts.find(a => a.id === accountId)?.cost_per_mile)
                    : 0.029
                }
              />
            )}
          </div>
        </div>
      </div>

      {lastSaleData && (
        <SaleSuccessDialog
          open={showSuccessDialog}
          onClose={() => {
            setShowSuccessDialog(false);
            navigate("/sales");
          }}
          saleData={lastSaleData}
        />
      )}
    </div>
  );
}
