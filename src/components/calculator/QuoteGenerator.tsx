import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Send, Copy, Download, User, Plane, DollarSign, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { FlightSegmentForm, type FlightSegment } from "@/components/sales/FlightSegmentForm";
import { RoundTripForm, type RoundTripData } from "@/components/calculator/RoundTripForm";
import { usePaymentInterestConfig } from "@/hooks/usePaymentInterestConfig";

export function QuoteGenerator() {
  const { toast } = useToast();
  const { configs } = usePaymentInterestConfig();
  
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [boardingFee, setBoardingFee] = useState("");
  
  // Trip type e flight segments
  const [tripType, setTripType] = useState<"one_way" | "round_trip" | "multi_city">("round_trip");
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "" }
  ]);
  const [roundTripData, setRoundTripData] = useState<RoundTripData>({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    miles: 0
  });
  const [costPerMile, setCostPerMile] = useState("0.029");
  const [desiredMargin, setDesiredMargin] = useState("20");
  
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerateQuote = () => {
    if (!clientName || !clientPhone || !totalPrice) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, telefone e valor total.",
        variant: "destructive",
      });
      return;
    }

    // Validar de acordo com o tipo de viagem
    if (tripType === "one_way") {
      if (!flightSegments[0]?.from || !flightSegments[0]?.to || !flightSegments[0]?.date) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha origem, destino e data do voo.",
          variant: "destructive",
        });
        return;
      }
    } else if (tripType === "round_trip") {
      if (!roundTripData.origin || !roundTripData.destination || !roundTripData.departureDate || !roundTripData.returnDate || !roundTripData.miles) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos do voo de ida e volta, incluindo milhas.",
          variant: "destructive",
        });
        return;
      }
      if (new Date(roundTripData.returnDate) < new Date(roundTripData.departureDate)) {
        toast({
          title: "Data inválida",
          description: "Data de volta deve ser após a data de ida.",
          variant: "destructive",
        });
        return;
      }
    } else if (tripType === "multi_city") {
      const hasValidSegment = flightSegments.some(seg => seg.from && seg.to && seg.date && seg.miles);
      if (!hasValidSegment) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha ao menos 1 trecho completo com milhas.",
          variant: "destructive",
        });
        return;
      }
    }

    setShowPreview(true);
    toast({
      title: "Orçamento gerado!",
      description: "Seu orçamento profissional foi gerado com sucesso.",
    });
  };

  const handleSaveQuote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para salvar orçamentos.",
        variant: "destructive",
      });
      return;
    }

    const route = tripType === "round_trip" 
      ? `${roundTripData.origin} → ${roundTripData.destination}`
      : `${flightSegments[0]?.from || ''} → ${flightSegments[0]?.to || ''}`;
    
    const departureDate = tripType === "round_trip"
      ? roundTripData.departureDate
      : flightSegments[0]?.date || null;

    const { error } = await supabase.from("quotes").insert([{
      user_id: user.id,
      client_name: clientName,
      client_phone: clientPhone,
      route,
      departure_date: departureDate,
      miles_needed: 0,
      total_price: parseFloat(totalPrice),
      passengers: parseInt(passengers),
      trip_type: tripType,
      boarding_fee: boardingFee ? parseFloat(boardingFee) : 0,
      flight_segments: tripType === "round_trip" ? [roundTripData] as any : flightSegments as any,
      status: 'pending' as const
    }]);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Orçamento salvo!",
      description: "O orçamento foi salvo no banco de dados.",
    });
  };

  const generateQuoteText = () => {
    const pricePerPassenger = passengers ? (parseFloat(totalPrice) / parseInt(passengers)).toFixed(2) : totalPrice;
    const totalBoardingFee = boardingFee ? (parseFloat(boardingFee) * parseInt(passengers || "1")).toFixed(2) : "0.00";
    
    let text = `*✈️ ORÇAMENTO DE PASSAGEM AÉREA*\n\n`;
    text += `*👤 DADOS DO CLIENTE*\n`;
    text += `Nome: ${clientName}\n`;
    text += `Telefone: ${clientPhone}\n\n`;
    
    text += `*🛫 DETALHES DO VOO*\n`;
    text += `Tipo: ${tripType === 'one_way' ? 'Só Ida' : tripType === 'round_trip' ? 'Ida e Volta' : 'Múltiplos Trechos'}\n`;
    
    if (tripType === 'round_trip') {
      text += `Origem: ${roundTripData.origin}\n`;
      text += `Destino: ${roundTripData.destination}\n`;
      text += `Data de Ida: ${format(new Date(roundTripData.departureDate), 'dd/MM/yyyy')}\n`;
      text += `Data de Volta: ${format(new Date(roundTripData.returnDate), 'dd/MM/yyyy')}\n`;
    } else {
      flightSegments.filter(seg => seg.from && seg.to).forEach((segment, index) => {
        text += `\nTrecho ${index + 1}: ${segment.from} → ${segment.to}\n`;
        if (segment.date) text += `Data: ${format(new Date(segment.date), 'dd/MM/yyyy')}\n`;
      });
    }
    
    text += `\n*💰 VALORES*\n`;
    text += `Passageiros: ${passengers}\n`;
    if (boardingFee && parseFloat(boardingFee) > 0) {
      text += `Taxa de embarque: R$ ${parseFloat(boardingFee).toFixed(2)} por passageiro\n`;
      text += `Total taxas: R$ ${totalBoardingFee}\n`;
    }
    if (parseInt(passengers) > 1) {
      text += `Valor por pessoa: R$ ${pricePerPassenger}\n`;
    }
    text += `\n*VALOR À VISTA: R$ ${parseFloat(totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n`;
    
    text += `\n*💳 FORMAS DE PAGAMENTO*\n`;
    text += `• PIX - R$ ${parseFloat(totalPrice).toFixed(2)}\n`;
    
    const debitConfig = configs.find(c => c.payment_type === 'debit');
    if (debitConfig && debitConfig.interest_rate > 0) {
      const debitTotal = parseFloat(totalPrice) * (1 + debitConfig.interest_rate / 100);
      text += `• Débito - R$ ${debitTotal.toFixed(2)} (Taxa: ${debitConfig.interest_rate.toFixed(2)}%)\n`;
    } else {
      text += `• Débito - R$ ${parseFloat(totalPrice).toFixed(2)}\n`;
    }
    
    const creditConfigs = configs.filter(c => c.payment_type === 'credit').sort((a, b) => a.installments - b.installments);
    if (creditConfigs.length > 0) {
      text += `• Crédito:\n`;
      creditConfigs.forEach(config => {
        const rate = config.config_type === 'per_installment'
          ? (config.per_installment_rates?.[config.installments] ?? config.interest_rate)
          : config.interest_rate;
        const finalPrice = parseFloat(totalPrice) * (1 + rate / 100);
        const installmentValue = finalPrice / config.installments;
        text += `  ${config.installments}x de R$ ${installmentValue.toFixed(2)} = R$ ${finalPrice.toFixed(2)}\n`;
      });
    }
    
    text += `\n_⚠️ Valores sujeitos a alteração conforme disponibilidade._`;
    
    return text;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateQuoteText());
    toast({
      title: "Copiado!",
      description: "Orçamento copiado para a área de transferência.",
    });
  };

  const handleSendWhatsApp = () => {
    const phoneNumber = clientPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(generateQuoteText())}`;
    
    window.open(whatsappUrl, '_blank');
    handleSaveQuote();
    
    toast({
      title: "WhatsApp aberto!",
      description: "A mensagem foi preparada no WhatsApp.",
    });
  };

  const pricePerPassenger = passengers && totalPrice 
    ? (parseFloat(totalPrice) / parseInt(passengers)).toFixed(2) 
    : "0.00";

  const handleCalculatePriceByMargin = () => {
    // Calcular total de milhas
    let totalMiles = 0;
    if (tripType === "round_trip") {
      totalMiles = roundTripData.miles || 0;
    } else {
      totalMiles = flightSegments.reduce((sum, seg) => sum + (seg.miles || 0), 0);
    }

    if (totalMiles === 0) {
      toast({
        title: "Milhas não informadas",
        description: "Preencha a quantidade de milhas para calcular o preço automaticamente.",
        variant: "destructive",
      });
      return;
    }

    if (!passengers || parseInt(passengers) === 0) {
      toast({
        title: "Passageiros não informados",
        description: "Informe o número de passageiros.",
        variant: "destructive",
      });
      return;
    }

    const costPerMileValue = parseFloat(costPerMile);
    const marginPercent = parseFloat(desiredMargin);

    if (isNaN(costPerMileValue) || costPerMileValue <= 0) {
      toast({
        title: "Custo por milha inválido",
        description: "Informe um custo por milha válido.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(marginPercent) || marginPercent <= 0 || marginPercent >= 100) {
      toast({
        title: "Margem inválida",
        description: "Informe uma margem entre 0% e 100%.",
        variant: "destructive",
      });
      return;
    }

    // Calcular custo total
    const totalMilesAllPassengers = totalMiles * parseInt(passengers);
    const totalCost = (totalMilesAllPassengers * costPerMileValue) / 1000;

    // Calcular preço com margem: preço = custo / (1 - margem/100)
    const calculatedPrice = totalCost / (1 - marginPercent / 100);

    setTotalPrice(calculatedPrice.toFixed(2));

    toast({
      title: "Preço calculado!",
      description: `Preço de venda: R$ ${calculatedPrice.toFixed(2)} com ${marginPercent}% de margem`,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Gerador de Orçamentos Profissional</CardTitle>
              <CardDescription className="text-base">
                Crie orçamentos completos e personalizados em segundos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Dados do Cliente */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Dados do Cliente
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nome Completo *</Label>
                  <Input
                    id="client-name"
                    placeholder="João Silva"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telefone (WhatsApp) *</Label>
                  <Input
                    id="client-phone"
                    placeholder="(11) 99999-9999"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Detalhes do Voo */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plane className="h-5 w-5 text-primary" />
                Detalhes do Voo
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Viagem *</Label>
                  <RadioGroup 
                    value={tripType} 
                    onValueChange={(v) => setTripType(v as typeof tripType)}
                  >
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one_way" id="one_way" />
                        <Label htmlFor="one_way" className="cursor-pointer">Só Ida</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="round_trip" id="round_trip" />
                        <Label htmlFor="round_trip" className="cursor-pointer">Ida e Volta</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multi_city" id="multi_city" />
                        <Label htmlFor="multi_city" className="cursor-pointer">Múltiplos Trechos</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  {tripType === "one_way" && (
                    <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                      <div className="grid md:grid-cols-4 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="one-way-from">Origem *</Label>
                          <Input
                            id="one-way-from"
                            placeholder="GRU - São Paulo"
                            value={flightSegments[0]?.from || ""}
                            onChange={(e) => {
                              const newSegments = [...flightSegments];
                              newSegments[0] = { ...newSegments[0], from: e.target.value };
                              setFlightSegments(newSegments);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="one-way-to">Destino *</Label>
                          <Input
                            id="one-way-to"
                            placeholder="MIA - Miami"
                            value={flightSegments[0]?.to || ""}
                            onChange={(e) => {
                              const newSegments = [...flightSegments];
                              newSegments[0] = { ...newSegments[0], to: e.target.value };
                              setFlightSegments(newSegments);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="one-way-date">Data *</Label>
                          <Input
                            id="one-way-date"
                            type="date"
                            value={flightSegments[0]?.date || ""}
                            onChange={(e) => {
                              const newSegments = [...flightSegments];
                              newSegments[0] = { ...newSegments[0], date: e.target.value };
                              setFlightSegments(newSegments);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="one-way-miles">Milhas *</Label>
                          <Input
                            id="one-way-miles"
                            type="number"
                            placeholder="15000"
                            value={flightSegments[0]?.miles || ""}
                            onChange={(e) => {
                              const newSegments = [...flightSegments];
                              newSegments[0] = { ...newSegments[0], miles: parseInt(e.target.value) || 0 };
                              setFlightSegments(newSegments);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {tripType === "round_trip" && (
                    <RoundTripForm data={roundTripData} onChange={setRoundTripData} />
                  )}

                  {tripType === "multi_city" && (
                    <>
                      {flightSegments.map((segment, index) => (
                        <FlightSegmentForm
                          key={index}
                          segment={segment}
                          index={index}
                          onUpdate={(idx, field, value) => {
                            const newSegments = [...flightSegments];
                            newSegments[idx] = { ...newSegments[idx], [field]: value };
                            setFlightSegments(newSegments);
                          }}
                          onRemove={(idx) => {
                            setFlightSegments(flightSegments.filter((_, i) => i !== idx));
                          }}
                          canRemove={flightSegments.length > 1}
                        />
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFlightSegments([...flightSegments, { from: "", to: "", date: "" }])}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Trecho
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Valores */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Valores
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passengers">Nº de Passageiros *</Label>
                  <Input
                    id="passengers"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost-per-mile">Custo por Milha (R$) *</Label>
                  <Input
                    id="cost-per-mile"
                    type="number"
                    step="0.001"
                    placeholder="0.029"
                    value={costPerMile}
                    onChange={(e) => setCostPerMile(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Custo interno para calcular margem
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total-price">Valor de Venda (R$) *</Label>
                  <Input
                    id="total-price"
                    type="number"
                    step="0.01"
                    placeholder="1450.00"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Calculadora de Margem */}
              <div className="mt-6 p-5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-primary">Calculadora Automática de Preço</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina a margem de lucro desejada e calcularemos automaticamente o preço de venda ideal
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="desired-margin">Margem de Lucro Desejada (%)</Label>
                    <Input
                      id="desired-margin"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="20"
                      value={desiredMargin}
                      onChange={(e) => setDesiredMargin(e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Exemplo: 20% = lucro de R$ 200 em venda de R$ 1000
                    </p>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleCalculatePriceByMargin}
                      className="w-full h-11"
                      variant="default"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Calcular Preço Automaticamente
                    </Button>
                  </div>
                </div>

                {(() => {
                  // Preview do cálculo
                  let totalMiles = 0;
                  if (tripType === "round_trip") {
                    totalMiles = roundTripData.miles || 0;
                  } else {
                    totalMiles = flightSegments.reduce((sum, seg) => sum + (seg.miles || 0), 0);
                  }

                  if (totalMiles > 0 && passengers && costPerMile && desiredMargin) {
                    const totalMilesAllPassengers = totalMiles * parseInt(passengers);
                    const costPerMileValue = parseFloat(costPerMile);
                    const marginPercent = parseFloat(desiredMargin);
                    const totalCost = (totalMilesAllPassengers * costPerMileValue) / 1000;
                    const calculatedPrice = totalCost / (1 - marginPercent / 100);
                    const profit = calculatedPrice - totalCost;

                    return (
                      <div className="mt-4 p-4 bg-background rounded-lg border">
                        <p className="text-sm font-semibold mb-2">Preview do Cálculo:</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Custo</p>
                            <p className="font-bold text-red-600">R$ {totalCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Preço Sugerido</p>
                            <p className="font-bold text-green-600">R$ {calculatedPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Lucro</p>
                            <p className="font-bold text-blue-600">R$ {profit.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="boarding-fee">Taxa de Embarque por Passageiro (R$)</Label>
                  <Input
                    id="boarding-fee"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={boardingFee}
                    onChange={(e) => setBoardingFee(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Taxa cobrada por passageiro (ex: R$ 35,00)
                  </p>
                </div>

                {boardingFee && parseFloat(boardingFee) > 0 && (
                  <div className="space-y-2">
                    <Label>Total das Taxas de Embarque</Label>
                    <div className="h-11 px-3 flex items-center rounded-md border bg-muted/50">
                      <span className="font-semibold">
                        R$ {(parseFloat(boardingFee) * parseInt(passengers || "1")).toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({passengers} passageiro{parseInt(passengers) > 1 ? "s" : ""})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {parseInt(passengers) > 1 && totalPrice && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    Valor por passageiro: <span className="font-semibold text-foreground">R$ {pricePerPassenger}</span>
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Formas de Pagamento */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Formas de Pagamento
              </h3>
              
              {totalPrice && parseFloat(totalPrice) > 0 ? (
                <div className="space-y-4">
                  {/* PIX */}
                  <Card className="p-4 border-primary/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">PIX</p>
                        <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        R$ {parseFloat(totalPrice).toFixed(2)}
                      </p>
                    </div>
                  </Card>

                  {/* Débito */}
                  {(() => {
                    const debitConfig = configs.find(c => c.payment_type === 'debit');
                    const debitTotal = debitConfig && debitConfig.interest_rate > 0
                      ? parseFloat(totalPrice) * (1 + debitConfig.interest_rate / 100)
                      : parseFloat(totalPrice);
                    
                    return (
                      <Card className="p-4 border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-lg">Débito</p>
                            {debitConfig && debitConfig.interest_rate > 0 && (
                              <p className="text-sm text-muted-foreground">
                                Taxa: {debitConfig.interest_rate.toFixed(2)}%
                              </p>
                            )}
                          </div>
                          <p className="text-2xl font-bold">
                            R$ {debitTotal.toFixed(2)}
                          </p>
                        </div>
                      </Card>
                    );
                  })()}

                  {/* Crédito Parcelado */}
                  {configs.filter(c => c.payment_type === 'credit').length > 0 && (
                    <Card className="p-4 border-border">
                      <p className="font-semibold text-lg mb-3">Crédito - Opções de Parcelamento</p>
                      <div className="space-y-2">
                        {configs
                          .filter(c => c.payment_type === 'credit')
                          .sort((a, b) => a.installments - b.installments)
                          .map(config => {
                            const rate = config.config_type === 'per_installment'
                              ? (config.per_installment_rates?.[config.installments] ?? config.interest_rate)
                              : config.interest_rate;
                            const finalPrice = parseFloat(totalPrice) * (1 + rate / 100);
                            const installmentValue = finalPrice / config.installments;
                            
                            return (
                              <div key={config.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div>
                                  <p className="font-medium">{config.installments}x de R$ {installmentValue.toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Total: R$ {finalPrice.toFixed(2)} (Taxa: {rate.toFixed(2)}%)
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Preencha o valor total para ver as formas de pagamento
                </p>
              )}
            </div>
          </div>

          <Button 
            onClick={handleGenerateQuote}
            className="w-full mt-8 h-12 text-lg bg-gradient-to-r from-primary to-primary/80"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            Gerar Orçamento Profissional
          </Button>
        </CardContent>
      </Card>

      {showPreview && (
        <Card className="shadow-2xl border-2 border-primary/30">
          <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
            <div className="text-center">
              <CardTitle className="text-3xl font-bold mb-2">✈️ ORÇAMENTO DE PASSAGEM AÉREA</CardTitle>
              <p className="text-muted-foreground">Proposta Comercial</p>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Cliente */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b">
                  <User className="h-5 w-5 text-primary" />
                  Dados do Cliente
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Nome</p>
                    <p className="font-semibold text-lg">{clientName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Telefone</p>
                    <p className="font-semibold text-lg">{clientPhone}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Voo */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b">
                  <Plane className="h-5 w-5 text-primary" />
                  Detalhes do Voo
                </h3>
                <div className="text-sm space-y-3">
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-semibold text-lg">
                      {tripType === 'one_way' ? 'Só Ida' : tripType === 'round_trip' ? 'Ida e Volta' : 'Múltiplos Trechos'}
                    </p>
                  </div>
                  
                  {tripType === 'round_trip' ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">Rota</p>
                        <p className="font-semibold text-lg">{roundTripData.origin} ↔ {roundTripData.destination}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Data de Ida</p>
                        <p className="font-semibold">{format(new Date(roundTripData.departureDate), 'dd/MM/yyyy')}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-muted-foreground">Data de Volta</p>
                        <p className="font-semibold">{format(new Date(roundTripData.returnDate), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {flightSegments.filter(seg => seg.from && seg.to).map((segment, index) => (
                        <div key={index} className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-muted-foreground text-xs">Trecho {index + 1}</p>
                          <p className="font-semibold">{segment.from} → {segment.to}</p>
                          {segment.date && (
                            <p className="text-sm">{format(new Date(segment.date), 'dd/MM/yyyy')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Valores */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Valores
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Passageiros</span>
                    <span className="font-medium">{passengers}</span>
                  </div>
                  {parseInt(passengers) > 1 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor por Passageiro</span>
                      <span className="font-medium">R$ {pricePerPassenger}</span>
                    </div>
                  )}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center bg-gradient-to-r from-primary/20 to-primary/10 p-5 rounded-xl border-2 border-primary/30">
                    <span className="text-xl font-bold">VALOR À VISTA</span>
                    <span className="text-3xl font-bold text-primary">
                      R$ {parseFloat(totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />
              
              {/* Formas de Pagamento no Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b">
                  💳 Formas de Pagamento
                </h3>
                
                {/* PIX */}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">PIX</span>
                    <span className="text-lg font-bold text-primary">
                      R$ {parseFloat(totalPrice).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Débito */}
                {(() => {
                  const debitConfig = configs.find(c => c.payment_type === 'debit');
                  const debitTotal = debitConfig && debitConfig.interest_rate > 0
                    ? parseFloat(totalPrice) * (1 + debitConfig.interest_rate / 100)
                    : parseFloat(totalPrice);
                  
                  return (
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold">Débito</span>
                          {debitConfig && debitConfig.interest_rate > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (Taxa: {debitConfig.interest_rate.toFixed(2)}%)
                            </span>
                          )}
                        </div>
                        <span className="text-lg font-bold">
                          R$ {debitTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Crédito */}
                {configs.filter(c => c.payment_type === 'credit').length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="font-semibold mb-2">Crédito - Parcelamento</p>
                    <div className="space-y-1.5 text-sm">
                      {configs
                        .filter(c => c.payment_type === 'credit')
                        .sort((a, b) => a.installments - b.installments)
                        .map(config => {
                          const rate = config.config_type === 'per_installment'
                            ? (config.per_installment_rates?.[config.installments] ?? config.interest_rate)
                            : config.interest_rate;
                          const finalPrice = parseFloat(totalPrice) * (1 + rate / 100);
                          const installmentValue = finalPrice / config.installments;
                          
                          return (
                            <div key={config.id} className="flex items-center justify-between">
                              <span>{config.installments}x de R$ {installmentValue.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">
                                = R$ {finalPrice.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Observação */}
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground text-center">
                  ⚠️ Valores sujeitos a alterações conforme disponibilidade e regras da companhia aérea.
                </p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="grid md:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto">
              <Button onClick={handleSendWhatsApp} size="lg" className="h-12">
                <Send className="h-5 w-5 mr-2" />
                Enviar WhatsApp
              </Button>
              
              <Button onClick={handleCopyText} variant="outline" size="lg" className="h-12">
                <Copy className="h-5 w-5 mr-2" />
                Copiar Texto
              </Button>
              
              <Button onClick={handleSaveQuote} variant="secondary" size="lg" className="h-12">
                <Download className="h-5 w-5 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Análise Interna - Apenas para a agência */}
      {showPreview && totalPrice && passengers && costPerMile && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-500 flex items-center gap-2">
              📊 Análise Interna
              <span className="text-sm font-normal text-muted-foreground">(Não incluído no orçamento do cliente)</span>
            </CardTitle>
            <CardDescription>
              Informações para controle e análise de rentabilidade da agência
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Calcular total de milhas
              let totalMiles = 0;
              if (tripType === "round_trip") {
                totalMiles = roundTripData.miles || 0;
              } else {
                totalMiles = flightSegments.reduce((sum, seg) => sum + (seg.miles || 0), 0);
              }

              // Calcular custos
              const milesPerPassenger = totalMiles;
              const totalMilesAllPassengers = milesPerPassenger * parseInt(passengers);
              const costPerMileValue = parseFloat(costPerMile);
              const totalCost = (totalMilesAllPassengers * costPerMileValue) / 1000; // Custo por 1000 milhas
              const salePrice = parseFloat(totalPrice);
              const profit = salePrice - totalCost;
              const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

              return (
                <>
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 bg-background rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Total de Milhas</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {totalMilesAllPassengers.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {milesPerPassenger.toLocaleString('pt-BR')} por passageiro
                      </p>
                    </div>

                    <div className="p-4 bg-background rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Custo Total</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        R$ {totalCost.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        R$ {costPerMileValue.toFixed(3)} por milha
                      </p>
                    </div>
                    
                    <div className="p-4 bg-background rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Lucro</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        R$ {profit.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Venda - Custo
                      </p>
                    </div>

                    <div className="p-4 bg-background rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Margem</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {margin.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Margem de lucro
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-background rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Valor de Venda</p>
                      <p className="text-2xl font-bold">R$ {salePrice.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        R$ {pricePerPassenger} por passageiro
                      </p>
                    </div>

                    {boardingFee && parseFloat(boardingFee) > 0 && (
                      <div className="p-4 bg-background rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">Taxas de Embarque</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          R$ {(parseFloat(boardingFee) * parseInt(passengers)).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          R$ {parseFloat(boardingFee).toFixed(2)} por passageiro
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      💡 <strong>Dica:</strong> Esta análise completa mostra custo, lucro e margem baseados no total de milhas e custo por milha. 
                      Estas informações não aparecem no orçamento enviado ao cliente.
                    </p>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
