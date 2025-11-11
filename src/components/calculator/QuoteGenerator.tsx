import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, Copy, Download, User, Phone, MapPin, Calendar, Plane, DollarSign, Clock, Users, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { FlightSegmentForm, type FlightSegment } from "@/components/sales/FlightSegmentForm";
import { usePaymentInterestConfig } from "@/hooks/usePaymentInterestConfig";

export function QuoteGenerator() {
  const { toast } = useToast();
  const { configs, calculateInstallmentValue } = usePaymentInterestConfig();
  
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [route, setRoute] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [milesNeeded, setMilesNeeded] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [costPerThousand, setCostPerThousand] = useState("");
  const [boardingFee, setBoardingFee] = useState("");
  
  // Trip type e flight segments
  const [tripType, setTripType] = useState<"one_way" | "round_trip" | "multi_city">("round_trip");
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "" },
    { from: "", to: "", date: "" }
  ]);
  
  // Novos campos de voo (legacy - para compatibilidade)
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [duration, setDuration] = useState("");
  const [stops, setStops] = useState("");
  const [stopCities, setStopCities] = useState("");
  
  // Parcelamento
  const [installments, setInstallments] = useState<number>();
  const [selectedInterestRate, setSelectedInterestRate] = useState<number>(0);
  
  // Formas de pagamento
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerateQuote = () => {
    if (!clientName || !clientPhone || !route || !departureDate || !milesNeeded || !totalPrice) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios (*).",
        variant: "destructive",
      });
      return;
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

    const flightDetails = {
      departure_time: departureTime || null,
      arrival_time: arrivalTime || null,
      duration: duration || null,
      stops: stops ? parseInt(stops) : null,
      stop_cities: stopCities ? stopCities.split(",").map(s => s.trim()) : []
    };

    const finalPrice = installments && installments > 1 
      ? parseFloat(totalPrice) * (1 + selectedInterestRate / 100)
      : parseFloat(totalPrice);

    const { error } = await supabase.from("quotes").insert([{
      user_id: user.id,
      client_name: clientName,
      client_phone: clientPhone,
      route: route,
      departure_date: flightSegments[0]?.date || departureDate,
      miles_needed: parseInt(milesNeeded),
      total_price: parseFloat(totalPrice),
      passengers: parseInt(passengers),
      trip_type: tripType,
      boarding_fee: boardingFee ? parseFloat(boardingFee) : 0,
      installments: installments || null,
      interest_rate: selectedInterestRate || null,
      final_price_with_interest: finalPrice,
      flight_segments: flightSegments as any,
      flight_details: flightDetails as any,
      payment_methods: paymentMethods,
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
    
    // Exibir trechos de voo
    flightSegments.filter(seg => seg.from && seg.to).forEach((segment, index) => {
      text += `\nTrecho ${index + 1}: ${segment.from} → ${segment.to}\n`;
      if (segment.date) text += `Data: ${format(new Date(segment.date), 'dd/MM/yyyy')}\n`;
      if (segment.time) text += `Horário: ${segment.time}\n`;
      if (segment.airline) text += `Companhia: ${segment.airline}\n`;
    });
    
    text += `\n*💰 VALORES*\n`;
    text += `Passageiros: ${passengers}\n`;
    text += `Milhas necessárias: ${parseInt(milesNeeded).toLocaleString('pt-BR')}\n`;
    if (boardingFee && parseFloat(boardingFee) > 0) {
      text += `Taxa de embarque: R$ ${parseFloat(boardingFee).toFixed(2)} por passageiro\n`;
      text += `Total taxas: R$ ${totalBoardingFee}\n`;
    }
    if (parseInt(passengers) > 1) {
      text += `Valor por pessoa: R$ ${pricePerPassenger}\n`;
    }
    text += `\n*VALOR TOTAL: R$ ${parseFloat(totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*\n`;
    
    // Adicionar informação de parcelamento
    if (installments && installments > 1) {
      const finalPrice = parseFloat(totalPrice) * (1 + selectedInterestRate / 100);
      const installmentValue = finalPrice / installments;
      text += `\n*Parcelamento: ${installments}x de R$ ${installmentValue.toFixed(2)}*\n`;
      text += `*Valor total parcelado: R$ ${finalPrice.toFixed(2)}* (Taxa: ${selectedInterestRate}%)\n`;
    }
    
    if (paymentMethods.length > 0) {
      text += `\n*💳 FORMAS DE PAGAMENTO*\n`;
      paymentMethods.forEach(method => {
        text += `• ${method}\n`;
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

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const pricePerPassenger = passengers && totalPrice 
    ? (parseFloat(totalPrice) / parseInt(passengers)).toFixed(2) 
    : "0.00";

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
          {/* Dados do Cliente */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Dados do Cliente
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name" className="flex items-center gap-2">
                    Nome Completo *
                  </Label>
                  <Input
                    id="client-name"
                    placeholder="João Silva"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-phone" className="flex items-center gap-2">
                    Telefone (WhatsApp) *
                  </Label>
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
                {/* Tipo de Viagem */}
                <div className="space-y-2">
                  <Label>Tipo de Viagem *</Label>
                  <RadioGroup 
                    value={tripType} 
                    onValueChange={(v) => {
                      const newType = v as typeof tripType;
                      setTripType(newType);
                      
                      if (newType === "one_way") {
                        setFlightSegments([{ from: "", to: "", date: "" }]);
                      } else if (newType === "round_trip") {
                        setFlightSegments([
                          { from: "", to: "", date: "" },
                          { from: "", to: "", date: "" }
                        ]);
                      } else {
                        setFlightSegments([
                          { from: "", to: "", date: "" },
                          { from: "", to: "", date: "" }
                        ]);
                      }
                    }}
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

                {/* Trechos de Voo */}
                <div className="space-y-3">
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
                      onRemove={tripType === "multi_city" ? (idx) => {
                        setFlightSegments(flightSegments.filter((_, i) => i !== idx));
                      } : undefined}
                      canRemove={tripType === "multi_city" && flightSegments.length > 1}
                    />
                  ))}
                  
                  {tripType === "multi_city" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFlightSegments([...flightSegments, { from: "", to: "", date: "" }])}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Trecho
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Valores */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Valores e Milhas
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
                  <Label htmlFor="miles-needed">Milhas Necessárias *</Label>
                  <Input
                    id="miles-needed"
                    type="number"
                    placeholder="50000"
                    value={milesNeeded}
                    onChange={(e) => setMilesNeeded(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total-price">Valor Total (R$) *</Label>
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

              <div className="space-y-2 mt-4">
                <Label htmlFor="cost-per-thousand" className="flex items-center gap-2">
                  Custo do Milheiro (R$/mil)
                  <Badge variant="secondary" className="ml-2">Interno</Badge>
                </Label>
                <Input
                  id="cost-per-thousand"
                  type="number"
                  step="0.01"
                  placeholder="29.00"
                  value={costPerThousand}
                  onChange={(e) => setCostPerThousand(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  📊 Este valor não será enviado ao cliente. Serve apenas para calcular sua margem de lucro.
                </p>
              </div>

              {milesNeeded && totalPrice && costPerThousand && (
                <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold mb-2">💰 Resumo Financeiro (Interno)</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Custo</p>
                      <p className="font-semibold">
                        R$ {((parseInt(milesNeeded) / 1000) * parseFloat(costPerThousand)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lucro</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        R$ {(parseFloat(totalPrice) - ((parseInt(milesNeeded) / 1000) * parseFloat(costPerThousand))).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margem</p>
                      <p className="font-semibold">
                        {(((parseFloat(totalPrice) - ((parseInt(milesNeeded) / 1000) * parseFloat(costPerThousand))) / parseFloat(totalPrice)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ Esta informação não será incluída na mensagem enviada ao cliente.
                  </p>
                </Card>
              )}
            </div>

            <Separator />

            {/* Parcelamento */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Parcelamento
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installments">Parcelamento (Opcional)</Label>
                  <Select 
                    value={installments?.toString()} 
                    onValueChange={(v) => {
                      const inst = parseInt(v);
                      setInstallments(inst);
                      
                      const config = configs.find(c => c.installments === inst && c.payment_type === 'credit');
                      if (config) {
                        setSelectedInterestRate(config.interest_rate);
                      } else {
                        setSelectedInterestRate(0);
                      }
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="À vista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">À vista</SelectItem>
                      {configs
                        .filter(c => c.payment_type === 'credit')
                        .sort((a, b) => a.installments - b.installments)
                        .map(config => (
                          <SelectItem key={config.id} value={config.installments.toString()}>
                            {config.installments}x - Taxa: {config.interest_rate.toFixed(2)}%
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {installments && installments > 1 && totalPrice && (
                  <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-sm font-semibold mb-2">Simulação do Parcelamento</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Parcela</p>
                        <p className="font-semibold">
                          R$ {((parseFloat(totalPrice) * (1 + selectedInterestRate / 100)) / installments).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total com Juros</p>
                        <p className="font-semibold">
                          R$ {(parseFloat(totalPrice) * (1 + selectedInterestRate / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            <Separator />

            {/* Formas de Pagamento */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Formas de Pagamento
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {["PIX", "Cartão de Crédito", "Transferência Bancária", "Boleto"].map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={method}
                      checked={paymentMethods.includes(method)}
                      onCheckedChange={() => togglePaymentMethod(method)}
                    />
                    <Label htmlFor={method} className="cursor-pointer font-normal">
                      {method}
                    </Label>
                  </div>
                ))}
              </div>
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
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Rota</p>
                    <p className="font-semibold text-lg">{route}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-semibold text-lg">{format(new Date(departureDate), 'dd/MM/yyyy')}</p>
                  </div>
                  {departureTime && (
                    <div>
                      <p className="text-muted-foreground">Partida</p>
                      <p className="font-semibold">{departureTime}</p>
                    </div>
                  )}
                  {arrivalTime && (
                    <div>
                      <p className="text-muted-foreground">Chegada</p>
                      <p className="font-semibold">{arrivalTime}</p>
                    </div>
                  )}
                  {duration && (
                    <div>
                      <p className="text-muted-foreground">Duração</p>
                      <p className="font-semibold">{duration}</p>
                    </div>
                  )}
                  {stops && (
                    <div>
                      <p className="text-muted-foreground">Escalas</p>
                      <p className="font-semibold">
                        {parseInt(stops) === 0 ? 'Voo Direto' : `${stops} parada(s)`}
                        {stopCities && parseInt(stops) > 0 && ` - ${stopCities}`}
                      </p>
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Milhas Necessárias</span>
                    <span className="font-medium">{parseInt(milesNeeded).toLocaleString('pt-BR')}</span>
                  </div>
                  {parseInt(passengers) > 1 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor por Passageiro</span>
                      <span className="font-medium">R$ {pricePerPassenger}</span>
                    </div>
                  )}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center bg-gradient-to-r from-primary/20 to-primary/10 p-5 rounded-xl border-2 border-primary/30">
                    <span className="text-xl font-bold">VALOR TOTAL</span>
                    <span className="text-3xl font-bold text-primary">
                      R$ {parseFloat(totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {paymentMethods.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2 pb-2 border-b">
                      💳 Formas de Pagamento
                    </h3>
                    <ul className="space-y-2">
                      {paymentMethods.map((method) => (
                        <li key={method} className="flex items-center gap-2">
                          <span className="text-primary">•</span>
                          <span>{method}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

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
    </div>
  );
}
