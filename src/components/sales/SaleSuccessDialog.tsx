import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SaleSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  onRegisterTicket?: () => void;
  saleData: {
    customerName: string;
    routeText: string;
    airline: string;
    milesNeeded: string;
    priceTotal: string;
    boardingFee: string;
    passengers: number;
    paymentMethod?: string;
    pnr?: string;
  };
}

export function SaleSuccessDialog({
  open,
  onClose,
  onRegisterTicket,
  saleData,
}: SaleSuccessDialogProps) {
  const { toast } = useToast();
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);

  const pricePerK = saleData.milesNeeded
    ? ((parseFloat(saleData.priceTotal) / parseFloat(saleData.milesNeeded)) * 1000).toFixed(2)
    : "0";

  const totalFees = (parseFloat(saleData.boardingFee || "0") * saleData.passengers).toFixed(2);

  const fullMessage = `✅ Sua passagem está pronta!

${saleData.pnr ? `Localizador (PNR): ${saleData.pnr}` : "⏳ Localizador será enviado em breve"}
Companhia: ${saleData.airline}
Passageiro(s): ${saleData.customerName}${saleData.passengers > 1 ? ` +${saleData.passengers - 1}` : ""}
Rota: ${saleData.routeText}

💰 Valores:
Total: R$ ${parseFloat(saleData.priceTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Milhas: ${parseInt(saleData.milesNeeded).toLocaleString("pt-BR")} (R$ ${pricePerK}/mil)
• Taxas/Embarque: R$ ${parseFloat(totalFees).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

${saleData.paymentMethod ? `Forma de pagamento: ${saleData.paymentMethod}` : ""}

Qualquer dúvida, estamos à disposição!`;

  const shortMessage = saleData.pnr
    ? `PNR ${saleData.pnr} • Total R$ ${parseFloat(saleData.priceTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : `Venda confirmada • Total R$ ${parseFloat(saleData.priceTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • PNR em breve`;

  const copyToClipboard = async (text: string, type: "full" | "short") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "full") {
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2000);
      } else {
        setCopiedShort(true);
        setTimeout(() => setCopiedShort(false), 2000);
      }
      toast({
        title: "Copiado!",
        description: "Mensagem copiada para a área de transferência.",
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Venda Registrada com Sucesso!
          </DialogTitle>
          <DialogDescription>
            Copie a mensagem abaixo para enviar ao cliente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="full" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="full">Mensagem Completa</TabsTrigger>
            <TabsTrigger value="short">Versão Curta</TabsTrigger>
          </TabsList>

          <TabsContent value="full" className="space-y-4">
            <div className="bg-muted rounded-md p-4 text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
              {fullMessage}
            </div>
            <Button
              onClick={() => copyToClipboard(fullMessage, "full")}
              className="w-full"
              variant={copiedFull ? "secondary" : "default"}
            >
              {copiedFull ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Mensagem Completa
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="short" className="space-y-4">
            <div className="bg-muted rounded-md p-4 text-sm whitespace-pre-wrap font-mono">
              {shortMessage}
            </div>
            <Button
              onClick={() => copyToClipboard(shortMessage, "short")}
              className="w-full"
              variant={copiedShort ? "secondary" : "default"}
            >
              {copiedShort ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Versão Curta
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          {onRegisterTicket && (
            <Button onClick={onRegisterTicket}>
              Registrar Passagem
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
