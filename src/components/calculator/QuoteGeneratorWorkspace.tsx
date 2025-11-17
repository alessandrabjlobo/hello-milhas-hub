import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Send, Copy, Download, User, Plane, DollarSign, 
  Calculator, Upload, X, Save 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { FlightSegmentForm, type FlightSegment } from "@/components/sales/FlightSegmentForm";
import { RoundTripForm, type RoundTripData } from "@/components/calculator/RoundTripForm";
import { useMilesCalculator } from "@/hooks/useMilesCalculator";
import { useQuoteStorage } from "@/hooks/useQuoteStorage";
import { exportQuoteAsImage } from "@/utils/exportQuoteAsImage";
import { formatMiles } from "@/lib/utils";

const formatNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseFormattedNumber = (value: string): number => {
  return parseFloat(value.replace(/\./g, '')) || 0;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
};

export function QuoteGeneratorWorkspace() {
  const { toast } = useToast();
  const { uploading, uploadQuoteImage, deleteQuoteImage } = useQuoteStorage();
  
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
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
  
  const [milesUsed, setMilesUsed] = useState("50000");
  const [costPerMile, setCostPerMile] = useState("29.00");
  const [boardingFee, setBoardingFee] = useState("35.00");
  const [passengers, setPassengers] = useState("1");
  const [targetMargin, setTargetMargin] = useState("20");
  const [manualPrice, setManualPrice] = useState("");
  
  const [quoteNotes, setQuoteNotes] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);

  const calculatorResults = useMilesCalculator({
    milesUsed: parseFormattedNumber(milesUsed),
    costPerMile: parseFloat(costPerMile) || 0,
    boardingFee: parseFloat(boardingFee) || 0,
    passengers: parseInt(passengers) || 1,
    targetMargin: parseFloat(targetMargin),
    manualPrice: parseFloat(manualPrice),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado.",
        variant: "destructive",
      });
      return;
    }

    for (const file of Array.from(files)) {
      const url = await uploadQuoteImage(user.id, existingQuoteId, file);
      if (url) {
        setUploadedImages(prev => [...prev, url]);
      }
    }
  };

  const handleDeleteImage = async (url: string) => {
    const success = await deleteQuoteImage(url);
    if (success) {
      setUploadedImages(prev => prev.filter(img => img !== url));
    }
  };

  const formatRoute = (): string => {
    if (tripType === "round_trip") {
      return `✈️ *Rota:* ${roundTripData.origin || '[ORIGEM]'} → ${roundTripData.destination || '[DESTINO]'}
📅 *Ida:* ${roundTripData.departureDate ? format(new Date(roundTripData.departureDate), 'dd/MM/yyyy') : '[DATA]'}
📅 *Volta:* ${roundTripData.returnDate ? format(new Date(roundTripData.returnDate), 'dd/MM/yyyy') : '[DATA]'}`;
    } else if (tripType === "one_way") {
      const segment = flightSegments[0];
      return `✈️ *Rota:* ${segment?.from || '[ORIGEM]'} → ${segment?.to || '[DESTINO]'}
📅 *Data:* ${segment?.date ? format(new Date(segment.date), 'dd/MM/yyyy') : '[DATA]'}`;
    } else {
      const validSegments = flightSegments.filter(s => s.from && s.to && s.date);
      if (validSegments.length === 0) return "✈️ *Rota:* [Multi-trechos]";
      
      return `✈️ *Trechos:*\n` + validSegments.map((seg, idx) => 
        `${idx + 1}. ${seg.from} → ${seg.to} (${format(new Date(seg.date), 'dd/MM/yyyy')})`
      ).join('\n');
    }
  };

  const generateClientMessage = () => {
    const route = formatRoute();
    const price = calculatorResults.finalPrice;
    
    return `🎫 *ORÇAMENTO DE PASSAGEM AÉREA*

👤 *Cliente:* ${clientName || '[Nome]'}
📱 *Contato:* ${clientPhone || '[Telefone]'}

${route}

👥 *Passageiros:* ${passengers}
✈️ *Milhas:* ${formatMiles(parseFormattedNumber(milesUsed))}

💰 *VALOR TOTAL:*
*R$ ${formatCurrency(price)}*

📋 Formas de pagamento disponíveis mediante consulta.

_Orçamento válido por 24 horas_`;
  };

  const generateSupplierMessage = () => {
    const miles = parseFormattedNumber(milesUsed);
    const cost = calculatorResults.totalCost;
    
    return `📊 *SOLICITAÇÃO DE EMISSÃO*

✈️ *Milhas necessárias:* ${formatMiles(miles)}
💵 *Custo:* R$ ${formatCurrency(cost)}
👤 *Cliente:* ${clientName || '[Nome]'}
📞 *Telefone:* ${clientPhone || '[Telefone]'}

${formatRoute()}

_Aguardando confirmação para emissão_`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `Mensagem para ${type} copiada.`,
    });
  };

  const handleSaveQuote = async () => {
    if (!clientName || !clientPhone) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e telefone do cliente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let routeText = "";
      if (tripType === "round_trip") {
        routeText = `${roundTripData.origin} ⇄ ${roundTripData.destination}`;
      } else if (tripType === "one_way") {
        routeText = `${flightSegments[0]?.from} → ${flightSegments[0]?.to}`;
      } else {
        const validSegments = flightSegments.filter(s => s.from && s.to);
        routeText = validSegments.map(s => `${s.from} → ${s.to}`).join(', ');
      }

      const quoteData = {
        user_id: user.id,
        client_name: clientName,
        client_phone: clientPhone,
        route: routeText,
        miles_needed: parseFormattedNumber(milesUsed),
        total_price: calculatorResults.finalPrice,
        trip_type: tripType,
        boarding_fee: parseFloat(boardingFee) || 0,
        passengers: parseInt(passengers) || 1,
        flight_segments: JSON.stringify(
          tripType === "round_trip" 
            ? [
                { from: roundTripData.origin, to: roundTripData.destination, date: roundTripData.departureDate },
                { from: roundTripData.destination, to: roundTripData.origin, date: roundTripData.returnDate }
              ]
            : flightSegments
        ),
        flight_details: JSON.stringify({
          costPerMile: parseFloat(costPerMile),
          targetMargin: parseFloat(targetMargin),
          manualPrice: manualPrice ? parseFloat(manualPrice) : null,
          notes: quoteNotes,
        }),
        attachments: JSON.stringify(uploadedImages),
        status: 'pending',
      };

      if (existingQuoteId) {
        const { error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', existingQuoteId);
        
        if (error) throw error;
        
        toast({
          title: "Orçamento atualizado!",
          description: "Alterações salvas.",
        });
      } else {
        const { data, error } = await supabase
          .from('quotes')
          .insert(quoteData)
          .select()
          .single();
        
        if (error) throw error;
        
        setExistingQuoteId(data.id);
        
        toast({
          title: "Orçamento salvo!",
          description: "Criado com sucesso.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportJPG = async () => {
    try {
      await exportQuoteAsImage('quote-capture-area', `orcamento-${clientName || 'cliente'}`);
      toast({
        title: "Exportado!",
        description: "Orçamento salvo como imagem.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar a imagem.",
        variant: "destructive",
      });
    }
  };

  const handleSendWhatsApp = () => {
    const message = generateClientMessage();
    const phoneNumber = clientPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Novo Orçamento</h1>
        <p className="text-muted-foreground">Workspace de orçamento estilo OneNote</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUNA ESQUERDA */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Espaço para Prints e Anotações
              </CardTitle>
              <CardDescription>
                Adicione prints e observações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="quote-image-upload"
                  disabled={uploading}
                />
                <Label htmlFor="quote-image-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="font-medium">Adicionar prints</span>
                    <span className="text-xs text-muted-foreground">
                      {uploading ? "Enviando..." : "Clique ou arraste"}
                    </span>
                  </div>
                </Label>
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {uploadedImages.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Print ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer border border-border"
                        onClick={() => setSelectedImagePreview(url)}
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(url);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Digite suas anotações..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA */}
        <div id="quote-capture-area" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(XX) XXXXX-XXXX"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Trechos da Viagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={tripType} onValueChange={(value: any) => setTripType(value)}>
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
                  <Label htmlFor="multi_city" className="cursor-pointer">Multi-trechos</Label>
                </div>
              </RadioGroup>

              <Separator />

              {tripType === "round_trip" && (
                <RoundTripForm
                  data={roundTripData}
                  onChange={setRoundTripData}
                />
              )}

              {tripType === "one_way" && (
                <FlightSegmentForm
                  segment={flightSegments[0]}
                  onChange={(updated) => setFlightSegments([updated])}
                  onRemove={() => {}}
                  showRemove={false}
                />
              )}

              {tripType === "multi_city" && (
                <div className="space-y-3">
                  {flightSegments.map((segment, idx) => (
                    <FlightSegmentForm
                      key={idx}
                      segment={segment}
                      onChange={(updated) => {
                        const newSegments = [...flightSegments];
                        newSegments[idx] = updated;
                        setFlightSegments(newSegments);
                      }}
                      onRemove={() => {
                        setFlightSegments(flightSegments.filter((_, i) => i !== idx));
                      }}
                      showRemove={flightSegments.length > 1}
                    />
                  ))}
                  <Button
                    onClick={() => setFlightSegments([...flightSegments, { from: "", to: "", date: "" }])}
                    variant="outline"
                    className="w-full"
                  >
                    Adicionar Trecho
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Milhas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Milhas Totais</Label>
                  <Input
                    value={milesUsed}
                    onChange={(e) => setMilesUsed(formatNumber(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Custo por Milheiro (R$)</Label>
                  <Input
                    value={costPerMile}
                    onChange={(e) => setCostPerMile(e.target.value)}
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Taxa de Embarque (R$)</Label>
                  <Input
                    value={boardingFee}
                    onChange={(e) => setBoardingFee(e.target.value)}
                    type="number"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Passageiros</Label>
                  <Input
                    type="number"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Margem Desejada (%)</Label>
                  <Input
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(e.target.value)}
                    type="number"
                  />
                </div>
                <div>
                  <Label>Preço Manual (R$)</Label>
                  <Input
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total de Milhas:</span>
                <span className="font-medium">{formatMiles(parseFormattedNumber(milesUsed))}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo Total:</span>
                <span className="font-medium text-destructive">
                  R$ {formatCurrency(calculatorResults.totalCost)}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between">
                <span className="font-semibold">Preço Total Cliente:</span>
                <span className="font-bold text-lg text-primary">
                  R$ {formatCurrency(calculatorResults.finalPrice)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lucro Estimado:</span>
                <span className={`font-medium ${calculatorResults.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {formatCurrency(calculatorResults.profit)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margem de Lucro:</span>
                <Badge variant={calculatorResults.profitMargin >= 20 ? 'default' : 'secondary'}>
                  {calculatorResults.profitMargin.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gerar Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="client">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="client">Cliente</TabsTrigger>
                  <TabsTrigger value="supplier">Fornecedor</TabsTrigger>
                </TabsList>

                <TabsContent value="client" className="space-y-3">
                  <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                    {generateClientMessage()}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(generateClientMessage(), 'cliente')}
                    className="w-full"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Mensagem
                  </Button>
                </TabsContent>

                <TabsContent value="supplier" className="space-y-3">
                  <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                    {generateSupplierMessage()}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(generateSupplierMessage(), 'fornecedor')}
                    className="w-full"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Mensagem
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <Button onClick={handleSaveQuote} className="flex-1" size="lg">
          <Save className="h-4 w-4 mr-2" />
          Salvar Orçamento
        </Button>

        <Button onClick={handleExportJPG} variant="outline" size="lg" className="hidden md:flex">
          <Download className="h-4 w-4 mr-2" />
          Exportar JPG
        </Button>

        <Button onClick={handleSendWhatsApp} variant="outline" size="lg" disabled={!clientPhone}>
          <Send className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
      </div>

      <Dialog open={!!selectedImagePreview} onOpenChange={() => setSelectedImagePreview(null)}>
        <DialogContent className="max-w-4xl">
          <img src={selectedImagePreview || ''} alt="Preview" className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
