import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Send, Copy, Download, User, Phone, MapPin, Calendar, Plane, DollarSign, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function QuoteGenerator() {
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [route, setRoute] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [milesNeeded, setMilesNeeded] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [costPerThousand, setCostPerThousand] = useState("");
  const [boardingFee, setBoardingFee] = useState("");
  
  // Novos campos de voo
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [duration, setDuration] = useState("");
  const [stops, setStops] = useState("");
  const [stopCities, setStopCities] = useState("");
  
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

    const { error } = await supabase.from("quotes").insert({
      user_id: user.id,
      client_name: clientName,
      client_phone: clientPhone,
      route: route,
      departure_date: departureDate,
      miles_needed: parseInt(milesNeeded),
      total_price: parseFloat(totalPrice),
      passengers: parseInt(passengers),
      flight_details: flightDetails,
      payment_methods: paymentMethods,
      status: 'pending'
    });

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
    text += `Rota: ${route}\n`;
    text += `Data: ${format(new Date(departureDate), 'dd/MM/yyyy')}\n`;
    
    if (departureTime) text += `Partida: ${departureTime}\n`;
    if (arrivalTime) text += `Chegada: ${arrivalTime}\n`;
    if (duration) text += `Duração: ${duration}\n`;
    if (stops) {
      const stopsNum = parseInt(stops);
      text += `Escalas: ${stopsNum === 0 ? 'Direto' : `${stopsNum} parada(s)`}`;
      if (stopCities && stopsNum > 0) text += ` - ${stopCities}`;
      text += `\n`;
    }
    
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
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="route">Rota *</Label>
                  <Input
                    id="route"
                    placeholder="GRU → MIA → GRU"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departure-date">Data de Partida *</Label>
                  <Input
                    id="departure-date"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departure-time">Horário de Partida</Label>
                  <Input
                    id="departure-time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrival-time">Horário de Chegada</Label>
                  <Input
                    id="arrival-time"
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração do Voo</Label>
                  <Input
                    id="duration"
                    placeholder="6h 30m"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stops">Número de Escalas</Label>
                  <Input
                    id="stops"
                    type="number"
                    min="0"
                    placeholder="0 = Direto"
                    value={stops}
                    onChange={(e) => setStops(e.target.value)}
                    className="h-11"
                  />
                </div>

                {stops && parseInt(stops) > 0 && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="stop-cities">Cidades das Escalas</Label>
                    <Input
                      id="stop-cities"
                      placeholder="Miami, São Paulo (separadas por vírgula)"
                      value={stopCities}
                      onChange={(e) => setStopCities(e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}
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
