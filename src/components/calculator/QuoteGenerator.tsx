import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Send, Copy, Download, User, Phone, MapPin, Calendar, Plane, DollarSign } from "lucide-react";
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
*ORÇAMENTO DE MILHAS*

👤 *Cliente:* ${clientName}
📞 *Contato:* ${clientPhone}

✈️ *Rota:* ${route}
📅 *Data da Viagem:* ${format(new Date(departureDate), 'dd/MM/yyyy')}

💳 *Milhas Necessárias:* ${miles.toLocaleString('pt-BR')}
💰 *Valor por Milheiro:* R$ ${cost.toFixed(2)}

*💵 VALOR TOTAL: R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*

⏰ *Validade:* ${format(validUntil, "dd/MM/yyyy 'às' HH:mm")}

_Valores sujeitos a alterações conforme disponibilidade._
    `.trim();

    navigator.clipboard.writeText(quoteText);
    toast({
      title: "Copiado!",
      description: "Orçamento copiado para a área de transferência.",
    });
  };

  const handleSendWhatsApp = () => {
    const message = `*ORÇAMENTO DE MILHAS*

👤 *Cliente:* ${clientName}
📞 *Contato:* ${clientPhone}

✈️ *Rota:* ${route}
📅 *Data da Viagem:* ${format(new Date(departureDate), 'dd/MM/yyyy')}

💳 *Milhas Necessárias:* ${miles.toLocaleString('pt-BR')}
💰 *Valor por Milheiro:* R$ ${cost.toFixed(2)}

*💵 VALOR TOTAL: R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*

⏰ *Validade:* ${format(validUntil, "dd/MM/yyyy 'às' HH:mm")}

_Valores sujeitos a alterações conforme disponibilidade._`;

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
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Gerador de Orçamentos</CardTitle>
              <CardDescription className="text-base">
                Crie orçamentos personalizados e profissionais
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="client-name" className="text-base font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Nome do Cliente *
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
              <Label htmlFor="client-phone" className="text-base font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
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

            <div className="space-y-2">
              <Label htmlFor="route" className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Rota *
              </Label>
              <Input
                id="route"
                placeholder="GRU → MIA → GRU"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure-date" className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Data de Partida *
              </Label>
              <Input
                id="departure-date"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="miles-needed" className="text-base font-medium flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                Milhas Necessárias *
              </Label>
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
              <Label htmlFor="cost-per-thousand" className="text-base font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Custo por Milheiro (R$) *
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
            </div>
          </div>

          <Button 
            onClick={handleGenerateQuote}
            className="w-full mt-6 h-12 text-lg"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            Gerar Orçamento Profissional
          </Button>
        </CardContent>
      </Card>

      {showPreview && (
        <Card className="shadow-xl border-2 border-primary/30">
          <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Orçamento Gerado</CardTitle>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Válido até {format(validUntil, "dd/MM/yyyy")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="bg-gradient-to-br from-card to-muted/30 p-8 rounded-xl border-2 border-border space-y-6">
              {/* Header do Orçamento */}
              <div className="text-center pb-6 border-b-2 border-border">
                <h2 className="text-3xl font-bold text-primary mb-2">ORÇAMENTO DE MILHAS</h2>
                <p className="text-muted-foreground">Proposta Comercial</p>
              </div>

              {/* Informações do Cliente */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Dados do Cliente
                </h3>
                <div className="grid md:grid-cols-2 gap-4 pl-7">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium text-foreground">{clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium text-foreground">{clientPhone}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalhes da Viagem */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  Detalhes da Viagem
                </h3>
                <div className="grid md:grid-cols-2 gap-4 pl-7">
                  <div>
                    <p className="text-sm text-muted-foreground">Rota</p>
                    <p className="font-medium text-foreground">{route}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Partida</p>
                    <p className="font-medium text-foreground">{format(new Date(departureDate), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Valores */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Valores
                </h3>
                <div className="space-y-3 pl-7">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Milhas Necessárias</span>
                    <span className="font-medium">{miles.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valor por Milheiro</span>
                    <span className="font-medium">R$ {cost.toFixed(2)}</span>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center bg-primary/10 p-4 rounded-lg">
                    <span className="text-lg font-semibold text-foreground">VALOR TOTAL</span>
                    <span className="text-2xl font-bold text-primary">
                      R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ Valores sujeitos a alterações conforme disponibilidade e regras da companhia aérea.
                  <br />
                  Orçamento válido até {format(validUntil, "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="grid md:grid-cols-3 gap-4 mt-6">
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
