import { ArrowLeft, FileText, User, Plane, Calculator, DollarSign, Upload, X, Copy, Download, Save, MessageSquare } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStorage } from "@/hooks/useStorage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoundTripData {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  miles: number;
}

export default function QuoteWorkspace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploading, uploadTicketFile } = useStorage();

  // Dados do cliente
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Dados da viagem
  const [tripType, setTripType] = useState<"one_way" | "round_trip" | "multi_city">("round_trip");
  const [roundTripData, setRoundTripData] = useState<RoundTripData>({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    miles: 0
  });

  // Valores da calculadora
  const [milesUsed, setMilesUsed] = useState("50000");
  const [costPerMile, setCostPerMile] = useState("29.00");
  const [boardingFee, setBoardingFee] = useState("35.00");
  const [passengers, setPassengers] = useState("2");
  const [targetMargin, setTargetMargin] = useState("20");

  // Caderno
  const [quoteTitle, setQuoteTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Estado de salvamento
  const [saving, setSaving] = useState(false);

  // Auto-gerar nome do orçamento
  useEffect(() => {
    if (clientName && roundTripData.destination && roundTripData.departureDate && !quoteTitle) {
      try {
        const date = new Date(roundTripData.departureDate);
        const monthYear = format(date, 'MMM/yyyy', { locale: ptBR });
        const autoTitle = `Viagem ${clientName} - ${roundTripData.destination} ${monthYear}`;
        setQuoteTitle(autoTitle);
      } catch (e) {
        // Ignora erro de data inválida
      }
    }
  }, [clientName, roundTripData.destination, roundTripData.departureDate, quoteTitle]);

  // Calcular valores automaticamente
  const calculatedValues = useMemo(() => {
    const milesNum = parseFloat(milesUsed.replace(/\./g, '').replace(/,/g, '.')) || 0;
    const costPerMileNum = parseFloat(costPerMile.replace(/,/g, '.')) || 0;
    const boardingFeeNum = parseFloat(boardingFee.replace(/,/g, '.')) || 0;
    const passengersNum = parseInt(passengers) || 1;
    const marginNum = parseFloat(targetMargin.replace(/,/g, '.')) || 0;

    const costPerPassenger = (milesNum / 1000) * costPerMileNum + boardingFeeNum;
    const totalCost = costPerPassenger * passengersNum;
    const suggestedPrice = marginNum > 0 && marginNum < 100 
      ? totalCost / (1 - marginNum / 100) 
      : totalCost;
    const profit = suggestedPrice - totalCost;
    const profitMargin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;

    return { totalCost, price: suggestedPrice, profit, profitMargin };
  }, [milesUsed, costPerMile, boardingFee, passengers, targetMargin]);

  // Upload de imagens
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado",
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
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Geração de mensagens
  const generateClientMessage = () => {
    const route = `${roundTripData.origin} → ${roundTripData.destination}`;
    try {
      return `🎫 *Orçamento de Passagem Aérea*

Olá *${clientName}*! 👋

Segue o orçamento solicitado:

📍 *Rota:* ${route}
📅 *Data Ida:* ${roundTripData.departureDate ? format(new Date(roundTripData.departureDate), 'dd/MM/yyyy') : 'A definir'}
${tripType === 'round_trip' && roundTripData.returnDate ? `🔄 *Data Volta:* ${format(new Date(roundTripData.returnDate), 'dd/MM/yyyy')}` : ''}
👥 *Passageiros:* ${passengers}

💰 *Valor Total:* R$ ${calculatedValues.price.toFixed(2)}

✅ Milhas já incluídas
✅ Taxas de embarque incluídas

Para confirmar, basta enviar uma mensagem! 😊`;
    } catch (e) {
      return "Preencha os dados do orçamento para gerar a mensagem.";
    }
  };

  const generateSupplierMessage = () => {
    const route = `${roundTripData.origin} → ${roundTripData.destination}`;
    const milesNum = parseFloat(milesUsed.replace(/\./g, '').replace(/,/g, '.')) || 0;
    
    try {
      return `💼 *Solicitação de Milhas*

🎯 *Rota:* ${route}
📅 *Data:* ${roundTripData.departureDate ? format(new Date(roundTripData.departureDate), 'dd/MM/yyyy') : 'A definir'}
✈️ *Milhas necessárias:* ${milesNum.toLocaleString('pt-BR')}
👥 *Passageiros:* ${passengers}
💵 *Valor a depositar:* R$ ${calculatedValues.totalCost.toFixed(2)}

Aguardo confirmação!`;
    } catch (e) {
      return "Preencha os dados do orçamento para gerar a mensagem.";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ 
      title: "Copiado!", 
      description: "Mensagem copiada para a área de transferência" 
    });
  };

  // Exportar como JPG
  const handleExportAsJPG = async () => {
    const element = document.getElementById('quote-workspace');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `orcamento-${clientName.replace(/\s+/g, '-').toLowerCase() || 'sem-nome'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();

      toast({ 
        title: "Exportado!", 
        description: "Orçamento salvo como imagem" 
      });
    } catch (error) {
      toast({ 
        title: "Erro ao exportar", 
        description: "Não foi possível gerar a imagem", 
        variant: "destructive" 
      });
    }
  };

  // Salvar no Supabase
  const handleSaveQuote = async () => {
    if (!clientName || !roundTripData.destination || !calculatedValues.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pelo menos nome do cliente, destino e calcule os valores",
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const route = `${roundTripData.origin} → ${roundTripData.destination}`;

      const { error } = await supabase.from("quotes").insert({
        user_id: user.id,
        quote_title: quoteTitle || `Orçamento ${clientName}`,
        client_name: clientName,
        client_phone: clientPhone || null,
        route,
        departure_date: roundTripData.departureDate || null,
        miles_needed: parseInt(milesUsed.replace(/\./g, '').replace(/,/g, '.')) || 0,
        total_price: calculatedValues.price,
        passengers: parseInt(passengers) || 1,
        trip_type: tripType,
        boarding_fee: parseFloat(boardingFee.replace(/,/g, '.')) || 0,
        notes: notes || null,
        attachments: attachments,
        flight_segments: [roundTripData],
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "Orçamento salvo!",
        description: "O orçamento foi salvo no banco de dados",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="quote-workspace" className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
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

      {/* Grid 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        
        {/* ========== COLUNA ESQUERDA ========== */}
        <div className="space-y-4">
          
          {/* Formulário Compacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Dados do Cliente */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nome do Cliente *</Label>
                    <Input 
                      id="clientName"
                      placeholder="Nome completo"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Telefone/WhatsApp</Label>
                    <Input 
                      id="clientPhone"
                      placeholder="(11) 99999-9999"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalhes da Viagem */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Viagem
                </h3>
                
                {/* Tipo de Viagem */}
                <div className="space-y-2">
                  <Label>Tipo de Viagem</Label>
                  <RadioGroup value={tripType} onValueChange={(v) => setTripType(v as any)}>
                    <div className="flex flex-wrap gap-4">
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

                {/* Formulário Inline de Viagem */}
                <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Origem *</Label>
                      <Input
                        placeholder="GRU - São Paulo"
                        value={roundTripData.origin}
                        onChange={(e) => setRoundTripData({...roundTripData, origin: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Destino *</Label>
                      <Input
                        placeholder="MIA - Miami"
                        value={roundTripData.destination}
                        onChange={(e) => setRoundTripData({...roundTripData, destination: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Ida *</Label>
                      <Input
                        type="date"
                        value={roundTripData.departureDate}
                        onChange={(e) => setRoundTripData({...roundTripData, departureDate: e.target.value})}
                      />
                    </div>
                    {tripType === "round_trip" && (
                      <div className="space-y-2">
                        <Label>Data de Volta *</Label>
                        <Input
                          type="date"
                          value={roundTripData.returnDate}
                          onChange={(e) => setRoundTripData({...roundTripData, returnDate: e.target.value})}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Milhas por Passageiro *</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 50000"
                        value={roundTripData.miles || ""}
                        onChange={(e) => setRoundTripData({...roundTripData, miles: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Nome do Orçamento */}
              <div className="space-y-2">
                <Label htmlFor="quoteTitle">Nome do Orçamento</Label>
                <Input 
                  id="quoteTitle"
                  placeholder="Ex: Viagem João - Miami Nov/2025"
                  value={quoteTitle}
                  onChange={(e) => setQuoteTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  ✨ Gerado automaticamente, mas você pode editar
                </p>
              </div>
              
            </CardContent>
          </Card>

          {/* Calculadora Integrada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Margem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Campos da Calculadora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="milesUsed">Milhas Usadas *</Label>
                  <Input 
                    id="milesUsed"
                    type="text"
                    placeholder="50000"
                    value={milesUsed}
                    onChange={(e) => setMilesUsed(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPerMile">Custo/Milheiro (R$) *</Label>
                  <Input 
                    id="costPerMile"
                    type="text"
                    placeholder="29.00"
                    value={costPerMile}
                    onChange={(e) => setCostPerMile(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boardingFee">Taxa Embarque (R$) *</Label>
                  <Input 
                    id="boardingFee"
                    type="text"
                    placeholder="35.00"
                    value={boardingFee}
                    onChange={(e) => setBoardingFee(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passengers">Passageiros *</Label>
                  <Input 
                    id="passengers"
                    type="number"
                    min="1"
                    placeholder="2"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  />
                </div>
              </div>

              {/* Margem Desejada */}
              <div className="space-y-2">
                <Label htmlFor="targetMargin">Margem de Lucro Desejada (%) *</Label>
                <Input 
                  id="targetMargin"
                  type="text"
                  placeholder="20"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  💡 Quanto você deseja lucrar em cima do custo
                </p>
              </div>

              {/* Valores Calculados */}
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg space-y-2 border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Custo Total:</span>
                  <span className="font-semibold text-lg">
                    R$ {calculatedValues.totalCost.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Preço Sugerido:</span>
                  <span className="font-bold text-xl text-primary">
                    R$ {calculatedValues.price.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Lucro:</span>
                  <span className="font-semibold text-lg text-green-600">
                    R$ {calculatedValues.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Margem Real:</span>
                  <Badge variant={calculatedValues.profitMargin >= 20 ? "default" : "secondary"}>
                    {calculatedValues.profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              
            </CardContent>
          </Card>

        </div>

        {/* ========== COLUNA DIREITA ========== */}
        <div className="space-y-4">
          
          {/* Caderno do Orçamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Caderno do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Upload de Prints */}
              <div>
                <Label>Prints e Anexos</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="w-full"
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Enviando..." : "Adicionar Print"}
                  </Button>
                </div>
                
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
                          className="w-full h-20 object-cover rounded border hover:border-primary transition-colors"
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
              <div className="space-y-2">
                <Label htmlFor="notes">Anotações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre o orçamento, condições especiais, informações adicionais..."
                  rows={6}
                  className="resize-none"
                />
              </div>
              
            </CardContent>
          </Card>

          {/* Resumo Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Custo Total:</span>
                  <span className="text-lg font-semibold">
                    R$ {calculatedValues.totalCost.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Preço de Venda:</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {calculatedValues.price.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Lucro:</span>
                  <span className="text-lg font-semibold text-green-600">
                    R$ {calculatedValues.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Margem:</span>
                  <Badge 
                    variant={calculatedValues.profitMargin >= 20 ? "default" : "secondary"}
                    className="text-sm"
                  >
                    {calculatedValues.profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mensagens Prontas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Mensagens Prontas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="client" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="client">Cliente</TabsTrigger>
                  <TabsTrigger value="supplier">Fornecedor</TabsTrigger>
                </TabsList>
                
                <TabsContent value="client" className="space-y-2">
                  <Textarea 
                    value={generateClientMessage()} 
                    readOnly 
                    rows={10}
                    className="text-sm font-mono"
                  />
                  <Button 
                    onClick={() => copyToClipboard(generateClientMessage())}
                    className="w-full"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Mensagem do Cliente
                  </Button>
                </TabsContent>
                
                <TabsContent value="supplier" className="space-y-2">
                  <Textarea 
                    value={generateSupplierMessage()} 
                    readOnly 
                    rows={10}
                    className="text-sm font-mono"
                  />
                  <Button 
                    onClick={() => copyToClipboard(generateSupplierMessage())}
                    className="w-full"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Mensagem do Fornecedor
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleExportAsJPG}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Orçamento como JPG
            </Button>
            <Button 
              className="w-full"
              size="lg"
              onClick={handleSaveQuote}
              disabled={saving || uploading}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Orçamento"}
            </Button>
          </div>

        </div>
      </div>

      {/* Modal de Preview de Imagem */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          {previewImage && (
            <div className="relative">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-auto rounded-lg" 
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
