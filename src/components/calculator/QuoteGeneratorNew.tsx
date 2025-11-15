import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Send, Copy, ArrowLeft, User, Plane, DollarSign, Plus, Info, Calculator, ChevronDown, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FlightSegmentForm, type FlightSegment } from "@/components/sales/FlightSegmentForm";
import { RoundTripForm, type RoundTripData } from "@/components/calculator/RoundTripForm";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { formatMiles } from "@/lib/utils";

export function QuoteGeneratorNew() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeMethods } = usePaymentMethods();
  
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
  const [costPerMile, setCostPerMile] = useState("");
  const [desiredMarkup, setDesiredMarkup] = useState("");
  const [showCalculator, setShowCalculator] = useState(true);
  
  const [showPreview, setShowPreview] = useState(false);
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing quote if editing
  useEffect(() => {
    if (quoteId) {
      loadQuote(quoteId);
    }
  }, [quoteId]);

  const loadQuote = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setExistingQuoteId(data.id);
        setClientName(data.client_name);
        setClientPhone(data.client_phone || "");
        setPassengers(data.passengers?.toString() || "1");
        setTotalPrice(data.total_price.toString());
        setBoardingFee(data.boarding_fee?.toString() || "");
        
        // Load flight segments if available
        if (data.flight_segments) {
          const segments = Array.isArray(data.flight_segments) 
            ? data.flight_segments 
            : [];
          
          if (segments.length > 0) {
            if (data.trip_type === "round_trip" && segments.length === 2) {
              const seg0 = segments[0] as any;
              const seg1 = segments[1] as any;
              setRoundTripData({
                origin: seg0?.from || "",
                destination: seg0?.to || "",
                departureDate: seg0?.date || "",
                returnDate: seg1?.date || "",
                miles: data.miles_needed || 0
              });
            } else {
              setFlightSegments(segments as any);
            }
            setTripType((data.trip_type as any) || "round_trip");
          }
        }

        toast({
          title: "Orçamento carregado",
          description: "Edite os campos e salve novamente",
        });
      }
    } catch (error: any) {
      console.error("Error loading quote:", error);
      toast({
        title: "Erro ao carregar orçamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuote = () => {
    if (!clientName || !clientPhone || !totalPrice) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, telefone e valor total.",
        variant: "destructive",
      });
      return;
    }

    if (tripType === "round_trip") {
      if (!roundTripData.origin || !roundTripData.destination || !roundTripData.departureDate || !roundTripData.returnDate || !roundTripData.miles) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos do voo de ida e volta, incluindo milhas.",
          variant: "destructive",
        });
        return;
      }
    } else if (tripType === "one_way" || tripType === "multi_city") {
      const hasValidSegment = flightSegments.some(seg => seg.from && seg.to && seg.date);
      if (!hasValidSegment) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha ao menos 1 trecho completo.",
          variant: "destructive",
        });
        return;
      }
    }

    setShowPreview(true);
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
      // Parse dates correctly to avoid timezone issues
      const [depYear, depMonth, depDay] = roundTripData.departureDate.split('-');
      const [retYear, retMonth, retDay] = roundTripData.returnDate.split('-');
      text += `Data de Ida: ${depDay}/${depMonth}/${depYear}\n`;
      text += `Data de Volta: ${retDay}/${retMonth}/${retYear}\n`;
      text += `Milhas: ${formatMiles(roundTripData.miles)} por passageiro\n`;
    } else {
      flightSegments.filter(seg => seg.from && seg.to).forEach((segment, index) => {
        text += `\nTrecho ${index + 1}: ${segment.from} → ${segment.to}\n`;
        if (segment.date) {
          const [year, month, day] = segment.date.split('-');
          text += `Data: ${day}/${month}/${year}\n`;
        }
        if (segment.miles) {
          text += `Milhas: ${formatMiles(segment.miles)} por passageiro\n`;
        }
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
    
    // Use configured payment methods
    if (activeMethods && activeMethods.length > 0) {
      activeMethods.forEach(method => {
        text += `• ${method.method_name}`;
        if (method.method_type === 'pix' && method.additional_info) {
          try {
            const info = JSON.parse(method.additional_info as string);
            if (info.pix_key) {
              text += ` - Chave: ${info.pix_key}`;
            }
          } catch (e) {}
        }
        text += `\n`;
      });
    } else {
      text += `• PIX - R$ ${parseFloat(totalPrice).toFixed(2)}\n`;
    }
    
    text += `\n_Orçamento válido por 48h_\n`;
    text += `_Sujeito à disponibilidade_`;
    
    return text;
  };

  const handleSaveQuote = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const totalMiles = tripType === 'round_trip' 
        ? roundTripData.miles 
        : flightSegments.reduce((sum, seg) => sum + (seg.miles || 0), 0);

      const segments = tripType === 'round_trip'
        ? [
            { from: roundTripData.origin, to: roundTripData.destination, date: roundTripData.departureDate },
            { from: roundTripData.destination, to: roundTripData.origin, date: roundTripData.returnDate }
          ]
        : flightSegments.filter(seg => seg.from && seg.to);

      const quoteData: any = {
        user_id: user.id,
        client_name: clientName,
        client_phone: clientPhone,
        total_price: parseFloat(totalPrice),
        miles_needed: totalMiles * parseInt(passengers),
        passengers: parseInt(passengers),
        boarding_fee: parseFloat(boardingFee) || null,
        trip_type: tripType,
        flight_segments: segments,
        status: "pending" as const,
      };

      let result;
      if (existingQuoteId) {
        // Update existing quote
        const { data, error } = await supabase
          .from("quotes")
          .update(quoteData)
          .eq("id", existingQuoteId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;

        toast({
          title: "Orçamento atualizado!",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        // Create new quote
        const { data, error } = await supabase
          .from("quotes")
          .insert(quoteData)
          .select()
          .single();

        if (error) throw error;
        result = data;

        toast({
          title: "Orçamento salvo!",
          description: "Você pode visualizar no histórico de orçamentos.",
        });

        setExistingQuoteId(result.id);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    const text = generateQuoteText();
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Mensagem copiada para área de transferência",
    });
  };

  const handleSendWhatsApp = async () => {
    const text = generateQuoteText();
    const encodedText = encodeURIComponent(text);
    const phoneNumber = clientPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodedText}`;
    
    // Save quote if not saved yet
    if (!existingQuoteId) {
      await handleSaveQuote();
    }
    
    window.open(whatsappUrl, '_blank');
  };

  const handleAddSegment = () => {
    setFlightSegments([...flightSegments, { from: "", to: "", date: "" }]);
  };

  const handleRemoveSegment = (index: number) => {
    const newSegments = flightSegments.filter((_, i) => i !== index);
    setFlightSegments(newSegments);
  };

  const updateSegment = (index: number, field: keyof FlightSegment, value: string | number) => {
    const newSegments = [...flightSegments];
    newSegments[index] = { ...newSegments[index], [field]: value };
    setFlightSegments(newSegments);
  };

  // Cálculos da calculadora automática
  const milesNum = tripType === 'round_trip' 
    ? roundTripData.miles 
    : flightSegments.reduce((sum, seg) => sum + (seg.miles || 0), 0);
  const costPerMileNum = parseFloat(costPerMile) || 0;
  const boardingFeeNum = parseFloat(boardingFee) || 0;
  const passengersNum = parseInt(passengers) || 1;
  const targetMarginNum = parseFloat(desiredMarkup) || 0;

  const costPerPassenger = (milesNum / 1000) * costPerMileNum + boardingFeeNum;
  const totalCost = costPerPassenger * passengersNum;
  const suggestedPrice = targetMarginNum > 0 && targetMarginNum < 100 
    ? totalCost / (1 - targetMarginNum / 100) 
    : totalCost;
  
  const currentPrice = parseFloat(totalPrice) || 0;
  const profit = currentPrice - totalCost;
  const profitMargin = currentPrice > 0 ? (profit / currentPrice) * 100 : 0;

  // Update totalPrice when calculator values change
  useEffect(() => {
    if (costPerMile && desiredMarkup && milesNum > 0 && suggestedPrice > 0) {
      setTotalPrice(suggestedPrice.toFixed(2));
    }
  }, [costPerMile, desiredMarkup, milesNum, passengersNum, boardingFeeNum]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {existingQuoteId && <Edit2 className="h-7 w-7" />}
            {existingQuoteId ? "Editar Orçamento" : "Gerador de Orçamentos"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {existingQuoteId 
              ? "Atualize os campos e salve as alterações" 
              : "Crie orçamentos profissionais em segundos"
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/orcamentos")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                placeholder="Digite o nome completo"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Telefone *</Label>
              <Input
                id="clientPhone"
                placeholder="(11) 98765-4321"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Detalhes do Voo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de Viagem</Label>
            <RadioGroup value={tripType} onValueChange={(v: any) => setTripType(v)} className="flex gap-4 mt-2">
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
              {flightSegments.map((segment, index) => (
                <FlightSegmentForm
                  key={index}
                  segment={segment}
                  index={index}
                  onUpdate={updateSegment}
                  onRemove={handleRemoveSegment}
                  canRemove={flightSegments.length > 1}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSegment}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Trecho
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Collapsible open={showCalculator} onOpenChange={setShowCalculator}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Preço (Automática)
              </CardTitle>
              <ChevronDown className={`h-5 w-5 transition-transform ${showCalculator ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CardDescription>
              Configure o custo e margem. O preço será calculado automaticamente.
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <Label htmlFor="costPerMile">Custo por Milheiro (R$)</Label>
                  <Input
                    id="costPerMile"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 29.00"
                    value={costPerMile}
                    onChange={(e) => setCostPerMile(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="desiredMarkup">Margem Desejada (%)</Label>
                  <Input
                    id="desiredMarkup"
                    type="number"
                    step="1"
                    placeholder="Ex: 20"
                    value={desiredMarkup}
                    onChange={(e) => setDesiredMarkup(e.target.value)}
                  />
                </div>
              </div>

              {costPerMile && desiredMarkup && milesNum > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1 text-sm">
                      <p><strong>Total de Milhas:</strong> {formatMiles(milesNum * passengersNum)}</p>
                      <p><strong>Custo Total:</strong> R$ {totalCost.toFixed(2)}</p>
                      <p><strong>Preço Sugerido:</strong> R$ {suggestedPrice.toFixed(2)}</p>
                      {currentPrice > 0 && (
                        <>
                          <Separator className="my-2" />
                          <p className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                            <strong>Lucro:</strong> R$ {profit.toFixed(2)} ({profitMargin.toFixed(1)}% de margem)
                          </p>
                        </>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Valores Finais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="passengers">Número de Passageiros *</Label>
              <Input
                id="passengers"
                type="number"
                min="1"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="boardingFee">Taxa de Embarque por Pessoa (R$)</Label>
              <Input
                id="boardingFee"
                type="number"
                step="0.01"
                placeholder="Ex: 35.00"
                value={boardingFee}
                onChange={(e) => setBoardingFee(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="totalPrice">Preço Total Cobrado (R$) *</Label>
              <Input
                id="totalPrice"
                type="number"
                step="0.01"
                placeholder="Digite o valor"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleGenerateQuote} className="flex-1" disabled={loading}>
          <FileText className="h-4 w-4 mr-2" />
          Gerar Prévia
        </Button>
        <Button onClick={handleSaveQuote} variant="outline" disabled={loading}>
          {existingQuoteId ? "Atualizar" : "Salvar"} Orçamento
        </Button>
      </div>

      {showPreview && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Prévia do Orçamento</CardTitle>
            <CardDescription>Confira a mensagem antes de enviar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap">
              {generateQuoteText()}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleCopyText} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button onClick={handleSendWhatsApp} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Enviar WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}