import { ArrowLeft, Upload, X, Copy, Download, Save, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RoundTripForm } from "@/components/calculator/RoundTripForm";
import { FlightSegmentForm, type FlightSegment } from "@/components/sales/FlightSegmentForm";
import { useStorage } from "@/hooks/useStorage";
import { useToast } from "@/hooks/use-toast";
import { usePaymentInterestConfig } from "@/hooks/usePaymentInterestConfig";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/utils";

type TripType = "one_way" | "round_trip" | "multi_city";

export default function QuoteGenerator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploading, uploadTicketFile } = useStorage();
  const { configs: interestConfigs, getCreditConfigs, getDebitRate } = usePaymentInterestConfig();
  const { activeMethods } = usePaymentMethods();

  // ========== ESTADOS ==========
  // Dados do Cliente
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [airline, setAirline] = useState("");

  // Dados da Viagem
  const [tripType, setTripType] = useState<TripType>("round_trip");
  const [roundTripData, setRoundTripData] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    miles: 0
  });

  // Multi-city segments
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "", miles: 0 }
  ]);

  // Valores da Calculadora (inline) - fonte única de verdade
  // Agora tratando milhas como "milhas por passageiro (/pax)"
  const [tripMiles, setTripMiles] = useState("50000");
  const [milesUsed, setMilesUsed] = useState("50000"); // milhas/pax
  const [costPerMile, setCostPerMile] = useState("29.00");
  const [boardingFee, setBoardingFee] = useState("35.00");
  const [passengers, setPassengers] = useState("2");
  const [targetMargin, setTargetMargin] = useState("20");
  const [manualPrice, setManualPrice] = useState("");

  // Caderno do Orçamento
  const [quoteTitle, setQuoteTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // UI States
  const [saving, setSaving] = useState(false);
  const [activeMessageTab, setActiveMessageTab] = useState("client");
  const [showQuotePreview, setShowQuotePreview] = useState(false);

  // ========== AUTO-GERAÇÃO DO NOME DO ORÇAMENTO ==========
  useEffect(() => {
    if (clientName && roundTripData.destination && roundTripData.departureDate && !quoteTitle) {
      try {
        const date = new Date(roundTripData.departureDate);
        const monthYear = format(date, "MMM/yyyy", { locale: ptBR });
        const autoTitle = `Viagem ${clientName} - ${roundTripData.destination} ${monthYear}`;
        setQuoteTitle(autoTitle);
      } catch (error) {
        // Data inválida, não gera título
      }
    }
  }, [clientName, roundTripData.destination, roundTripData.departureDate, quoteTitle]);

  // ========== SINCRONIZAÇÃO FORMULÁRIO ↔ CALCULADORA ==========
  useEffect(() => {
    if (tripMiles !== milesUsed) {
      setMilesUsed(tripMiles);
    }
  }, [tripMiles]);

  useEffect(() => {
    if (milesUsed !== tripMiles) {
      setTripMiles(milesUsed);
    }
  }, [milesUsed]);

  // ========== MULTI-TRECHOS: CALCULAR TOTAL DE MILHAS ==========
  const totalMilesFromSegments = useMemo(() => {
    return flightSegments.reduce((sum, seg) => sum + (seg.miles || 0), 0);
  }, [flightSegments]);

  useEffect(() => {
    if (tripType === "multi_city" && totalMilesFromSegments > 0) {
      // Aqui também tratamos como milhas/pax, você pode ajustar se quiser lógica diferente
      setMilesUsed(totalMilesFromSegments.toString());
      setTripMiles(totalMilesFromSegments.toString());
    }
  }, [tripType, totalMilesFromSegments]);

  // ========== FUNÇÕES PARA GERENCIAR MULTI-TRECHOS ==========
  const handleAddSegment = () => {
    setFlightSegments([...flightSegments, { from: "", to: "", date: "", miles: 0 }]);
  };

  const handleRemoveSegment = (index: number) => {
    if (flightSegments.length > 1) {
      setFlightSegments(flightSegments.filter((_, i) => i !== index));
    }
  };

  const handleUpdateSegment = (index: number, field: keyof FlightSegment, value: string | number) => {
    const updated = [...flightSegments];
    updated[index] = { ...updated[index], [field]: value };
    setFlightSegments(updated);
  };

  // ========== CÁLCULOS FINANCEIROS (COM MILHAS/PAX + MARKUP MILHAS) ==========
  const calculatedValues = useMemo(() => {
    const milesPerPassenger = parseFloat(milesUsed.replace(/\./g, "").replace(",", ".")) || 0; // milhas/pax
    const costPerMileNum = parseFloat(costPerMile.replace(",", ".")) || 0;
    const boardingFeeNum = parseFloat(boardingFee.replace(",", ".")) || 0;
    const passengersNum = parseInt(passengers) || 1;
    const marginNum = parseFloat(targetMargin.replace(",", ".")) || 0;

    // Milhas totais = milhas/pax * quantidade de passageiros
    const totalMiles = milesPerPassenger * passengersNum;

    // Custo só das milhas (/pax e total)
    const costMilesPerPassenger = (milesPerPassenger / 1000) * costPerMileNum;
    const totalMilesCost = costMilesPerPassenger * passengersNum;

    // Custo total por passageiro = milhas + taxa de embarque (repasse)
    const costPerPassenger = costMilesPerPassenger + boardingFeeNum;

    // Custo total da operação (inclui taxa de embarque)
    const totalCost = costPerPassenger * passengersNum;

    // Preço sugerido por passageiro: markup apenas sobre as milhas + taxa repassada
    const suggestedPricePerPassenger =
      costMilesPerPassenger * (1 + marginNum / 100) + boardingFeeNum;
    const suggestedPrice = suggestedPricePerPassenger * passengersNum;

    // Se houver preço manual, usar ele como preço final total (todos os passageiros)
    let finalPrice = suggestedPrice;
    if (manualPrice) {
      finalPrice =
        parseFloat(manualPrice.replace(/\./g, "").replace(",", ".")) || suggestedPrice;
    }

    const profit = finalPrice - totalCost;
    const profitMargin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;

    // Visão interna: markup das milhas (ignorando taxa de embarque)
    const finalPricePerPassenger = passengersNum > 0 ? finalPrice / passengersNum : 0;
    // Preço "efetivo" das milhas/pax = preço/pax - taxa de embarque (repasse)
    const effectiveMilesPricePerPassenger = Math.max(
      finalPricePerPassenger - boardingFeeNum,
      0
    );

    let milesMarkup = 0;
    if (costMilesPerPassenger > 0) {
      milesMarkup =
        ((effectiveMilesPricePerPassenger - costMilesPerPassenger) /
          costMilesPerPassenger) *
        100;
    }

    return {
      // visão principal
      totalCost,
      price: finalPrice,
      profit,
      profitMargin,

      // visão interna / detalhada
      milesPerPassenger,
      totalMiles,
      costMilesPerPassenger,
      totalMilesCost,
      costPerPassenger,
      finalPricePerPassenger,
      milesMarkup
    };
  }, [milesUsed, costPerMile, boardingFee, passengers, targetMargin, manualPrice]);

  // ========== UPLOAD DE IMAGENS ==========
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Faça login para fazer upload de imagens",
        variant: "destructive"
      });
      return;
    }

    const tempQuoteId = `quote-${Date.now()}`;
    const url = await uploadTicketFile(user.id, tempQuoteId, file);

    if (url) {
      setAttachments([...attachments, url]);
      toast({
        title: "Print adicionado!",
        description: "Imagem salva com sucesso"
      });
    }

    // Reset input
    e.target.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    toast({
      title: "Print removido",
      description: "Imagem removida do orçamento"
    });
  };

  // ========== GERAÇÃO DE MENSAGENS (INLINE) ==========
  const generateClientMessage = () => {
    const route =
      roundTripData.origin && roundTripData.destination
        ? `${roundTripData.origin} → ${roundTripData.destination}`
        : "Consulte o roteiro completo";

    const departureFormatted = roundTripData.departureDate
      ? format(new Date(roundTripData.departureDate), "dd/MM/yyyy", { locale: ptBR })
      : "A definir";

    const returnFormatted =
      roundTripData.returnDate && tripType === "round_trip"
        ? format(new Date(roundTripData.returnDate), "dd/MM/yyyy", { locale: ptBR })
        : null;

    const tripTypeText =
      tripType === "round_trip"
        ? "Ida e Volta"
        : tripType === "one_way"
        ? "Somente Ida"
        : "Múltiplos Trechos";

    return `🎫 *Orçamento de Passagem Aérea*

Olá *${clientName || "Cliente"}*! 👋

📍 *Rota:* ${route}
✈️ *Tipo:* ${tripTypeText}
📅 *Data Ida:* ${departureFormatted}${
      returnFormatted ? `\n🔄 *Data Volta:* ${returnFormatted}` : ""
    }
👥 *Passageiros:* ${passengers}

💰 *Valor Total:* R$ ${calculatedValues.price.toFixed(2).replace(".", ",")}

✅ Milhas incluídas
✅ Taxas de embarque incluídas
✅ Pagamento facilitado

Para confirmar sua viagem, basta enviar uma mensagem! 😊`;
  };

  const generateSupplierMessage = () => {
    const route =
      roundTripData.origin && roundTripData.destination
        ? `${roundTripData.origin} → ${roundTripData.destination}`
        : "Consulte o roteiro";

    const milesNum =
      parseFloat(milesUsed.replace(/\./g, "").replace(",", ".")) || 0; // milhas/pax
    const passengersNum = parseInt(passengers) || 1;
    const totalMiles = milesNum * passengersNum;

    const departureFormatted = roundTripData.departureDate
      ? format(new Date(roundTripData.departureDate), "dd/MM/yyyy", { locale: ptBR })
      : "A definir";

    return `💼 *Solicitação de Milhas*

🎯 *Rota:* ${route}
📅 *Data:* ${departureFormatted}
✈️ *Milhas necessárias:* ${formatNumber(milesNum)} /pax
📦 *Total de milhas:* ${formatNumber(totalMiles)}
👥 *Passageiros:* ${passengers}
💵 *Valor a depositar:* R$ ${calculatedValues.totalCost.toFixed(2).replace(".", ",")}

📋 *Detalhes:*
• Custo por milheiro: R$ ${costPerMile}
• Taxa de embarque/pax: R$ ${boardingFee}

Aguardo confirmação para prosseguir com a emissão! 🤝`;
  };

  // ========== COPIAR MENSAGEM ==========
  const handleCopyMessage = (message: string, type: string) => {
    navigator.clipboard.writeText(message);
    toast({
      title: "Mensagem copiada!",
      description: `Mensagem para ${type} copiada para a área de transferência`
    });
  };

  // ========== EXPORTAR COMO JPG ==========
  const handleExportAsJPG = async () => {
    const element = document.getElementById("quote-workspace");
    if (!element) {
      toast({
        title: "Erro ao exportar",
        description: "Elemento não encontrado",
        variant: "destructive"
      });
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false
      });

      const link = document.createElement("a");
      const filename = clientName
        ? `orcamento-${clientName.replace(/\s+/g, "-").toLowerCase()}.jpg`
        : "orcamento.jpg";

      link.download = filename;
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.click();

      toast({
        title: "Orçamento exportado!",
        description: "Imagem salva com sucesso"
      });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar a imagem",
        variant: "destructive"
      });
    }
  };

  // ========== SALVAR ORÇAMENTO NO SUPABASE ==========
  const handleSaveQuote = async () => {
    if (!clientName || !roundTripData.destination || !calculatedValues.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome do cliente, destino e calcule os valores",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Faça login para salvar orçamentos",
          variant: "destructive"
        });
        return;
      }

      const route =
        roundTripData.origin && roundTripData.destination
          ? `${roundTripData.origin} → ${roundTripData.destination}`
          : roundTripData.destination;

      const milesNum =
        parseFloat(milesUsed.replace(/\./g, "").replace(",", ".")) || 0; // milhas/pax
      const passengersNum = parseInt(passengers) || 1;
      const totalMiles = milesNum * passengersNum;

      const { error } = await supabase.from("quotes").insert({
        user_id: user.id,
        quote_title: quoteTitle || null,
        client_name: clientName,
        client_phone: clientPhone || null,
        route,
        departure_date: roundTripData.departureDate || null,
        // aqui você decide se quer salvar milhas/pax ou total_milhas – estou salvando total
        miles_needed: totalMiles,
        total_price: calculatedValues.price,
        passengers: passengersNum,
        trip_type: tripType,
        boarding_fee: parseFloat(boardingFee.replace(",", ".")) || 0,
        notes: notes || null,
        attachments: attachments.length > 0 ? attachments : null,
        flight_segments: [roundTripData],
        status: "pending"
      });

      if (error) throw error;

      toast({
        title: "Orçamento salvo!",
        description: "O orçamento foi salvo com sucesso no banco de dados"
      });

      // Opcional: limpar formulário ou navegar
      // navigate("/quotes");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o orçamento",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // ========== RENDER ==========
  return (
    <div id="quote-workspace" className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* ========== HEADER ========== */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Workspace de Orçamentos</h1>
          <p className="text-muted-foreground">
            Sistema integrado para criar orçamentos profissionais
          </p>
        </div>
      </div>

      {/* ========== GRID 2 COLUNAS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* ================================================== */}
        {/* COLUNA ESQUERDA - FORMULÁRIO + CALCULADORA        */}
        {/* ================================================== */}
        <div className="space-y-4">
          {/* ========== FORMULÁRIO COMPACTO ========== */}
          <Card>
            <CardHeader>
              <CardTitle>📝 Dados do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dados do Cliente */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="clientName">Nome Completo *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Telefone / WhatsApp</Label>
                    <Input
                      id="clientPhone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalhes da Viagem */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Detalhes da Viagem</h3>

                {/* Tipo de Viagem */}
                <div>
                  <Label>Tipo de Viagem</Label>
                  <RadioGroup
                    value={tripType}
                    onValueChange={(value) => setTripType(value as TripType)}
                    className="flex flex-wrap gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="round_trip" id="round_trip" />
                      <Label htmlFor="round_trip" className="cursor-pointer font-normal">
                        Ida e Volta
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one_way" id="one_way" />
                      <Label htmlFor="one_way" className="cursor-pointer font-normal">
                        Só Ida
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="multi_city" id="multi_city" />
                      <Label htmlFor="multi_city" className="cursor-pointer font-normal">
                        Múltiplos Trechos
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* RoundTripForm - Origem/Destino/Datas */}
                {tripType === "round_trip" && (
                  <RoundTripForm data={roundTripData} onChange={setRoundTripData} />
                )}

                {tripType === "one_way" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="origin">Origem *</Label>
                      <Input
                        id="origin"
                        value={roundTripData.origin}
                        onChange={(e) =>
                          setRoundTripData({ ...roundTripData, origin: e.target.value })
                        }
                        placeholder="Ex: GRU"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destination">Destino *</Label>
                      <Input
                        id="destination"
                        value={roundTripData.destination}
                        onChange={(e) =>
                          setRoundTripData({
                            ...roundTripData,
                            destination: e.target.value
                          })
                        }
                        placeholder="Ex: MIA"
                      />
                    </div>
                    <div>
                      <Label htmlFor="departureDate">Data *</Label>
                      <Input
                        id="departureDate"
                        type="date"
                        value={roundTripData.departureDate}
                        onChange={(e) =>
                          setRoundTripData({
                            ...roundTripData,
                            departureDate: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {tripType === "multi_city" && (
                  <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                    💡 Para múltiplos trechos, preencha os dados básicos e detalhe no campo
                    de notas.
                  </div>
                )}
              </div>

              <Separator />

              {/* Nome do Orçamento */}
              <div>
                <Label htmlFor="quoteTitle">Nome do Orçamento</Label>
                <Input
                  id="quoteTitle"
                  value={quoteTitle}
                  onChange={(e) => setQuoteTitle(e.target.value)}
                  placeholder="Ex: Viagem João - Miami Nov/2025"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ✨ Gerado automaticamente, mas você pode editar
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ========== CALCULADORA INTEGRADA ========== */}
          <Card>
            <CardHeader>
              <CardTitle>🧮 Calculadora de Margem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="milesUsed">Milhas/pax</Label>
                  <Input
                    id="milesUsed"
                    value={milesUsed}
                    onChange={(e) => setMilesUsed(e.target.value)}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="costPerMile">Custo/Milheiro (R$)</Label>
                  <Input
                    id="costPerMile"
                    value={costPerMile}
                    onChange={(e) => setCostPerMile(e.target.value)}
                    placeholder="29.00"
                  />
                </div>
                <div>
                  <Label htmlFor="boardingFee">Taxa Embarque/pax (R$)</Label>
                  <Input
                    id="boardingFee"
                    value={boardingFee}
                    onChange={(e) => setBoardingFee(e.target.value)}
                    placeholder="35.00"
                  />
                </div>
                <div>
                  <Label htmlFor="passengers">Nº de Passageiros</Label>
                  <Input
                    id="passengers"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label htmlFor="targetMargin">Margem Desejada (%)</Label>
                  <Input
                    id="targetMargin"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(e.target.value)}
                    placeholder="20"
                  />
                </div>
                <div>
                  <Label htmlFor="manualPrice">Preço Manual (R$)</Label>
                  <Input
                    id="manualPrice"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <Separator />

              {/* Preview dos Valores Calculados */}
              <div className="p-4 bg-primary/5 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Milhas/pax:</span>
                  <span className="font-semibold">
                    {formatNumber(calculatedValues.milesPerPassenger || 0)} /pax
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de milhas:</span>
                  <span className="font-semibold">
                    {formatNumber(calculatedValues.totalMiles || 0)}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Total (incl. taxa):</span>
                  <span className="font-semibold">
                    R$ {calculatedValues.totalCost.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço Sugerido:</span>
                  <span className="font-semibold text-primary">
                    R$ {calculatedValues.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro:</span>
                  <span className="font-semibold text-green-600">
                    R$ {calculatedValues.profit.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Margem sobre o preço:</span>
                  <Badge
                    variant={calculatedValues.profitMargin >= 20 ? "default" : "secondary"}
                  >
                    {calculatedValues.profitMargin.toFixed(1)}%
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Markup das milhas (interno):
                  </span>
                  <Badge variant="outline">
                    {calculatedValues.milesMarkup.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================================================== */}
        {/* COLUNA DIREITA - CADERNO + RESUMO + MENSAGENS     */}
        {/* ================================================== */}
        <div className="space-y-4">
          {/* ========== CADERNO DO ORÇAMENTO ========== */}
          <Card>
            <CardHeader>
              <CardTitle>📔 Caderno do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload de Prints */}
              <div>
                <Label>Prints e Anexos</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Enviando..." : "Adicionar Print"}
                </Button>

                {/* Grid de Miniaturas */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {attachments.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group cursor-pointer"
                        onClick={() => setPreviewImage(url)}
                      >
                        <img
                          src={url}
                          alt={`Anexo ${idx + 1}`}
                          className="w-full h-20 object-cover rounded border border-border hover:border-primary transition-colors"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachment(idx);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Notas */}
              <div>
                <Label htmlFor="notes">Anotações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações, prints, tabelas de comparação, detalhes da negociação..."
                  rows={6}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* ========== RESUMO FINANCEIRO ========== */}
          <Card>
            <CardHeader>
              <CardTitle>💰 Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Total:</span>
                <span className="font-semibold">
                  R$ {calculatedValues.totalCost.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço de Venda:</span>
                <span className="text-xl font-bold text-primary">
                  R$ {calculatedValues.price.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lucro:</span>
                <span className="font-semibold text-green-600">
                  R$ {calculatedValues.profit.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Margem sobre o preço:</span>
                <Badge
                  variant={calculatedValues.profitMargin >= 20 ? "default" : "secondary"}
                  className="text-sm"
                >
                  {calculatedValues.profitMargin.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* ========== MENSAGENS PRONTAS ========== */}
          <Card>
            <CardHeader>
              <CardTitle>💬 Mensagens Prontas</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeMessageTab} onValueChange={setActiveMessageTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="client">Cliente</TabsTrigger>
                  <TabsTrigger value="supplier">Fornecedor</TabsTrigger>
                </TabsList>

                <TabsContent value="client" className="space-y-2 mt-4">
                  <Textarea
                    value={generateClientMessage()}
                    readOnly
                    rows={12}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      handleCopyMessage(generateClientMessage(), "cliente")
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Mensagem do Cliente
                  </Button>
                </TabsContent>

                <TabsContent value="supplier" className="space-y-2 mt-4">
                  <Textarea
                    value={generateSupplierMessage()}
                    readOnly
                    rows={12}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      handleCopyMessage(generateSupplierMessage(), "fornecedor")
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Mensagem do Fornecedor
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* ========== AÇÕES ========== */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleExportAsJPG}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar Orçamento como JPG
            </Button>
            <Button
              className="w-full"
              size="lg"
              onClick={handleSaveQuote}
              disabled={saving || uploading}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Orçamento"}
            </Button>
          </div>
        </div>
      </div>

      {/* ========== MODAL DE PREVIEW DE IMAGEM ========== */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
