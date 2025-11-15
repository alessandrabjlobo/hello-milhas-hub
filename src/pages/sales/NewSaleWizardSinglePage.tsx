import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, User, Plane, DollarSign, Users } from "lucide-react";
import { FlightSegmentForm, type FlightSegment } from "@/components/sales/FlightSegmentForm";
import { RoundTripForm, type RoundTripData } from "@/components/calculator/RoundTripForm";
import { BilheteTicketExtractor } from "@/components/tickets/BilheteTicketExtractor";
import { SalesSummaryCard } from "@/components/sales/SaleSummaryCard";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { formatMiles } from "@/lib/utils";

export default function NewSaleWizardSinglePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeMethods } = usePaymentMethods();
  const { accounts } = useMileageAccounts();
  
  // Estados básicos
  const [saleSource, setSaleSource] = useState<"internal_account" | "mileage_counter">("internal_account");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  
  // Voo
  const [tripType, setTripType] = useState<"one_way" | "round_trip" | "multi_city">("round_trip");
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([{ from: "", to: "", date: "" }]);
  const [roundTripData, setRoundTripData] = useState<RoundTripData>({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    miles: 0
  });
  
  // Valores
  const [passengers, setPassengers] = useState("1");
  const [boardingFee, setBoardingFee] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  
  // Passageiros
  const [passengerNames, setPassengerNames] = useState<string[]>([""]);
  const [passengerCpfs, setPassengerCpfs] = useState<string[]>([""]);
  
  // Balcão
  const [counterSellerName, setCounterSellerName] = useState("");
  const [counterSellerContact, setCounterSellerContact] = useState("");
  const [counterAirlineProgram, setCounterAirlineProgram] = useState("");
  const [counterCostPerThousand, setCounterCostPerThousand] = useState("");
  
  const [saving, setSaving] = useState(false);

  const activeAccounts = accounts?.filter(acc => acc.status === "active") || [];

  const totalMilesNeeded = tripType === "round_trip" 
    ? roundTripData.miles * parseInt(passengers || "1")
    : flightSegments.reduce((sum, seg) => sum + (seg.miles || 0), 0) * parseInt(passengers || "1");

  const formatRoute = () => {
    if (tripType === "round_trip") {
      return `${roundTripData.origin} ⇄ ${roundTripData.destination}`;
    }
    return flightSegments.filter(s => s.from && s.to).map(s => `${s.from} → ${s.to}`).join(", ");
  };

  const handlePDFDataExtracted = (data: any) => {
    if (data.customerName) setCustomerName(data.customerName);
    if (data.customerCpf) setCustomerCpf(data.customerCpf);
    if (data.route && Array.isArray(data.route)) {
      const segments = data.route.map((r: any) => ({
        from: r.origin || r.from || "",
        to: r.destination || r.to || "",
        date: r.date || "",
        miles: 0
      }));
      setFlightSegments(segments);
    }
  };

  const updateTripType = (newType: any) => {
    setTripType(newType);
    if (newType === "round_trip") {
      if (flightSegments.length >= 2) {
        setRoundTripData({
          origin: flightSegments[0]?.from || "",
          destination: flightSegments[0]?.to || "",
          departureDate: flightSegments[0]?.date || "",
          returnDate: flightSegments[1]?.date || "",
          miles: 0
        });
      }
    } else {
      if (roundTripData.origin && roundTripData.destination) {
        setFlightSegments([
          { from: roundTripData.origin, to: roundTripData.destination, date: roundTripData.departureDate },
          { from: roundTripData.destination, to: roundTripData.origin, date: roundTripData.returnDate }
        ]);
      }
    }
  };

  const handleSave = async () => {
    // Validações básicas
    if (!customerName || !priceTotal) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Criar venda
      const saleData: any = {
        user_id: user.id,
        channel: saleSource === "internal_account" ? "internal" : "counter",
        customer_name: customerName,
        customer_phone: customerPhone || null,
        customer_cpf: customerCpf || null,
        trip_type: tripType,
        passengers: parseInt(passengers),
        miles_used: totalMilesNeeded,
        sale_price: parseFloat(priceTotal),
        total_cost: 0,
        profit: 0,
        profit_margin: 0,
        payment_method: paymentMethod || null,
        boarding_fee: parseFloat(boardingFee) || null,
        status: "pending",
        payment_status: "pending"
      };

      if (saleSource === "internal_account" && selectedAccount) {
        saleData.mileage_account_id = selectedAccount;
      }

      const { data: sale, error } = await supabase
        .from("sales")
        .insert(saleData)
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Venda salva com sucesso!" });
      navigate("/vendas");
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/vendas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Venda</h1>
          <p className="text-muted-foreground">
            Preencha os dados da venda em uma única tela
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,380px] gap-6">
        {/* Coluna principal */}
        <div className="space-y-6">
          {/* Seção 1: Origem */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Origem da Venda
            </h2>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Origem *</Label>
                <RadioGroup value={saleSource} onValueChange={(v: any) => setSaleSource(v)} className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="internal_account" id="internal" />
                    <Label htmlFor="internal" className="font-normal cursor-pointer">Conta Interna</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mileage_counter" id="counter" />
                    <Label htmlFor="counter" className="font-normal cursor-pointer">Balcão de Milhas</Label>
                  </div>
                </RadioGroup>
              </div>

              {saleSource === "internal_account" && (
                <div>
                  <Label>Conta de Milhas *</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_number} - {formatMiles(acc.balance)} milhas
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Card>

          {/* Seção 2: Cliente */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Cliente
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={customerCpf} onChange={e => setCustomerCpf(e.target.value)} />
              </div>
            </div>
          </Card>

          {/* Seção 3: Trechos */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Trechos da Viagem
            </h2>
            <div className="space-y-6">
              <div className="p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-medium mb-2 block">Tipo de Viagem *</Label>
                <RadioGroup value={tripType} onValueChange={updateTripType} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one_way" id="one_way" />
                    <Label htmlFor="one_way" className="font-normal cursor-pointer">Só Ida</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="round_trip" id="round_trip" />
                    <Label htmlFor="round_trip" className="font-normal cursor-pointer">Ida e Volta</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multi_city" id="multi_city" />
                    <Label htmlFor="multi_city" className="font-normal cursor-pointer">Múltiplos Trechos</Label>
                  </div>
                </RadioGroup>
              </div>

              {tripType === "round_trip" ? (
                <RoundTripForm data={roundTripData} onChange={setRoundTripData} />
              ) : (
                <div className="space-y-3">
                  {flightSegments.map((seg, idx) => (
                    <FlightSegmentForm
                      key={idx}
                      segment={seg}
                      index={idx}
                      onUpdate={(i, field, value) => {
                        const newSegs = [...flightSegments];
                        newSegs[i] = { ...newSegs[i], [field]: value };
                        setFlightSegments(newSegs);
                      }}
                      onRemove={(i) => setFlightSegments(flightSegments.filter((_, idx) => idx !== i))}
                      canRemove={flightSegments.length > 1}
                    />
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setFlightSegments([...flightSegments, { from: "", to: "", date: "" }])}
                    className="w-full"
                  >
                    Adicionar Trecho
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Seção 4: Valores */}
          <Card className="p-6 bg-primary/5">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valores e Pagamento
            </h2>
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Passageiros *</Label>
                  <Input type="number" min="1" value={passengers} onChange={e => setPassengers(e.target.value)} />
                </div>
                <div>
                  <Label>Taxa de Embarque/pessoa (R$)</Label>
                  <Input type="number" step="0.01" value={boardingFee} onChange={e => setBoardingFee(e.target.value)} />
                </div>
                <div>
                  <Label>Preço Total (R$) *</Label>
                  <Input type="number" step="0.01" value={priceTotal} onChange={e => setPriceTotal(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Forma de Pagamento *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMethods?.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.method_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Seção 5: Passageiros */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Passageiros e CPFs
            </h2>
            <div className="space-y-4">
              {Array.from({ length: parseInt(passengers) || 1 }, (_, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label>Nome Completo {idx + 1} *</Label>
                    <Input
                      value={passengerNames[idx] || ""}
                      onChange={e => {
                        const newNames = [...passengerNames];
                        newNames[idx] = e.target.value;
                        setPassengerNames(newNames);
                      }}
                    />
                  </div>
                  <div>
                    <Label>CPF {idx + 1} *</Label>
                    <Input
                      value={passengerCpfs[idx] || ""}
                      onChange={e => {
                        const newCpfs = [...passengerCpfs];
                        newCpfs[idx] = e.target.value;
                        setPassengerCpfs(newCpfs);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4 lg:sticky lg:top-6 h-fit">
          <BilheteTicketExtractor onDataExtracted={handlePDFDataExtracted} />
          
          <SalesSummaryCard
            customerName={customerName}
            routeText={formatRoute()}
            departureDate={tripType === "round_trip" ? roundTripData.departureDate : flightSegments[0]?.date || ""}
            returnDate={tripType === "round_trip" ? roundTripData.returnDate : undefined}
            passengers={parseInt(passengers) || 0}
            milesNeeded={totalMilesNeeded.toString()}
            priceTotal={priceTotal}
          />

          <Button onClick={handleSave} size="lg" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Venda"}
          </Button>
        </div>
      </div>
    </div>
  );
}
