import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, Copy, Download } from "lucide-react";
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
  const [costPerThousand, setCostPerThousand] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const miles = parseFloat(milesNeeded) || 0;
  const cost = parseFloat(costPerThousand) || 0;
  const totalPrice = (miles / 1000) * cost;
  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + 48);

  const handleGenerateQuote = () => {
    if (!clientName || !clientPhone || !route || !departureDate || !milesNeeded || !costPerThousand) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setShowPreview(true);
    toast({
      title: "Orçamento gerado!",
      description: "Seu orçamento foi gerado com sucesso.",
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

    const { error } = await supabase.from("quotes").insert({
      user_id: user.id,
      client_name: clientName,
      client_phone: clientPhone,
      route: route,
      departure_date: departureDate,
      miles_needed: miles,
      cost_per_thousand: cost,
      total_price: totalPrice,
      valid_until: validUntil.toISOString(),
      status: 'pending'
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

  const handleCopyText = () => {
    const quoteText = `
╔══════════════════════════════════╗
║     HELLO MILHAS - ORÇAMENTO    ║
╠══════════════════════════════════╣
║ Cliente: ${clientName}
║ Telefone: ${clientPhone}
║ Rota: ${route}
║ Data: ${format(new Date(departureDate), 'dd/MM/yyyy')}
║
║ Milhas necessárias: ${miles.toLocaleString('pt-BR')}
║ Valor por milheiro: R$ ${cost.toFixed(2)}
║ Total: R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
║
║ Validade: 48 horas
║ Até: ${format(validUntil, 'dd/MM/yyyy HH:mm')}
╚══════════════════════════════════╝
    `.trim();

    navigator.clipboard.writeText(quoteText);
    toast({
      title: "Copiado!",
      description: "Orçamento copiado para a área de transferência.",
    });
  };

  const handleSendWhatsApp = () => {
    const message = `*HELLO MILHAS - ORÇAMENTO*

👤 *Cliente:* ${clientName}
✈️ *Rota:* ${route}
📅 *Data:* ${format(new Date(departureDate), 'dd/MM/yyyy')}

💳 *Milhas necessárias:* ${miles.toLocaleString('pt-BR')}
💰 *Valor por milheiro:* R$ ${cost.toFixed(2)}
💵 *Total:* R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

⏰ *Validade:* 48 horas
📌 *Válido até:* ${format(validUntil, 'dd/MM/yyyy HH:mm')}

_Para confirmar, responda esta mensagem!_`;

    const phoneNumber = clientPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    
    handleSaveQuote();
    
    toast({
      title: "WhatsApp aberto!",
      description: "A mensagem foi preparada no WhatsApp.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Gerador de Orçamentos</CardTitle>
          </div>
          <CardDescription>
            Crie orçamentos personalizados para seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome do Cliente *</Label>
              <Input
                id="client-name"
                placeholder="João Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-phone">Telefone (WhatsApp) *</Label>
              <Input
                id="client-phone"
                placeholder="(11) 99999-9999"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="route">Rota *</Label>
              <Input
                id="route"
                placeholder="GRU → MIA → GRU"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure-date">Data de Partida *</Label>
              <Input
                id="departure-date"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-per-thousand">Custo por Milheiro (R$) *</Label>
              <Input
                id="cost-per-thousand"
                type="number"
                step="0.01"
                placeholder="29.00"
                value={costPerThousand}
                onChange={(e) => setCostPerThousand(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleGenerateQuote}
            className="w-full"
            variant="hero"
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Orçamento
          </Button>
        </CardContent>
      </Card>

      {showPreview && (
        <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>📋 Preview do Orçamento</CardTitle>
              <Badge variant="secondary">Validade: 48h</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-card rounded-lg border-2 border-border font-mono text-sm">
              <div className="text-center border-b-2 border-border pb-4 mb-4">
                <h3 className="text-xl font-bold text-primary">HELLO MILHAS</h3>
                <p className="text-muted-foreground">ORÇAMENTO</p>
              </div>
              
              <div className="space-y-2">
                <p><strong>Cliente:</strong> {clientName}</p>
                <p><strong>Telefone:</strong> {clientPhone}</p>
                <p><strong>Rota:</strong> {route}</p>
                <p><strong>Data:</strong> {format(new Date(departureDate), 'dd/MM/yyyy')}</p>
                
                <div className="border-t-2 border-border my-4 pt-4">
                  <p><strong>Milhas necessárias:</strong> {miles.toLocaleString('pt-BR')}</p>
                  <p><strong>Valor por milheiro:</strong> R$ {cost.toFixed(2)}</p>
                  <p className="text-xl font-bold text-primary mt-2">
                    <strong>Total:</strong> R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="border-t-2 border-border mt-4 pt-4 text-xs text-muted-foreground">
                  <p><strong>Validade:</strong> 48 horas</p>
                  <p><strong>Válido até:</strong> {format(validUntil, 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <Button onClick={handleSendWhatsApp} variant="default" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Enviar WhatsApp
              </Button>
              
              <Button onClick={handleCopyText} variant="outline" className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copiar Texto
              </Button>
              
              <Button onClick={handleSaveQuote} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
