import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const MessagesPanel = () => {
  const { toast } = useToast();
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (!recipient || !subject || !message) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Mensagem enviada!",
      description: "Sua mensagem foi enviada com sucesso para o cliente.",
    });

    // Reset form
    setRecipient("");
    setSubject("");
    setMessage("");
  };

  const messageTemplates = [
    {
      title: "Confirmação de Compra",
      content: "Olá {nome},\n\nSua compra de {milhas} milhas foi confirmada!\n\nValor: {valor}\nData: {data}\n\nEm breve você receberá mais informações.\n\nObrigado!"
    },
    {
      title: "Passagem Emitida",
      content: "Olá {nome},\n\nSua passagem foi emitida com sucesso!\n\nCódigo de reserva: {codigo}\nRota: {rota}\nData do voo: {data}\n\nBoa viagem!"
    },
    {
      title: "Lembrete de Pagamento",
      content: "Olá {nome},\n\nEste é um lembrete sobre o pagamento pendente.\n\nValor: {valor}\nVencimento: {data}\n\nPor favor, realize o pagamento para continuarmos com o processo."
    }
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Nova Mensagem</CardTitle>
          </div>
          <CardDescription>
            Envie mensagens personalizadas para seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Destinatário</Label>
            <Input
              id="recipient"
              placeholder="email@cliente.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              placeholder="Assunto da mensagem"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem aqui..."
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleSendMessage}
            className="w-full"
            variant="hero"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar Mensagem
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Templates de Mensagem</CardTitle>
          <CardDescription>
            Use templates prontos para agilizar sua comunicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {messageTemplates.map((template, index) => (
            <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent 
                className="p-4"
                onClick={() => {
                  setSubject(template.title);
                  setMessage(template.content);
                }}
              >
                <h4 className="font-semibold mb-2">{template.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
