/* @ts-nocheck */
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Send, Copy, Save, Image as ImageIcon, Plane, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";


export function QuoteGenerator() {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [route, setRoute] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [miles, setMiles] = useState("");
  const [costPerThousand, setCostPerThousand] = useState("");
  const [boardingFee, setBoardingFee] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [tripType, setTripType] = useState("round_trip");
  const [companyName, setCompanyName] = useState("Minha Empresa");
  const [showPreview, setShowPreview] = useState(false);
  const quotePreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCompanyName();
  }, []);

  const loadCompanyName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("id", user.id)
      .single();

    if (profile?.company_name) {
      setCompanyName(profile.company_name);
    }
  };

  const milesNum = parseFloat(miles) || 0;
  const cost = parseFloat(costPerThousand) || 0;
  const boardingFeeNum = parseFloat(boardingFee) || 0;
  const passengersNum = parseInt(passengers) || 1;
  const costPerPassenger = (milesNum / 1000) * cost + boardingFeeNum;
  const totalPrice = costPerPassenger * passengersNum;

  const handleGenerateQuote = () => {
    if (!clientName || !miles || !costPerThousand) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome do cliente, milhas e custo para gerar o orçamento.",
        variant: "destructive",
      });
      return;
    }
    
    if (passengersNum <= 0) {
      toast({
        title: "Número de passageiros inválido",
        description: "O número de passageiros deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }
    
    setShowPreview(true);
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

    const { error } = await supabase.from("quotes").insert({
      user_id: user.id,
      client_name: clientName,
      client_phone: clientPhone || null,
      route: route || null,
      departure_date: departureDate || null,
      miles_needed: milesNum,
      cost_per_thousand: cost,
      total_price: totalPrice,
      status: "pending",
      trip_type: tripType,
      boarding_fee: boardingFeeNum,
      passengers: passengersNum,
      company_name: companyName,
    });

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o orçamento.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Orçamento salvo!",
      description: "O orçamento foi salvo no banco de dados.",
    });
  };

  const handleCopyAsImage = async () => {
    const element = quotePreviewRef.current;
    if (!element) return;

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          
          toast({
            title: "Imagem copiada!",
            description: "Cole no WhatsApp com Ctrl+V ou Cmd+V",
          });
        } catch {
          toast({
            title: "Erro ao copiar",
            description: "Seu navegador pode não suportar copiar imagens.",
            variant: "destructive",
          });
        }
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível gerar a imagem.",
        variant: "destructive",
      });
    }
  };

  const handleCopyText = () => {
    const tripTypeLabel = tripType === "round_trip" ? "Ida e Volta" : "Só Ida";
    const quoteText = `
╔════════════════════════════════════════╗
║        ${companyName.toUpperCase()}
║            ORÇAMENTO                  ║
╠════════════════════════════════════════╣
║ 👤 Cliente: ${clientName}
║ 📞 Telefone: ${clientPhone || "Não informado"}
║
║ ✈️ Rota: ${route || "A definir"}
║ 📅 Data: ${departureDate || "A definir"}
║ 🎫 Tipo: ${tripTypeLabel}
║ 👥 Passageiros: ${passengersNum}
╠════════════════════════════════════════╣
║ 💳 Milhas necessárias: ${milesNum.toLocaleString()}
║ 💰 Taxa de embarque: R$ ${boardingFeeNum.toFixed(2)}
║
║ 💵 VALOR TOTAL: R$ ${totalPrice.toFixed(2)}
╠════════════════════════════════════════╣
║ ⚠️ Valores sujeitos a alteração       ║
║    conforme disponibilidade da        ║
║    companhia aérea.                   ║
╚════════════════════════════════════════╝
    `.trim();

    navigator.clipboard.writeText(quoteText);
    toast({
      title: "Texto copiado!",
      description: "O orçamento foi copiado para a área de transferência.",
    });
  };

  const handleSendWhatsApp = () => {
    if (!clientPhone) {
      toast({
        title: "Telefone necessário",
        description: "Informe o telefone do cliente para enviar via WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    const tripTypeLabel = tripType === "round_trip" ? "Ida e Volta" : "Só Ida";
    const quoteMessage = `
*ORÇAMENTO - ${companyName.toUpperCase()}*

*👤 Cliente:* ${clientName}
*✈️ Rota:* ${route || "A definir"}
*📅 Data:* ${departureDate || "A definir"}
*🎫 Tipo:* ${tripTypeLabel}
*👥 Passageiros:* ${passengersNum}

*💳 Milhas necessárias:* ${milesNum.toLocaleString()}
*💰 Taxa de embarque:* R$ ${boardingFeeNum.toFixed(2)}

*💵 VALOR TOTAL: R$ ${totalPrice.toFixed(2)}*

_⚠️ Valores sujeitos a alteração conforme disponibilidade da companhia aérea._
    `.trim();

    const phoneNumber = clientPhone.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(quoteMessage)}`;
    window.open(whatsappUrl, "_blank");

    handleSaveQuote();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Gerador de Orçamentos</CardTitle>
          </div>
          <CardDescription>Crie orçamentos personalizados para seus clientes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                placeholder="João Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone (WhatsApp)</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rota</Label>
              <Input
                placeholder="GRU → MIA → GRU"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Partida</Label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Milhas Necessárias *</Label>
              <Input
                type="number"
                placeholder="50000"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo por Milheiro (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="29.00"
                value={costPerThousand}
                onChange={(e) => setCostPerThousand(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label><Plane className="inline mr-2 h-4 w-4" />Taxa de Embarque (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={boardingFee}
                onChange={(e) => setBoardingFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label><Users className="inline mr-2 h-4 w-4" />Número de Passageiros</Label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Tipo de Viagem</Label>
              <RadioGroup value={tripType} onValueChange={setTripType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="round_trip" id="round_trip" />
                  <Label htmlFor="round_trip" className="font-normal cursor-pointer">Ida e Volta</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one_way" id="one_way" />
                  <Label htmlFor="one_way" className="font-normal cursor-pointer">Só Ida</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <Button onClick={handleGenerateQuote} className="w-full" variant="hero">
            <FileText className="h-4 w-4 mr-2" />
            Gerar Orçamento
          </Button>
        </CardContent>
      </Card>

      {showPreview && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Preview do Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div ref={quotePreviewRef} className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border-2 border-primary/20">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-primary">{companyName.toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">Orçamento</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">👤 Cliente:</span>
                  <span>{clientName}</span>
                </div>
                {clientPhone && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">📞 Telefone:</span>
                    <span>{clientPhone}</span>
                  </div>
                )}
                {route && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">✈️ Rota:</span>
                    <span>{route}</span>
                  </div>
                )}
                {departureDate && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">📅 Data:</span>
                    <span>{new Date(departureDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">🎫 Tipo:</span>
                  <span>{tripType === "round_trip" ? "Ida e Volta" : "Só Ida"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">👥 Passageiros:</span>
                  <span>{passengersNum}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">💳 Milhas:</span>
                  <span>{milesNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">💰 Taxa embarque:</span>
                  <span>R$ {boardingFeeNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-4 text-lg font-bold text-primary">
                  <span>💵 VALOR TOTAL:</span>
                  <span>R$ {totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground text-center border-t pt-3">
                ⚠️ Valores sujeitos a alteração conforme disponibilidade da companhia aérea.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSendWhatsApp} className="flex-1">
                <Send className="mr-2 h-4 w-4" />WhatsApp
              </Button>
              <Button onClick={handleCopyAsImage} variant="outline" className="flex-1">
                <ImageIcon className="mr-2 h-4 w-4" />Copiar PNG
              </Button>
              <Button onClick={handleCopyText} variant="outline" className="flex-1">
                <Copy className="mr-2 h-4 w-4" />Copiar Texto
              </Button>
              <Button onClick={handleSaveQuote} variant="secondary" className="flex-1">
                <Save className="mr-2 h-4 w-4" />Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}